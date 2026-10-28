const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const {
  questionIndexFromOrderedResult,
  evaluateActivityResultCorrect,
  isTextInputResultValidateLater,
  countValidateLaterTextInputResults
} = require('./lib/activity-results-validation');
const { buildActivityReportMarkdown } = require('./lib/build-activity-report');
const { buildScoreJson } = require('./lib/build-score-json');
const { renderMarkdown } = require('./lib/render-markdown');
const {
  extractQuestionTypeFromMarkdown,
  buildActivityFromMarkdown,
  parseAnswersFromMarkdown,
  detectAnswersPresent,
} = require('./lib/parse-question');
const { splitCombinedMarkdown, mergeQuestionAndAnswerKey } = require('./lib/split-answer-key');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const EXAMPLES_DIR = path.join(DATA_DIR, 'examples');
const QUESTION_MD_PATH = path.join(DATA_DIR, 'question.md');

/** When set, requests under /sim/ (and configured root paths) reverse-proxy to the simulation backend. */
const SIM_ORIGIN = process.env.SIM_ORIGIN || null;
const SIM_MOUNT_PATH = '/sim';
/** Root-absolute paths some simulations request when embedded (e.g. bundled /assets/*). Override via SIM_ROOT_PROXY_PATHS. */
const SIM_ROOT_PROXY_PATHS = (process.env.SIM_ROOT_PROXY_PATHS || '/assets/,/configs/,/api/logs')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

function resolveCliPath(arg) {
  return path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
}

const CLI_FLAGS = ['--edit', '--copy-markdown', '--examples', '--answer-key'];

function takePathOperand(flag, args, i) {
  const operand = args[i + 1];
  if (operand === undefined || CLI_FLAGS.includes(operand)) {
    console.error(`${flag} requires a file path`);
    process.exit(1);
  }
  return resolveCliPath(operand);
}

// Parse command line arguments for --edit, --answer-key, --copy-markdown, and --examples
let EDIT_MODE = false;
let EXAMPLES_MODE = false;
let EDIT_FILE_PATH = null;
let ANSWER_KEY_FILE_PATH = null;
let COPY_MARKDOWN_ENABLED = false;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--copy-markdown') {
    COPY_MARKDOWN_ENABLED = true;
    continue;
  }
  if (args[i] === '--examples') {
    EXAMPLES_MODE = true;
    continue;
  }
  if (args[i] === '--edit') {
    EDIT_MODE = true;
    EDIT_FILE_PATH = takePathOperand('--edit', args, i);
    i++;
    continue;
  }
  if (args[i] === '--answer-key') {
    ANSWER_KEY_FILE_PATH = takePathOperand('--answer-key', args, i);
    i++;
    continue;
  }
}
if (ANSWER_KEY_FILE_PATH && !EDIT_MODE) {
  console.warn('--answer-key is ignored unless --edit is also set');
  ANSWER_KEY_FILE_PATH = null;
}
if (EDIT_MODE && ANSWER_KEY_FILE_PATH && EDIT_FILE_PATH === ANSWER_KEY_FILE_PATH) {
  console.error('--edit and --answer-key must resolve to different files');
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function isPathInside(child, parent) {
  const relative = path.relative(parent, child);
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/** Basename only; safe characters for data/examples/*.md */
function isValidExampleBasename(name) {
  if (typeof name !== 'string' || !name.trim()) return false;
  const t = name.trim();
  if (t !== path.basename(t)) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.md$/i.test(t);
}

function sendFile(res, filePath, status = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(status, {
    'Content-Type': contentType,
    // Disable aggressive caching during development
    'Cache-Control': 'no-store'
  });
  const read = fs.createReadStream(filePath);
  read.on('error', () => {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  });
  read.pipe(res);
}

function respondJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function writeUtf8File(filePath, contents, cb) {
  const dir = path.dirname(filePath);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    cb(err);
    return;
  }
  fs.writeFile(filePath, contents, 'utf8', cb);
}

function simUpstreamPath(pathname) {
  if (pathname === SIM_MOUNT_PATH) return '/';
  const prefix = `${SIM_MOUNT_PATH}/`;
  if (pathname.startsWith(prefix)) {
    const subpath = pathname.slice(SIM_MOUNT_PATH.length) || '/';
    // Collapse leading slashes so subpath cannot resolve as a scheme-relative URL via new URL().
    return `/${subpath.replace(/^\/+/, '')}`;
  }
  return pathname;
}

function shouldProxyToSim(pathname) {
  // Always intercept /sim/* so it never falls through to the activity page.
  if (pathname === SIM_MOUNT_PATH || pathname.startsWith(`${SIM_MOUNT_PATH}/`)) return true;
  if (!SIM_ORIGIN) return false;
  for (const entry of SIM_ROOT_PROXY_PATHS) {
    if (entry.endsWith('/')) {
      if (pathname.startsWith(entry)) return true;
    } else if (pathname === entry || pathname.startsWith(`${entry}/`)) {
      return true;
    }
  }
  return false;
}

function simErrorHtml(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Simulation not found</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8fafc;
      color: #64748b;
    }
    .icon { font-size: 2.5rem; }
    h1 { margin: 0; font-size: 1.1rem; font-weight: 600; color: #0f172a; }
    p { margin: 0; font-size: 0.875rem; }
    code {
      font-size: 0.8rem;
      background: #e2e8f0;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="icon">⚠️</div>
  <h1>Simulation not reachable</h1>
  <p>${message}</p>
</body>
</html>`;
}

function proxyToSim(req, res, pathname, search) {
  if (!SIM_ORIGIN) {
    res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(simErrorHtml('No simulation configured — <code>SIM_ORIGIN</code> is not set.'));
    return;
  }
  const subpath = simUpstreamPath(pathname);
  const target = new URL(subpath, SIM_ORIGIN);
  const isHttps = target.protocol === 'https:';
  const transport = isHttps ? https : http;
  const options = {
    hostname: target.hostname,
    port: target.port || (isHttps ? 443 : 80),
    path: target.pathname + (search || ''),
    method: req.method,
    headers: { ...req.headers, host: target.host }
  };
  const proxyReq = transport.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(simErrorHtml(`Nothing is running at <code>${SIM_ORIGIN}</code>`));
  });
  if (req.method === 'GET' || req.method === 'HEAD') {
    proxyReq.end();
  } else {
    req.pipe(proxyReq);
  }
}

// Store active WebSocket connections
const clients = new Set();

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(urlObj.pathname || '/');

  if (shouldProxyToSim(pathname)) {
    proxyToSim(req, res, pathname, urlObj.search);
    return;
  }

  // Examples mode: shell at /, activity app in iframe at /play
  if (EXAMPLES_MODE && pathname === '/') {
    sendFile(res, path.join(PUBLIC_DIR, 'examples-mode.html'), 200);
    return;
  }
  if (EXAMPLES_MODE && pathname === '/play') {
    sendFile(res, path.join(PUBLIC_DIR, 'index.html'), 200);
    return;
  }

  // In edit mode, serve editor.html for root path
  if (EDIT_MODE && pathname === '/') {
    pathname = '/editor.html';
  }

  // API: /api/editor/load - Load markdown file for editing
  if (pathname === '/api/editor/load' && req.method === 'GET') {
    if (!EDIT_MODE || !EDIT_FILE_PATH) {
      respondJson(res, 400, { error: 'Editor mode not enabled' });
      return;
    }
    fs.readFile(EDIT_FILE_PATH, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          if (ANSWER_KEY_FILE_PATH && fs.existsSync(ANSWER_KEY_FILE_PATH)) {
            respondJson(res, 409, { error: 'Question file is missing while answer key exists' });
            return;
          }
          // File doesn't exist; client prompts for question type
          respondJson(res, 200, {
            markdown: '',
            filePath: EDIT_FILE_PATH,
            questionType: null,
            copyMarkdownEnabled: COPY_MARKDOWN_ENABLED
          });
        } else {
          respondJson(res, 500, { error: 'Failed to read file' });
        }
        return;
      }
      let markdown = data;
      if (ANSWER_KEY_FILE_PATH && fs.existsSync(ANSWER_KEY_FILE_PATH)) {
        try {
          const answerKeyMd = fs.readFileSync(ANSWER_KEY_FILE_PATH, 'utf8');
          markdown = mergeQuestionAndAnswerKey(data, answerKeyMd);
        } catch (e) {
          respondJson(res, 500, { error: 'Failed to load answer key' });
          return;
        }
      }
      respondJson(res, 200, {
        markdown,
        filePath: EDIT_FILE_PATH,
        questionType: extractQuestionTypeFromMarkdown(markdown),
        copyMarkdownEnabled: COPY_MARKDOWN_ENABLED
      });
    });
    return;
  }

  // API: /api/editor/save - Save markdown file
  if (pathname === '/api/editor/save' && req.method === 'POST') {
    if (!EDIT_MODE || !EDIT_FILE_PATH) {
      respondJson(res, 400, { error: 'Editor mode not enabled' });
      return;
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (typeof data.markdown !== 'string') {
          respondJson(res, 400, { error: 'markdown must be a string' });
          return;
        }
        const markdown = data.markdown || '';
        let questionMarkdown = markdown;
        let answerKeyMarkdown = null;
        if (ANSWER_KEY_FILE_PATH) {
          const split = splitCombinedMarkdown(markdown);
          questionMarkdown = split.questionMarkdown;
          answerKeyMarkdown = split.answerKeyMarkdown;
        }

        if (!ANSWER_KEY_FILE_PATH) {
          writeUtf8File(EDIT_FILE_PATH, questionMarkdown, (err) => {
            if (err) {
              respondJson(res, 500, { error: 'Failed to save file' });
              return;
            }
            respondJson(res, 200, { success: true, filePath: EDIT_FILE_PATH });
          });
          return;
        }
        writeUtf8File(ANSWER_KEY_FILE_PATH, answerKeyMarkdown || '', (keyErr) => {
          if (keyErr) {
            respondJson(res, 500, { error: 'Failed to save answer key' });
            return;
          }
          writeUtf8File(EDIT_FILE_PATH, questionMarkdown, (err) => {
            if (err) {
              respondJson(res, 500, { error: 'Failed to save file' });
              return;
            }
            respondJson(res, 200, {
              success: true,
              filePath: EDIT_FILE_PATH,
              answerKeyPath: ANSWER_KEY_FILE_PATH
            });
          });
        });
      } catch (e) {
        respondJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  // API: /api/examples/list — names of data/examples/*.md (only with --examples)
  if (EXAMPLES_MODE && pathname === '/api/examples/list' && req.method === 'GET') {
    fs.readdir(EXAMPLES_DIR, { withFileTypes: true }, (err, entries) => {
      if (err) {
        if (err.code === 'ENOENT') {
          respondJson(res, 200, { examples: [] });
          return;
        }
        respondJson(res, 500, { error: 'Failed to read examples directory' });
        return;
      }
      const names = entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md') && !e.name.toLowerCase().endsWith('-answer-key.md'))
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b));
      respondJson(res, 200, { examples: names });
    });
    return;
  }

  // API: /api/examples/select — copy one example to data/question.md (only with --examples)
  if (EXAMPLES_MODE && pathname === '/api/examples/select' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      let payload;
      try {
        payload = JSON.parse(body || '{}');
      } catch (e) {
        respondJson(res, 400, { error: 'Invalid JSON' });
        return;
      }
      const filename = payload.filename;
      if (!isValidExampleBasename(filename)) {
        respondJson(res, 400, { error: 'Invalid example filename' });
        return;
      }
      const srcPath = path.join(EXAMPLES_DIR, filename);
      if (!isPathInside(srcPath, EXAMPLES_DIR)) {
        respondJson(res, 400, { error: 'Invalid example path' });
        return;
      }
      fs.readFile(srcPath, 'utf8', (readErr, content) => {
        if (readErr) {
          if (readErr.code === 'ENOENT') {
            respondJson(res, 404, { error: 'Example file not found' });
          } else {
            respondJson(res, 500, { error: 'Failed to read example' });
          }
          return;
        }
        fs.writeFile(QUESTION_MD_PATH, content, 'utf8', (writeErr) => {
          if (writeErr) {
            respondJson(res, 500, { error: 'Failed to write question.md' });
            return;
          }
          const staleFiles = [
            path.join(DATA_DIR, 'answer.md'),
            path.join(DATA_DIR, 'report.md'),
            path.join(DATA_DIR, 'score.json'),
          ];
          Promise.all(staleFiles.map((filePath) => new Promise((resolve, reject) => {
            fs.unlink(filePath, (err) => {
              if (err && err.code !== 'ENOENT') {
                reject(err);
                return;
              }
              resolve();
            });
          }))).then(() => {
            respondJson(res, 200, { success: true, filename });
          }).catch(() => {
            respondJson(res, 500, { error: 'Failed to clear previous example results' });
          });
        });
      });
    });
    return;
  }

  // API: /api/examples/grade — run generate-score.js for the current assessment example
  if (EXAMPLES_MODE && pathname === '/api/examples/grade' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      let payload;
      try {
        payload = JSON.parse(body || '{}');
      } catch (e) {
        respondJson(res, 400, { error: 'Invalid JSON' });
        return;
      }
      const { filename } = payload;
      if (!filename || typeof filename !== 'string') {
        respondJson(res, 400, { error: 'Missing filename' });
        return;
      }
      // Derive the answer-key filename from the example filename
      const answerKeyFilename = filename.replace(/\.md$/i, '-answer-key.md');
      const answerKeyPath = path.join(EXAMPLES_DIR, answerKeyFilename);
      if (!isPathInside(answerKeyPath, EXAMPLES_DIR)) {
        respondJson(res, 400, { error: 'Invalid path' });
        return;
      }
      if (!fs.existsSync(answerKeyPath)) {
        respondJson(res, 404, { error: `Answer key not found: ${answerKeyFilename}` });
        return;
      }
      const questionPath = QUESTION_MD_PATH;
      const answerPath = path.join(DATA_DIR, 'answer.md');
      if (!fs.existsSync(answerPath)) {
        respondJson(res, 400, { error: 'No answer.md found — submit answers in the activity first' });
        return;
      }
      const scriptPath = path.join(__dirname, 'generate-score.js');
      const reportPath = path.join(DATA_DIR, 'report.md');
      const scorePath = path.join(DATA_DIR, 'score.json');
      const { execFile } = require('child_process');
      execFile(process.execPath, [
        scriptPath,
        '--question', questionPath,
        '--answer', answerPath,
        '--answer-key', answerKeyPath,
        '--report', reportPath,
        '--score', scorePath,
      ], { timeout: 15000 }, (err, stdout, stderr) => {
        if (err) {
          respondJson(res, 500, { error: 'Grading failed: ' + (stderr || err.message) });
          return;
        }
        try {
          const report = fs.readFileSync(reportPath, 'utf8');
          const score = JSON.parse(fs.readFileSync(scorePath, 'utf8'));
          respondJson(res, 200, { report, score, stdout: stdout.trim() });
        } catch (readErr) {
          respondJson(res, 500, {
            error: 'Grading failed: report or score output is missing or invalid'
          });
        }
      });
    });
    return;
  }

  // API: /api/examples/results — read existing score.json and report.md (classic mode)
  if (EXAMPLES_MODE && pathname === '/api/examples/results' && req.method === 'GET') {
    const reportPath = path.join(DATA_DIR, 'report.md');
    const scorePath = path.join(DATA_DIR, 'score.json');
    const report = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : '';
    const scoreRaw = fs.existsSync(scorePath) ? fs.readFileSync(scorePath, 'utf8') : '';
    if (!report && !scoreRaw) {
      respondJson(res, 404, { error: 'No results found — submit answers in the activity first' });
      return;
    }
    let score = null;
    try { score = JSON.parse(scoreRaw); } catch (e) { /* ignore parse errors */ }
    respondJson(res, 200, { report, score });
    return;
  }

  // API: /api/activity
  if (pathname === '/api/activity') {
    const activityFile = path.join(DATA_DIR, 'question.md');
    fs.readFile(activityFile, 'utf8', (err, data) => {
      if (err) {
        respondJson(res, 404, { error: 'Activity file not found' });
        return;
      }
      try {
        const activity = buildActivityFromMarkdown(data);
        if (!detectAnswersPresent(activity)) {
          activity.assessmentMode = true;
        }
        respondJson(res, 200, activity);
      } catch (e) {
        respondJson(res, 500, { error: 'Failed to parse markdown' });
      }
    });
    return;
  }

  // API: /api/answers
  if (pathname === '/api/answers') {
    const answerFile = path.join(DATA_DIR, 'answer.md');
    const activityFile = path.join(DATA_DIR, 'question.md');

    // Read both answer.md and question.md to map result indices to question IDs
    fs.readFile(answerFile, 'utf8', (err, answerData) => {
      if (err) {
        // If file doesn't exist, return empty answers
        respondJson(res, 200, { answers: null, type: null, explanations: null });
        return;
      }

      // Also read activity to map indices to question IDs
      fs.readFile(activityFile, 'utf8', (err, activityData) => {
        if (err) {
          // If activity file doesn't exist, just return parsed answers without mapping
          try {
            const parsed = parseAnswersFromMarkdown(answerData);
            const { answers, type, explanations } = parsed;
            respondJson(res, 200, { answers, type, explanations: explanations || null });
          } catch (e) {
            respondJson(res, 500, { error: 'Failed to parse answers' });
          }
          return;
        }

        try {
          const parsed = parseAnswersFromMarkdown(answerData);
          let { answers, type, explanations } = parsed;

          // For MCQ, map result indices to question IDs
          if (/^multiple choice$/i.test(type) && explanations) {
            const activity = buildActivityFromMarkdown(activityData);
            if (activity && activity.mcq && activity.mcq.questions) {
              // Map explanations from result index to question ID
              // Result indices (0, 1, 2, 3...) should match question IDs (0, 1, 2, 3...)
              // since questions are created sequentially
              const mappedExplanations = {};
              Object.keys(explanations).forEach(resultIndex => {
                const idx = parseInt(resultIndex, 10);
                if (idx >= 0 && idx < activity.mcq.questions.length) {
                  const questionId = activity.mcq.questions[idx].id;
                  mappedExplanations[questionId] = explanations[resultIndex];
                }
              });
              explanations = mappedExplanations;
            }
          }

          respondJson(res, 200, { answers, type, explanations: explanations || null });
        } catch (e) {
          respondJson(res, 500, { error: 'Failed to parse answers' });
        }
      });
    });
    return;
  }

  // API: /validate
  if (pathname === '/validate' && req.method === 'POST') {
    // Send message to all connected WebSocket clients
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'validate' }));
      }
    });

    respondJson(res, 200, {
      status: 'success',
      message: 'Validation message sent to all connected clients',
      clientCount: clients.size
    });
    return;
  }

  // API: /api/content/markdown - Render markdown content for iframe
  if (pathname === '/api/content/markdown' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const markdown = data.markdown || '';
        const html = renderMarkdown(markdown);

        // Return HTML wrapped in a proper document with styles
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Content</title>
  <link rel="stylesheet" href="/design-system/colors/colors.css" />
  <link rel="stylesheet" href="/design-system/typography/typography.css" />
  <link rel="stylesheet" href="/design-system/spacing/spacing.css" />
  <link rel="stylesheet" href="/design-system/components/table/table.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
  <style>
    body {
      margin: 0;
      padding: 1.5rem;
      background-color: var(--Colors-Backgrounds-Main-Top);
      color: var(--Colors-Text-Body-Default);
      font-family: var(--body-family);
    }
    .markdown-content {
      max-width: 100%;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: var(--Colors-Backgrounds-Main-Top);
        color: var(--Colors-Text-Body-Default);
      }
    }
  </style>
</head>
<body>
  <div class="body-medium markdown-content">${html}</div>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      if (window.renderMathInElement) {
        renderMathInElement(document.body, {
          delimiters: [
            {left: '$$', right: '$$', display: false},
            {left: '\\\\[', right: '\\\\]', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\\\(', right: '\\\\)', display: false}
          ],
          ignoredClasses: ['no-math'],
          throwOnError: false
        });
      }
    });
  </script>
</body>
</html>`;

        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store'
        });
        res.end(fullHtml);
      } catch (e) {
        respondJson(res, 400, { error: 'Invalid request' });
      }
    });
    return;
  }

  // API: /api/results
  if (pathname === '/api/results' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const answerFile = path.join(DATA_DIR, 'answer.md');
        const reportFile = path.join(DATA_DIR, 'report.md');
        const scoreFile = path.join(DATA_DIR, 'score.json');

        // Format results as markdown
        const activity = data.activity;
        const isAssessmentMode = !!(activity && activity.assessmentMode);

        // In assessment mode, write only candidate responses (no grading)
        if (isAssessmentMode) {
          let markdown = '';
          if (activity) {
            markdown += `__Type__\n\n${activity.type}\n\n`;
            markdown += '__Responses__\n\n';
            data.results.forEach((result, index) => {
              markdown += `${index + 1}. **${result.text}**\n`;
              markdown += `   - Selected Answer: ${result.selected || 'No answer selected'}\n`;
              if (result.explanation) {
                const explanationText = String(result.explanation).replace(/\n/g, '\n     ');
                markdown += `   - Explanation: ${explanationText}\n`;
              }
              markdown += '\n';
            });
          }
          fs.writeFile(answerFile, markdown, 'utf8', (err) => {
            if (err) {
              respondJson(res, 500, { error: 'Failed to save results' });
              return;
            }
            respondJson(res, 200, { success: true, assessmentMode: true });
          });
          return;
        }

        const correctCount = data.results.filter((result, resultIndex) =>
          evaluateActivityResultCorrect(activity, result, resultIndex)
        ).length;

        const validateLaterCount = countValidateLaterTextInputResults(activity, data.results);

        // Total count excludes "validate-later" questions from scoring
        const totalCount = data.results.length - validateLaterCount;

        let markdown = '';

        // Include original activity details
        if (activity) {
          markdown += `__Type__\n\n${activity.type}\n\n`;

          // Add results section with summary
          let summaryText = `${correctCount}/${totalCount} correct`;
          if (validateLaterCount > 0) {
            summaryText += `\n${validateLaterCount} unvalidated`;
          }
          markdown += `__Summary__\n\n${summaryText}\n\n`;
          markdown += '__Responses__\n\n';

          data.results.forEach((result, index) => {
            markdown += `${index + 1}. **${result.text}**\n`;
            markdown += `   - Selected Answer: ${result.selected || 'No answer selected'}\n`;
            markdown += `   - Correct Answer: ${result.correct}\n`;
            const isValidateLater = isTextInputResultValidateLater(activity, result, index);
            if (activity && /^multiple choice$/i.test(activity.type)) {
              const questionIndex = questionIndexFromOrderedResult(
                result,
                index,
                activity.mcq?.questions?.length ?? 0
              );
              const question = activity.mcq?.questions?.[questionIndex];
              if (question && question.isMultiSelect) {
                const multiMode = question.multiSelectMode === 'any' ? 'any' : 'all';
                markdown += `   - Multi Mode: ${multiMode}\n`;
              }
            }
            const isCorrect = isValidateLater
              ? false
              : evaluateActivityResultCorrect(activity, result, index);

            // Show result status
            if (isValidateLater) {
              markdown += `   - Result: Unvalidated\n`;
            } else {
              markdown += `   - Result: ${isCorrect ? '✓ Correct' : '✗ Incorrect'}\n`;
            }

            // Add explanation if present (for MCQ questions with explainAnswer enabled)
            if (result.explanation) {
              const explanationText = String(result.explanation).replace(/\n/g, '\n     ');
              markdown += `   - Explanation: ${explanationText}\n`;
            }
            markdown += '\n';
          });

          if (/^fill in the blanks$/i.test(activity.type)) {
            // For fill-in-the-blanks, include the original markdown with blanks
            const fh = activity.fib && activity.fib.heading;
            if (fh && fh.markdown && String(fh.markdown).trim()) {
              markdown += `__Heading__\n\n${String(fh.markdown).trim()}\n\n`;
            }
            markdown += `__Markdown With Blanks__\n\n${activity.fib.raw}\n\n`;
            markdown += `__Suggested Answers__\n\n`;
            activity.fib.choices.forEach(choice => {
              markdown += `- ${choice}\n`;
            });
            markdown += '\n';
          } else if (/^multiple choice$/i.test(activity.type)) {
            // For MCQ, include each question with options and suggested answers
            if (activity.mcq && activity.mcq.questions) {
              const h = activity.mcq.heading;
              if (h && h.markdown && String(h.markdown).trim()) {
                markdown += `__Heading__\n\n${String(h.markdown).trim()}\n\n`;
              }
              activity.mcq.questions.forEach((q, qIdx) => {
                if (q.name && String(q.name).trim()) {
                  markdown += `__Question Name__\n\n${String(q.name).trim()}\n\n`;
                }
                // List options in authored source order (A, B, C, ...) rather than
                // shuffled display order, so the persisted question mirrors question.md.
                const orderedOptions = q.options.slice().sort((a, b) =>
                  String(a.label || '').localeCompare(String(b.label || ''))
                );
                markdown += `__Practice Question__\n\n${q.text}\n\n`;
                orderedOptions.forEach(opt => {
                  markdown += `${opt.label}. ${opt.text}\n`;
                });
                markdown += '\n';
                markdown += `__Suggested Answers__\n\n`;
                orderedOptions.forEach(opt => {
                  const correctMarker = opt.correct ? ' - Correct' : '';
                  markdown += `- ${opt.label}${correctMarker}\n`;
                });
                markdown += '\n';
                if (q.explainAnswer) {
                  markdown += `__Explain Your Answer__\n\ntrue\n`;
                  if (q.explainAnswerLabel && String(q.explainAnswerLabel).trim()) {
                    markdown += `${String(q.explainAnswerLabel).trim()}\n`;
                  }
                  markdown += '\n';
                }
              });
            }
          } else if (/^matching$/i.test(activity.type)) {
            // For Matching, include the original markdown with blanks
            const mh = activity.matching && activity.matching.heading;
            if (mh && mh.markdown && String(mh.markdown).trim()) {
              markdown += `__Heading__\n\n${String(mh.markdown).trim()}\n\n`;
            }
            markdown += `__Markdown With Blanks__\n\n${activity.matching.raw}\n\n`;
            markdown += `__Suggested Answers__\n\n`;
            activity.matching.choices.forEach(choice => {
              markdown += `- ${choice}\n`;
            });
            markdown += '\n';
          } else if (/^text input$/i.test(activity.type)) {
            // For Text Input, include each question with correct answers
            if (activity.textInput && activity.textInput.questions) {
              activity.textInput.questions.forEach((q, qIdx) => {
                if (q.name && String(q.name).trim()) {
                  markdown += `__Question Name__\n\n${String(q.name).trim()}\n\n`;
                }
                markdown += `__Practice Question__\n\n${q.text}\n\n`;
                markdown += `__Correct Answers__\n\n`;

                const answerCandidates = Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0
                  ? q.correctAnswers
                  : [{ correctAnswer: q.correctAnswer, validation: q.validation || {} }];

                answerCandidates.forEach(candidate => {
                  const entry = (typeof candidate === 'string')
                    ? { correctAnswer: candidate, validation: q.validation || {} }
                    : {
                        correctAnswer: candidate.correctAnswer || '',
                        validation: candidate.validation || q.validation || {}
                      };

                  let answerStr = String(entry.correctAnswer || '');
                  if (entry.validation && entry.validation.kind) {
                    const kindPrefix = answerStr ? `${answerStr} ` : '';
                    answerStr = `${kindPrefix}[kind: ${entry.validation.kind}]`;
                    if (entry.validation.options && Object.keys(entry.validation.options).length > 0) {
                      const optionsStr = Object.entries(entry.validation.options)
                        .map(([key, value]) => {
                          if (Array.isArray(value)) {
                            return `${key}=${value.join(',')}`;
                          }
                          return `${key}=${value}`;
                        })
                        .join(',');
                      answerStr += ` [options: ${optionsStr}]`;
                    }
                  }
                  markdown += `- ${answerStr}\n`;
                });
                markdown += '\n';
              });
            }
          } else if (/^matrix$/i.test(activity.type) && activity.matrix) {
            const mh = activity.matrix.heading;
            if (mh && mh.markdown && String(mh.markdown).trim()) {
              markdown += `__Heading__\n\n${String(mh.markdown).trim()}\n\n`;
            }
            if (activity.question) {
              markdown += `__Practice Question__\n\n${activity.question}\n\n`;
            }
            markdown += `__Matrix Columns__\n\n`;
            activity.matrix.columns.forEach(c => {
              markdown += `- ${c}\n`;
            });
            markdown += '\n__Matrix Rows__\n\n';
            activity.matrix.rows.forEach(r => {
              markdown += `- ${r}\n`;
            });
            markdown += '\n__Suggested Answers__\n\n';
            activity.matrix.rows.forEach((r, i) => {
              const col = activity.matrix.columns[activity.matrix.correctColumnIndexByRow[i]];
              markdown += `- ${r}: ${col}\n`;
            });
            markdown += '\n';
            if (activity.matrix.explainAnswer) {
              markdown += `__Explain Your Answer__\n\ntrue\n`;
              if (
                activity.matrix.explainAnswerLabel &&
                String(activity.matrix.explainAnswerLabel).trim()
              ) {
                markdown += `${String(activity.matrix.explainAnswerLabel).trim()}\n`;
              }
              markdown += '\n';
            }
          } else {
            // For swipe/sort activities, include question and labels
            if (activity.question) {
              markdown += `__Practice Question__\n\n${activity.question}\n\n`;
            }

            if (/^sort into boxes$/i.test(activity.type) && Array.isArray(activity.categories)) {
              markdown += `__Categories__\n\n`;
              activity.categories.forEach(c => {
                markdown += `- ${c}\n`;
              });
              markdown += '\n';
              if (Array.isArray(activity.items)) {
                markdown += `__Items__\n\n`;
                activity.items.forEach(it => {
                  // Escape backslashes and colons in the item text so a colon
                  // here is never mistaken for the "text: category" separator
                  // on parse. The category remainder may contain raw colons.
                  const escapedText = String(it.text == null ? '' : it.text)
                    .replace(/\\/g, '\\\\')
                    .replace(/:/g, '\\:');
                  markdown += `- ${escapedText}: ${it.correct}\n`;
                });
                markdown += '\n';
              }
            } else if (activity.labels) {
              markdown += `__Labels__\n\n`;
              if (/^sort into boxes$/i.test(activity.type)) {
                markdown += `- First Box Label: ${activity.labels.first || activity.labels.left || 'First Box'}\n`;
                markdown += `- Second Box Label: ${activity.labels.second || activity.labels.right || 'Second Box'}\n\n`;
              } else {
                markdown += `- Left: ${activity.labels.left || 'Left'}\n`;
                markdown += `- Right: ${activity.labels.right || 'Right'}\n\n`;
              }
            }
          }
        }

        const reportMarkdown = buildActivityReportMarkdown(activity, data.results || []);
        const scoreJson = JSON.stringify(buildScoreJson(activity, data.results || []), null, 2);

        fs.writeFile(answerFile, markdown, 'utf8', (err) => {
          if (err) {
            respondJson(res, 500, { error: 'Failed to save results' });
            return;
          }
          fs.writeFile(reportFile, reportMarkdown, 'utf8', (err2) => {
            if (err2) {
              respondJson(res, 500, { error: 'Failed to save report' });
              return;
            }
            fs.writeFile(scoreFile, scoreJson, 'utf8', (err3) => {
              if (err3) {
                respondJson(res, 500, { error: 'Failed to save score' });
                return;
              }
              respondJson(res, 200, { success: true });
            });
          });
        });
      } catch (e) {
        respondJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const fsPath = path.join(PUBLIC_DIR, pathname);

  // Prevent directory traversal
  if (!isPathInside(fsPath, PUBLIC_DIR) && fsPath !== path.join(PUBLIC_DIR, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(fsPath, (err, stats) => {
    if (err) {
      // Fallback to index.html for unknown paths (single page app behavior)
      const fallback = path.join(PUBLIC_DIR, 'index.html');
      if (fs.existsSync(fallback)) {
        sendFile(res, fallback, 200);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
      }
      return;
    }
    if (stats.isDirectory()) {
      const indexPath = path.join(fsPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        sendFile(res, indexPath, 200);
      } else {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
      }
      return;
    }
    sendFile(res, fsPath, 200);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  if (EXAMPLES_MODE) {
    console.log(`Examples mode: http://localhost:${PORT}/`);
    console.log(`  Activity preview loads in iframe from /play (copies examples → data/question.md).`);
  } else {
    console.log(`Server running at http://localhost:${PORT}`);
  }
});

// Create WebSocket server using the ws module
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  // Add new client to the Set
  clients.add(ws);
  console.log('WebSocket connection established, total clients:', clients.size);

  // Handle WebSocket connection close
  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket connection closed, remaining clients:', clients.size);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});
