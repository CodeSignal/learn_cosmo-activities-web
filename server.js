const http = require('http');
const fs = require('fs');
const path = require('path');
const { Lexer } = require('marked');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

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

function parseSectionsFromTokens(tokens) {
  const sections = new Map();
  let current = null;
  let buffer = [];
  function flush() {
    if (current !== null) sections.set(current, buffer.slice());
    buffer = [];
  }
  for (const token of tokens) {
    if (token.type === 'paragraph') {
      const text = (token.text || '').trim();
      const m = text.match(/^__([^_]+)__\s*$/);
      if (m) {
        flush();
        current = m[1].trim();
        continue;
      }
    }
    if (current !== null) buffer.push(token);
  }
  flush();
  return sections;
}

function readListItems(sectionTokens) {
  const items = [];
  for (const t of sectionTokens || []) {
    if (t.type === 'list' && Array.isArray(t.items)) {
      for (const li of t.items) {
        const text = (li.text || '').trim();
        if (text) items.push(text);
      }
    } else if (t.type === 'paragraph') {
      // Support loose list formatting lines starting with - or *
      const lines = (t.raw || t.text || '').split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^\s*[-*]\s+(.*)$/);
        if (m) items.push(m[1].trim());
      }
    }
  }
  return items;
}

function buildActivityFromMarkdown(markdownText) {
  const tokens = Lexer.lex(markdownText);
  const sections = parseSectionsFromTokens(tokens);
  const type = ((sections.get('Type') || []).map(t => t.raw || t.text).join('\n') || '').trim();
  const question = ((sections.get('Practice Question') || []).map(t => t.raw || t.text).join('\n') || '').trim();

  if (/^fill in the blanks$/i.test(type)) {
    const fibTokens = sections.get('Markdown With Blanks') || [];
    const fibMarkdown = fibTokens.map(t => t.raw || t.text || '').join('\n').trim();
    const suggested = readListItems(sections.get('Suggested Answers'));
    
    // Split the content into prompt and fill-in-the-blanks content
    const lines = fibMarkdown.split(/\r?\n/);
    let promptLines = [];
    let contentLines = [];
    let foundBlockquote = false;
    
    for (const line of lines) {
      if (/^\s*>/.test(line)) {
        foundBlockquote = true;
        // Remove the '> ' marker and add to content
        contentLines.push(line.replace(/^\s*>\s?/, ''));
      } else if (foundBlockquote) {
        // After finding blockquote, everything goes to content
        contentLines.push(line);
      } else {
        // Before blockquote, everything goes to prompt (unless it's empty)
        if (line.trim()) {
          promptLines.push(line);
        }
      }
    }
    
    const prompt = promptLines.join('\n').trim();
    const content = contentLines.join('\n').trim();
    
    const blanks = [];
    let idx = 0;
    const htmlPlaceholders = content.replace(/\[\[blank:([^\]]+)\]\]/gi, (_, token) => {
      const answer = String(token).trim();
      blanks.push({ index: idx, answer });
      return `__BLANK_${idx++}__`;
    });
    const choiceSet = new Set(suggested.map(s => s.trim()));
    blanks.forEach(b => choiceSet.add(b.answer));
    const choices = Array.from(choiceSet);
    // simple shuffle
    let s = (markdownText.length || 1337) % 2147483647 || 1337;
    function rand() { s = (s * 48271) % 2147483647; return s / 2147483647; }
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return { type, question, fib: { raw: fibMarkdown, prompt, content, htmlWithPlaceholders: htmlPlaceholders, blanks, choices } };
  }

  const labels = readListItems(sections.get('Labels'));
  if (/^sort into boxes$/i.test(type)) {
    let first = '', second = '';
    for (const entry of labels) {
      const [k, ...rest] = entry.split(':');
      const v = rest.join(':').trim();
      const nk = (k || '').toLowerCase();
      if (nk.includes('first')) first = v;
      if (nk.includes('second')) second = v;
    }
    const firstItems = readListItems(sections.get('First Box Items'));
    const secondItems = readListItems(sections.get('Second Box Items'));
    const items = [
      ...firstItems.map(text => ({ text, correct: 'first' })),
      ...secondItems.map(text => ({ text, correct: 'second' })),
    ];
    let s = (markdownText.length || 1337) % 2147483647 || 1337;
    function rand() { s = (s * 48271) % 2147483647; return s / 2147483647; }
    for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
    return { type, question, labels: { first, second }, items };
  }

  // default swipe left/right
  let left = '', right = '';
  for (const entry of labels) {
    const [k, ...rest] = entry.split(':');
    const v = rest.join(':').trim();
    const nk = (k || '').toLowerCase();
    if (nk.includes('left')) left = v;
    if (nk.includes('right')) right = v;
  }
  const leftItems = readListItems(sections.get('Left Label Items'));
  const rightItems = readListItems(sections.get('Right Label Items'));
  const items = [
    ...leftItems.map(text => ({ text, correct: 'left' })),
    ...rightItems.map(text => ({ text, correct: 'right' })),
  ];
  let s = (markdownText.length || 1337) % 2147483647 || 1337;
  function rand() { s = (s * 48271) % 2147483647; return s / 2147483647; }
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  return { type, question, labels: { left, right }, items };
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(urlObj.pathname || '/');

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
        respondJson(res, 200, activity);
      } catch (e) {
        respondJson(res, 500, { error: 'Failed to parse markdown' });
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
        
        // Format results as markdown
        const correctCount = data.results.filter(result => result.selected === result.correct).length;
        const totalCount = data.results.length;
        const activity = data.activity;
        
        let markdown = '';
        
        // Include original activity details
        if (activity) {
          markdown += `__Type__\n\n${activity.type}\n\n`;
          
          if (/^fill in the blanks$/i.test(activity.type)) {
            // For fill-in-the-blanks, include the original markdown with blanks
            markdown += `__Markdown With Blanks__\n\n${activity.fib.raw}\n\n`;
            markdown += `__Suggested Answers__\n\n`;
            activity.fib.choices.forEach(choice => {
              markdown += `- ${choice}\n`;
            });
            markdown += '\n';
          } else {
            // For swipe/sort activities, include question and labels
            if (activity.question) {
              markdown += `__Practice Question__\n\n${activity.question}\n\n`;
            }
            
            if (activity.labels) {
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
        
        // Add results section
        markdown += `__Summary__\n\n${correctCount}/${totalCount} correct\n\n`;
        markdown += '__Responses__\n\n';
        
        data.results.forEach((result, index) => {
          markdown += `${index + 1}. **${result.text}**\n`;
          markdown += `   - Selected: ${result.selected}\n`;
          markdown += `   - Correct: ${result.correct}\n`;
          markdown += `   - Result: ${result.selected === result.correct ? '✓ Correct' : '✗ Incorrect'}\n\n`;
        });
        
        fs.writeFile(answerFile, markdown, 'utf8', (err) => {
          if (err) {
            respondJson(res, 500, { error: 'Failed to save results' });
            return;
          }
          respondJson(res, 200, { success: true });
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
  console.log(`Server running at http://localhost:${PORT}`);
});


