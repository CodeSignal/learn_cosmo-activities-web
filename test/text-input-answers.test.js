const test = require('node:test');
const assert = require('node:assert/strict');

const { parseTextInputAnswers } = require('../lib/text-input-answers');

function responses(entries) {
  return entries
    .map(([name, selected], index) => [
      `${index + 1}. **${name}**`,
      `   - Selected Answer: ${selected}`,
      '   - Correct Answer: ',
      '   - Result: Unvalidated',
      ''
    ].join('\n'))
    .join('\n');
}

test('parseTextInputAnswers reads single-line answers by 0-based index', () => {
  const answers = parseTextInputAnswers(responses([['Q1', 'Paris'], ['Q2', '42']]));
  assert.deepEqual(answers, { 0: 'Paris', 1: '42' });
});

test('parseTextInputAnswers keeps every line of a multi-line answer', () => {
  const multiLine = 'Summary: Delete has no confirmation.\nSteps: Click Delete.\nSeverity: High';
  const answers = parseTextInputAnswers(responses([['Issue', multiLine], ['Other', 'short']]));
  assert.equal(answers[0], multiLine);
  assert.equal(answers[1], 'short');
});

test('parseTextInputAnswers round-trips a repeatable answer with several entries', () => {
  const repeatable = 'Defect 1:\nSummary: A\nSeverity: Low\n\nDefect 2:\nSummary: B\nSeverity: High';
  const answers = parseTextInputAnswers(responses([['Defects', repeatable]]));
  assert.equal(answers[0], repeatable);
});

test('parseTextInputAnswers skips unanswered questions', () => {
  const answers = parseTextInputAnswers(responses([['Q1', 'No answer selected'], ['Q2', '']]));
  assert.deepEqual(answers, {});
});
