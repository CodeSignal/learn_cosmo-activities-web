/**
 * Standalone grading script for assessment mode.
 *
 * Reads a stripped question.md, a candidate's answer.md, and a secure
 * answer-key.md, then generates report.md and score.json.
 *
 * Usage:
 *   node generate-score.js \
 *     --question data/question.md \
 *     --answer data/answer.md \
 *     --answer-key /secure/path/answer-key.md \
 *     --report data/report.md \
 *     --score data/score.json
 */

const fs = require('fs');
const path = require('path');
const { Lexer } = require('marked');
const {
  buildActivityFromMarkdown,
  parseAnswersFromMarkdown,
  parseSectionsFromTokens,
  readListItems,
} = require('./parse-question');
const { evaluateActivityResultCorrect } = require('./activity-results-validation');
const { buildActivityReportMarkdown } = require('./build-activity-report');
const { buildScoreJson } = require('./build-score-json');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  const keys = ['--question', '--answer', '--answer-key', '--report', '--score'];
  for (let i = 2; i < argv.length; i++) {
    if (keys.includes(argv[i]) && i + 1 < argv.length) {
      const key = argv[i].replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[key] = path.resolve(argv[i + 1]);
      i++;
    }
  }
  return args;
}

function usage() {
  console.error(
    'Usage: node generate-score.js \\\n' +
    '  --question <question.md> \\\n' +
    '  --answer <answer.md> \\\n' +
    '  --answer-key <answer-key.md> \\\n' +
    '  --report <report.md> \\\n' +
    '  --score <score.json>'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Answer-key parser
// ---------------------------------------------------------------------------

/**
 * Parses answer-key.md into { type, answers }.
 *
 * Format (all types):
 *   __Type__
 *   <type name>
 *
 *   __Answer Key__
 *   - <key>: <value>
 *   ...
 *
 * Returns:
 *   { type: string, answers: Array<{ key: string, value: string }> }
 */
function parseAnswerKey(markdown) {
  const tokens = Lexer.lex(markdown);
  const sections = parseSectionsFromTokens(tokens);
  const type = ((sections.get('Type') || []).map(t => t.raw || t.text).join('\n') || '').trim();
  const keyItems = readListItems(sections.get('Answer Key'));

  const { parseSortItemEntry } = require('./sort-item-entry');
  const answers = keyItems.map(item => {
    const { text, correct } = parseSortItemEntry(item);
    return { key: text, value: correct };
  });

  return { type, answers };
}

// ---------------------------------------------------------------------------
// Merge answer key into activity
// ---------------------------------------------------------------------------

/**
 * Injects answers from answer-key.md into a parsed (stripped) activity object
 * so existing scoring functions work unmodified.
 */
function mergeAnswerKeyIntoActivity(activity, answerKey) {
  const type = String(activity.type || '');

  if (/^multiple choice$/i.test(type)) {
    const questions = activity.mcq && activity.mcq.questions;
    if (!questions) return;
    answerKey.answers.forEach(({ key, value }) => {
      const m = key.match(/^Question\s+(\d+)$/i);
      if (!m) return;
      const qIdx = parseInt(m[1], 10) - 1;
      const q = questions[qIdx];
      if (!q) return;
      const correctLabels = value.split(',').map(s => s.trim()).filter(Boolean);
      q.options.forEach(opt => {
        opt.correct = correctLabels.includes(opt.label);
      });
      q.isMultiSelect = correctLabels.length > 1;
    });
    return;
  }

  if (/^fill in the blanks$/i.test(type)) {
    const blanks = activity.fib && activity.fib.blanks;
    if (!blanks) return;
    answerKey.answers.forEach(({ key, value }) => {
      const m = key.match(/^Blank\s+(\d+)$/i);
      if (!m) return;
      const idx = parseInt(m[1], 10) - 1;
      const blank = blanks.find(b => b.index === idx);
      if (blank) blank.answer = value;
    });
    return;
  }

  if (/^matching$/i.test(type)) {
    const items = activity.matching && activity.matching.items;
    if (!items) return;
    answerKey.answers.forEach(({ key, value }) => {
      const m = key.match(/^Item\s+(\d+)$/i);
      if (!m) return;
      const idx = parseInt(m[1], 10) - 1;
      if (items[idx]) items[idx].answer = value;
    });
    return;
  }

  if (/^sort into boxes$/i.test(type)) {
    if (!Array.isArray(activity.items)) return;
    answerKey.answers.forEach(({ key, value }) => {
      const item = activity.items.find(it => it.text === key);
      if (item) item.correct = value;
    });
    return;
  }

  if (/^matrix$/i.test(type)) {
    const matrix = activity.matrix;
    if (!matrix) return;
    const rows = matrix.rows || [];
    const columns = matrix.columns || [];
    const indexByRow = new Array(rows.length).fill(null);
    answerKey.answers.forEach(({ key, value }) => {
      const rowIdx = rows.indexOf(key);
      const colIdx = columns.indexOf(value);
      if (rowIdx >= 0 && colIdx >= 0) {
        indexByRow[rowIdx] = colIdx;
      }
    });
    matrix.correctColumnIndexByRow = indexByRow;
    return;
  }

  if (/^text input$/i.test(type)) {
    const questions = activity.textInput && activity.textInput.questions;
    if (!questions) return;
    const { parseTextInputAnswerItems } = require('./text-input-validation');
    const valuesByQuestion = new Map();
    answerKey.answers.forEach(({ key, value }) => {
      const m = key.match(/^Question\s+(\d+)$/i);
      if (!m) return;
      const qIdx = parseInt(m[1], 10) - 1;
      if (!questions[qIdx]) return;
      if (!valuesByQuestion.has(qIdx)) valuesByQuestion.set(qIdx, []);
      valuesByQuestion.get(qIdx).push(value);
    });
    valuesByQuestion.forEach((values, qIdx) => {
      const q = questions[qIdx];
      const parsed = parseTextInputAnswerItems(values);
      q.correctAnswers = parsed.correctAnswers;
      q.correctAnswer = parsed.correctAnswer;
      q.validation = parsed.validation;
    });
    return;
  }

  // Swipe left/right
  if (!Array.isArray(activity.items)) return;
  answerKey.answers.forEach(({ key, value }) => {
    const item = activity.items.find(it => it.text === key);
    if (item) item.correct = value;
  });
}

// ---------------------------------------------------------------------------
// Build results from assessment-mode answer.md
// ---------------------------------------------------------------------------

/**
 * Extracts {text, selected} pairs from the __Responses__ section of an
 * assessment-mode answer.md.  The item text sits between ** markers:
 *   1. **Item text here**
 *      - Selected Answer: value
 */
function extractResponsePairs(answerMd) {
  const tokens = Lexer.lex(answerMd);
  const sections = parseSectionsFromTokens(tokens);
  const responsesText = (sections.get('Responses') || [])
    .map(t => t.raw || t.text || '').join('\n');
  const pairs = [];
  const re = /\d+\.\s*\*\*([^*]+)\*\*[\s\S]*?Selected Answer:\s*([^\n]+)/g;
  let m;
  while ((m = re.exec(responsesText)) !== null) {
    pairs.push({ text: m[1].trim(), selected: m[2].trim() });
  }
  return pairs;
}

/**
 * Parses assessment-mode answer.md (candidate responses only) and builds the
 * results array that the scoring functions expect.
 *
 * Assessment-mode answer.md format:
 *   __Type__
 *   <type>
 *   __Responses__
 *   1. **Question 1**
 *      - Selected Answer: B
 *   2. **Question 2**
 *      - Selected Answer: A, C
 */
function buildResultsFromAnswerMd(activity, answerMd) {
  const parsed = parseAnswersFromMarkdown(answerMd);
  const answers = parsed.answers || {};
  const explanations = parsed.explanations || {};
  const type = String(activity.type || '');

  if (/^multiple choice$/i.test(type)) {
    const questions = activity.mcq && activity.mcq.questions;
    if (!questions) return [];
    return questions.map((q, idx) => {
      const sel = answers[idx];
      const selected = Array.isArray(sel) ? sel.join(', ') : (sel || '');
      const correct = q.options.filter(o => o.correct).map(o => o.label).join(', ');
      const result = {
        text: (q.name && String(q.name).trim()) || `Question ${idx + 1}`,
        selected,
        correct
      };
      if (explanations[idx]) result.explanation = explanations[idx];
      return result;
    });
  }

  if (/^fill in the blanks$/i.test(type)) {
    const blanks = (activity.fib && activity.fib.blanks) || [];
    return blanks.map((blank, idx) => ({
      text: `Blank ${idx + 1}`,
      selected: answers[idx] || '',
      correct: blank.answer || ''
    }));
  }

  if (/^matching$/i.test(type)) {
    const items = (activity.matching && activity.matching.items) || [];
    return items.map((item, idx) => ({
      text: `Item ${idx + 1}`,
      selected: answers[idx] || '',
      correct: item.answer || ''
    }));
  }

  if (/^sort into boxes$/i.test(type)) {
    const items = activity.items || [];
    const pairs = extractResponsePairs(answerMd);
    return items.map((item, idx) => {
      const pair = pairs.find(p => p.text === item.text);
      return {
        text: item.text || `Item ${idx + 1}`,
        selected: pair ? pair.selected : (answers[idx] || ''),
        correct: item.correct || ''
      };
    });
  }

  if (/^matrix$/i.test(type)) {
    const matrix = activity.matrix || {};
    const rows = matrix.rows || [];
    const columns = matrix.columns || [];
    const correctByRow = matrix.correctColumnIndexByRow || [];
    return rows.map((rowLabel, idx) => {
      const result = {
        text: `Row ${idx + 1}`,
        selected: answers[idx] || '',
        correct: columns[correctByRow[idx]] || ''
      };
      if (explanations[idx]) result.explanation = explanations[idx];
      return result;
    });
  }

  if (/^text input$/i.test(type)) {
    const questions = (activity.textInput && activity.textInput.questions) || [];
    return questions.map((q, idx) => {
      const answerCandidates = Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0
        ? q.correctAnswers
        : [{ correctAnswer: q.correctAnswer || '' }];
      const correctText = answerCandidates
        .map(c => (typeof c === 'string' ? c : c.correctAnswer))
        .filter(Boolean)
        .join(' | ');
      return {
        text: (q.name && String(q.name).trim()) || `Question ${idx + 1}`,
        selected: answers[idx] || '',
        correct: correctText || q.correctAnswer || ''
      };
    });
  }

  // Swipe / fallback — match by item text to handle shuffle
  const items = activity.items || [];
  const pairs = extractResponsePairs(answerMd);
  return items.map((item, idx) => {
    const pair = pairs.find(p => p.text === item.text);
    return {
      text: item.text || `Item ${idx + 1}`,
      selected: pair ? pair.selected : (answers[idx] || ''),
      correct: item.correct || ''
    };
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);
  if (!args.question || !args.answer || !args.answerKey || !args.report || !args.score) {
    usage();
  }

  const questionMd = fs.readFileSync(args.question, 'utf8');
  const answerMd = fs.readFileSync(args.answer, 'utf8');
  const answerKeyMd = fs.readFileSync(args.answerKey, 'utf8');

  // 1. Parse the stripped question into an activity (no answers)
  const activity = buildActivityFromMarkdown(questionMd);

  // 2. Parse the answer key
  const answerKey = parseAnswerKey(answerKeyMd);

  // 3. Merge answer key into the activity (inject correct answers)
  mergeAnswerKeyIntoActivity(activity, answerKey);

  // 4. Build the results array from the candidate's answer.md
  const results = buildResultsFromAnswerMd(activity, answerMd);

  // 5. Generate report and score using existing logic
  const reportMarkdown = buildActivityReportMarkdown(activity, results);
  const scoreJson = JSON.stringify(buildScoreJson(activity, results), null, 2);

  // 6. Write output files
  const reportDir = path.dirname(args.report);
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(args.report, reportMarkdown, 'utf8');

  const scoreDir = path.dirname(args.score);
  if (!fs.existsSync(scoreDir)) fs.mkdirSync(scoreDir, { recursive: true });
  fs.writeFileSync(args.score, scoreJson, 'utf8');

  console.log(`Report written to ${args.report}`);
  console.log(`Score written to ${args.score}`);
}

main();
