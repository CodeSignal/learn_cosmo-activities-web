const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// The helpers are a browser ES module with no imports; load it through a data: URL so the
// test does not depend on Node's module-syntax detection for .js files.
async function loadHelpers() {
  const source = fs.readFileSync(path.join(__dirname, '../public/utils/repeatable-answers.js'), 'utf8');
  return import(`data:text/javascript,${encodeURIComponent(source)}`);
}

test('serializeRepeatableAnswer labels entries and drops empty ones', async () => {
  const { serializeRepeatableAnswer } = await loadHelpers();
  assert.equal(
    serializeRepeatableAnswer(['  First  ', '', 'Second\nline'], 'Defect'),
    'Defect 1:\nFirst\n\nDefect 2:\nSecond\nline'
  );
  assert.equal(serializeRepeatableAnswer(['', '   '], 'Defect'), '');
});

test('parseRepeatableAnswer round-trips serialized entries', async () => {
  const { serializeRepeatableAnswer, parseRepeatableAnswer } = await loadHelpers();
  const entries = ['Summary: A\nSeverity: Low', 'Summary: B\n\nSeverity: High'];
  assert.deepEqual(parseRepeatableAnswer(serializeRepeatableAnswer(entries, 'Defect'), 'Defect'), entries);
});

test('header-shaped lines inside an entry stay in that entry', async () => {
  const { serializeRepeatableAnswer, parseRepeatableAnswer } = await loadHelpers();
  const entries = ['Notes\nDefect 2:\nstill the first entry', 'Second'];
  const serialized = serializeRepeatableAnswer(entries, 'Defect');
  assert.match(serialized, /^\\Defect 2:$/m);
  assert.deepEqual(parseRepeatableAnswer(serialized, 'Defect'), entries);
});

test('lines that already start with a backslash round-trip unchanged', async () => {
  const { serializeRepeatableAnswer, parseRepeatableAnswer } = await loadHelpers();
  const entries = ['\\Defect 3:\nliteral backslash'];
  assert.deepEqual(parseRepeatableAnswer(serializeRepeatableAnswer(entries, 'Defect'), 'Defect'), entries);
});

test('parseRepeatableAnswer treats unlabeled text as one entry and empty text as one empty entry', async () => {
  const { parseRepeatableAnswer } = await loadHelpers();
  assert.deepEqual(parseRepeatableAnswer('Plain answer\nwith two lines', 'Entry'), ['Plain answer\nwith two lines']);
  assert.deepEqual(parseRepeatableAnswer('', 'Entry'), ['']);
});
