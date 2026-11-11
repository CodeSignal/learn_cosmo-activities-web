const test = require('node:test');
const assert = require('node:assert/strict');

const { Lexer } = require('marked');
const { parseTextInputAnswers, responseDetailIndent } = require('../lib/text-input-answers');
const { parseAnswersFromMarkdown } = require('../lib/parse-question');

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

test('parseTextInputAnswers keeps learner lines that look like the Correct Answer marker', () => {
  const tricky = 'Summary: Wrong label\n   - Correct Answer: shown as "Medium"\nSeverity: Low';
  const answers = parseTextInputAnswers(responses([['Issue', tricky], ['Next', 'after']]));
  assert.equal(answers[0], tricky);
  assert.equal(answers[1], 'after');
});

function answerFile(count, indentFor, extraLines = []) {
  const entries = [];
  for (let n = 1; n <= count; n++) {
    const indent = indentFor(n);
    entries.push([
      `${n}. **Question ${n}**`,
      `${indent}- Selected Answer: answer ${n}`,
      ...extraLines.map(line => `${indent}${line}`),
      ''
    ].join('\n'));
  }
  return `__Type__\n\nText Input\n\n__Responses__\n\n${entries.join('\n')}`;
}

function expectedAnswers(count) {
  return Object.fromEntries(Array.from({ length: count }, (_, i) => [i, `answer ${i + 1}`]));
}

test('responseDetailIndent indents detail lines past the "N. " marker', () => {
  assert.equal(responseDetailIndent(1), '   ');
  assert.equal(responseDetailIndent(9), '   ');
  assert.equal(responseDetailIndent(10), '    ');
  assert.equal(responseDetailIndent(99), '    ');
  assert.equal(responseDetailIndent(100), '     ');
});

test('detail lines indented with responseDetailIndent stay inside items 10 and up', () => {
  const markdown = answerFile(12, responseDetailIndent);
  const lists = Lexer.lex(markdown).filter(token => token.type === 'list');
  assert.equal(lists.length, 1);
  assert.equal(lists[0].items.length, 12);
  assert.deepEqual(parseAnswersFromMarkdown(markdown).answers, expectedAnswers(12));
});

test('parseAnswersFromMarkdown reads answers 10 and up from answer files with a three-space indent', () => {
  const threeSpaces = () => '   ';
  assert.deepEqual(parseAnswersFromMarkdown(answerFile(12, threeSpaces)).answers, expectedAnswers(12));

  const practiceFile = answerFile(12, threeSpaces, ['- Correct Answer: answer', '- Result: ✓ Correct']);
  assert.deepEqual(parseAnswersFromMarkdown(practiceFile).answers, expectedAnswers(12));
});
