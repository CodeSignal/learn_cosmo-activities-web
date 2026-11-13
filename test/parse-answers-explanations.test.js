const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAnswersFromMarkdown } = require('../lib/parse-question');
const { responseDetailIndent } = require('../lib/text-input-answers');

test('parseAnswersFromMarkdown keeps a single-line MCQ explanation', () => {
  const parsed = parseAnswersFromMarkdown(`__Type__

Multiple Choice

__Responses__

1. **Question 1**
   - Selected Answer: B
   - Explanation: Light scatters off molecules in the atmosphere.
`);

  assert.equal(parsed.explanations[0], 'Light scatters off molecules in the atmosphere.');
});

test('parseAnswersFromMarkdown keeps indented multiline MCQ explanations', () => {
  const parsed = parseAnswersFromMarkdown(`__Type__

Multiple Choice

__Responses__

1. **Question 1**
   - Selected Answer: B
   - Explanation: First line
     Second line
`);

  assert.equal(parsed.explanations[0], 'First line\nSecond line');
});

test('parseAnswersFromMarkdown keeps explanations from question 10 on with their own question', () => {
  for (const indentFor of [responseDetailIndent, () => '   ']) {
    const entries = [];
    for (let n = 1; n <= 12; n++) {
      const indent = indentFor(n);
      entries.push(`${n}. **Question ${n}**\n${indent}- Selected Answer: B\n${indent}- Explanation: Reason ${n}\n`);
    }
    for (const type of ['Multiple Choice', 'Matrix']) {
      const parsed = parseAnswersFromMarkdown(`__Type__\n\n${type}\n\n__Responses__\n\n${entries.join('\n')}`);
      assert.equal(parsed.explanations[0], 'Reason 1', type);
      assert.equal(parsed.explanations[1], 'Reason 2', type);
      assert.equal(parsed.explanations[10], 'Reason 11', type);
      assert.equal(parsed.explanations[11], 'Reason 12', type);
    }
  }
});
