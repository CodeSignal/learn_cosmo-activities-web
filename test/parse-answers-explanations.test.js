const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAnswersFromMarkdown } = require('../lib/parse-question');

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
