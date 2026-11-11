const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Runs the checked-in standalone bundle, the same file graders run.
const SCRIPT = path.resolve(__dirname, '..', 'generate-score.js');

function runScorer(questionMd, answerMd, answerKeyMd) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-score-numbers-'));
  try {
    const files = {
      question: path.join(dir, 'question.md'),
      answer: path.join(dir, 'answer.md'),
      answerKey: path.join(dir, 'answer-key.md'),
      report: path.join(dir, 'report.md'),
      score: path.join(dir, 'score.json')
    };
    fs.writeFileSync(files.question, questionMd, 'utf8');
    fs.writeFileSync(files.answer, answerMd, 'utf8');
    fs.writeFileSync(files.answerKey, answerKeyMd, 'utf8');
    execFileSync(process.execPath, [
      SCRIPT,
      '--question', files.question,
      '--answer', files.answer,
      '--answer-key', files.answerKey,
      '--report', files.report,
      '--score', files.score
    ], { timeout: 10000 });
    return {
      report: fs.readFileSync(files.report, 'utf8'),
      score: JSON.parse(fs.readFileSync(files.score, 'utf8'))
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Each row is one question: what the candidate typed, the answer-key line, and the expected score.
// Kept under 10 questions so the rows do not depend on how two-digit response numbers are indented.
const ROWS = [
  { typed: '5,000', key: '5000 [kind: numeric] [options: precision=6,threshold=0]', score: 1 },
  { typed: '1,234.56', key: '1234.56 [kind: numeric] [options: precision=6,threshold=0]', score: 1 },
  { typed: '-1,000', key: '-1000 [kind: numeric] [options: precision=6,threshold=0]', score: 1 },
  { typed: '5000', key: '5000 [kind: numeric] [options: precision=6,threshold=0]', score: 1 },
  { typed: '$1,200.50', key: '1200.50 [kind: numeric-with-currency] [options: threshold=0]', score: 1 },
  { typed: '1,234.56', key: '1234.56 [kind: numeric-with-currency] [options: threshold=0]', score: 1 },
  { typed: '12,5', key: '12.5 [kind: numeric] [options: precision=6,threshold=0]', score: 0 },
  { typed: '1,23,4', key: '1234 [kind: numeric] [options: precision=6,threshold=0]', score: 0 },
  { typed: '', key: '5000 [kind: numeric] [options: precision=6,threshold=0]', score: 0 }
];

function stripKey(key) {
  return key.replace(/^.*?(\[kind:)/, '$1');
}

function buildFiles(rows) {
  const questionMd = ['__Type__', '', 'Text Input', ''];
  const answerMd = ['__Type__', '', 'Text Input', '', '__Responses__', ''];
  const answerKeyMd = ['__Type__', '', 'Text Input', '', '__Answer Key__', ''];
  rows.forEach((row, i) => {
    const n = i + 1;
    questionMd.push('__Practice Question__', '', `Question text ${n}`, '', '__Correct Answers__', '', `- ${stripKey(row.key)}`, '');
    answerMd.push(`${n}. **Question ${n}**`, `   - Selected Answer: ${row.typed || 'No answer selected'}`);
    answerKeyMd.push(`- Question ${n}: ${row.key}`);
  });
  return [questionMd, answerMd, answerKeyMd].map(lines => `${lines.join('\n')}\n`);
}

test('Text Input: formatted numbers score by value through generate-score', () => {
  const { score } = runScorer(...buildFiles(ROWS));

  assert.deepEqual(
    score.breakoutScores.map(b => b.score),
    ROWS.map(row => row.score),
    'per-question scores'
  );
  assert.equal(score.totalScore, ROWS.filter(row => row.score === 1).length);
  assert.equal(score.maxScore, ROWS.length);
});

test('Text Input: the report keeps the number as the candidate typed it', () => {
  const rows = ROWS.slice(0, 2);
  const { report } = runScorer(...buildFiles(rows));
  assert.match(report, /5,000/);
  assert.match(report, /1,234\.56/);
});
