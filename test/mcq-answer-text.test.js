const test = require('node:test');
const assert = require('node:assert/strict');
const { mcqAnswerLines, mcqLabelsFromAnswerValues } = require('../lib/mcq-answer-text');
const { parseAnswersFromMarkdown } = require('../lib/parse-question');

const question = {
  options: [
    { label: 'A', text: 'Apples, pears' },
    { label: 'B', text: 'Explanation: none' },
    { label: 'C', text: '$$x = 2$$' }
  ]
};

test('mcqAnswerLines writes option text instead of the letter', () => {
  assert.equal(
    mcqAnswerLines(question, 'C', 'Selected Answer', '   ', 'No answer selected'),
    '   - Selected Answer: $$x = 2$$\n'
  );
});

test('mcqAnswerLines writes one line per option for several options', () => {
  assert.equal(
    mcqAnswerLines(question, 'A, C', 'Correct Answer', '    ', ''),
    '    - Correct Answer: Apples, pears\n    - Correct Answer: $$x = 2$$\n'
  );
});

test('mcqAnswerLines writes the empty text when there is no answer', () => {
  assert.equal(
    mcqAnswerLines(question, '', 'Selected Answer', '   ', 'No answer selected'),
    '   - Selected Answer: No answer selected\n'
  );
});

test('mcqLabelsFromAnswerValues maps option text back to labels, commas included', () => {
  assert.deepEqual(mcqLabelsFromAnswerValues(question, ['Apples, pears', '$$x = 2$$']), ['A', 'C']);
});

test('mcqLabelsFromAnswerValues reads older answer.md letter lists', () => {
  assert.deepEqual(mcqLabelsFromAnswerValues(question, ['A, C']), ['A', 'C']);
  assert.deepEqual(mcqLabelsFromAnswerValues(question, ['B']), ['B']);
});

test('mcqLabelsFromAnswerValues drops values that match no option', () => {
  assert.deepEqual(mcqLabelsFromAnswerValues(question, ['Bananas', 'Z']), []);
});

test('answer.md written with option text parses back to labels and explanations', () => {
  const indent = '   ';
  const md = [
    '__Type__',
    '',
    'Multiple Choice',
    '',
    '__Responses__',
    '',
    '1. **Question 1**',
    mcqAnswerLines(question, 'A, B', 'Selected Answer', indent, 'No answer selected').trimEnd(),
    mcqAnswerLines(question, 'B', 'Correct Answer', indent, '').trimEnd(),
    `${indent}- Result: ✗ Incorrect`,
    `${indent}- Explanation: My reasoning`,
    '',
    '2. **Question 2**',
    mcqAnswerLines(question, '', 'Selected Answer', indent, 'No answer selected').trimEnd(),
    mcqAnswerLines(question, 'B', 'Correct Answer', indent, '').trimEnd(),
    `${indent}- Result: ✗ Incorrect`,
    ''
  ].join('\n');

  assert.doesNotMatch(md, /Answer: [A-D](,|$)/m);
  const parsed = parseAnswersFromMarkdown(md);
  assert.deepEqual(parsed.answers, { 0: ['Apples, pears', 'Explanation: none'] });
  assert.deepEqual(mcqLabelsFromAnswerValues(question, parsed.answers[0]), ['A', 'B']);
  assert.deepEqual(parsed.explanations, { 0: 'My reasoning' });
});
