const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  parseAnswerKey,
  splitCombinedMarkdown,
  mergeQuestionAndAnswerKey,
} = require('../lib/split-answer-key');
const {
  buildActivityFromMarkdown,
  detectAnswersPresent,
} = require('../lib/parse-question');

const EXAMPLES = path.resolve(__dirname, '../data/examples');

function readExample(name) {
  return fs.readFileSync(path.join(EXAMPLES, name), 'utf8');
}

function keyValues(markdown) {
  return parseAnswerKey(markdown).answers;
}

test('splitCombinedMarkdown leaves empty markdown unchanged', () => {
  assert.deepEqual(splitCombinedMarkdown(''), {
    questionMarkdown: '',
    answerKeyMarkdown: '',
  });
});

test('Text Input: split writes kind/options on the question and answers on the key', () => {
  const combined = readExample('text-input-simple.md');
  const { questionMarkdown, answerKeyMarkdown } = splitCombinedMarkdown(combined);
  const activity = buildActivityFromMarkdown(questionMarkdown);
  assert.equal(detectAnswersPresent(activity), false);
  assert.deepEqual(keyValues(answerKeyMarkdown), [
    { key: 'Question 1', value: 'Paris [kind: string] [options: caseSensitive=false]' },
    { key: 'Question 2', value: '4 [kind: numeric] [options: threshold=0.01,precision=2]' },
  ]);
  assert.match(questionMarkdown, /-\s*\[kind: string\] \[options: caseSensitive=false\]/);
  assert.match(questionMarkdown, /-\s*\[kind: numeric\] \[options: threshold=0\.01,precision=2\]/);
  assert.doesNotMatch(questionMarkdown, /Paris/);
});

test('Text Input: merge assessment example restores answers for the editor', () => {
  const merged = mergeQuestionAndAnswerKey(
    readExample('assessment-text-input.md'),
    readExample('assessment-text-input-answer-key.md')
  );
  const activity = buildActivityFromMarkdown(merged);
  assert.equal(detectAnswersPresent(activity), true);
  assert.equal(activity.textInput.questions[0].correctAnswer, 'Paris');
  assert.equal(activity.textInput.questions[1].correctAnswer, '4');
  assert.equal(activity.textInput.questions[2].validation.kind, 'validate-later');
});

test('Text Input: split then merge round-trips answers', () => {
  const combined = readExample('text-input-simple.md');
  const { questionMarkdown, answerKeyMarkdown } = splitCombinedMarkdown(combined);
  const merged = mergeQuestionAndAnswerKey(questionMarkdown, answerKeyMarkdown);
  const activity = buildActivityFromMarkdown(merged);
  assert.equal(activity.textInput.questions[0].correctAnswer, 'Paris');
  assert.equal(activity.textInput.questions[1].correctAnswer, '4');
});

test('Text Input: multiple correct answers keep the same question number', () => {
  const combined = readExample('text-input-multiple-answers.md');
  const { answerKeyMarkdown } = splitCombinedMarkdown(combined);
  assert.deepEqual(
    keyValues(answerKeyMarkdown).map(a => a.key),
    ['Question 1', 'Question 1', 'Question 1', 'Question 1']
  );
});

test('MCQ: split strips Correct markers and records labels', () => {
  const combined = readExample('mcq.md');
  const { questionMarkdown, answerKeyMarkdown } = splitCombinedMarkdown(combined);
  const activity = buildActivityFromMarkdown(questionMarkdown);
  assert.equal(detectAnswersPresent(activity), false);
  assert.deepEqual(keyValues(answerKeyMarkdown), [
    { key: 'Question 1', value: 'B' },
  ]);
  assert.doesNotMatch(questionMarkdown, /Correct/i);
});

test('MCQ: multi-select adds Question Options and comma-separated labels', () => {
  const combined = readExample('mcq-2-questions.md');
  const { questionMarkdown, answerKeyMarkdown } = splitCombinedMarkdown(combined);
  assert.deepEqual(keyValues(answerKeyMarkdown), [
    { key: 'Question 1', value: 'B' },
    { key: 'Question 2', value: 'A, C' },
  ]);
  assert.match(questionMarkdown, /__Question Options__[\s\S]*multi-select/);
  const activity = buildActivityFromMarkdown(questionMarkdown);
  assert.equal(detectAnswersPresent(activity), false);
});

test('MCQ: merge assessment example restores correct options', () => {
  const merged = mergeQuestionAndAnswerKey(
    readExample('assessment-mcq.md'),
    readExample('assessment-mcq-answer-key.md')
  );
  const activity = buildActivityFromMarkdown(merged);
  assert.equal(detectAnswersPresent(activity), true);
  const [q1, q2] = activity.mcq.questions;
  const correct = q => q.options.filter(o => o.correct).map(o => o.label).sort();
  assert.deepEqual(correct(q1), ['B']);
  assert.deepEqual(correct(q2), ['A', 'C']);
});

test('FIB: split strips [[blank:answer]] tokens', () => {
  const combined = readExample('fill-in-the-blanks.md');
  const { questionMarkdown, answerKeyMarkdown } = splitCombinedMarkdown(combined);
  assert.match(questionMarkdown, /\[\[blank\]\]/);
  assert.doesNotMatch(questionMarkdown, /\[\[blank:/);
  assert.deepEqual(keyValues(answerKeyMarkdown), [
    { key: 'Blank 1', value: 'fast-moving' },
    { key: 'Blank 2', value: 'advance' },
    { key: 'Blank 3', value: 'coach' },
    { key: 'Blank 4', value: 'scorekeeper' },
  ]);
  assert.match(questionMarkdown, /manager/);
});

test('FIB: merge assessment example restores blank answers', () => {
  const merged = mergeQuestionAndAnswerKey(
    readExample('assessment-fib.md'),
    readExample('assessment-fib-answer-key.md')
  );
  const activity = buildActivityFromMarkdown(merged);
  assert.equal(detectAnswersPresent(activity), true);
  assert.deepEqual(
    activity.fib.blanks.map(b => b.answer),
    ['fast-moving', 'advance', 'coach', 'scorekeeper']
  );
});

test('Matching: split and merge round-trip item answers', () => {
  const combined = readExample('matching.md');
  const { questionMarkdown, answerKeyMarkdown } = splitCombinedMarkdown(combined);
  assert.deepEqual(keyValues(answerKeyMarkdown), [
    { key: 'Item 1', value: 'Discomfort' },
    { key: 'Item 2', value: 'Engagement' },
    { key: 'Item 3', value: 'Tension' },
    { key: 'Item 4', value: 'Frustration' },
    { key: 'Item 5', value: 'Relief' },
  ]);
  const merged = mergeQuestionAndAnswerKey(questionMarkdown, answerKeyMarkdown);
  const activity = buildActivityFromMarkdown(merged);
  assert.deepEqual(
    activity.matching.items.map(it => it.answer),
    ['Discomfort', 'Engagement', 'Tension', 'Frustration', 'Relief']
  );
});

test('Matrix: split removes Suggested Answers', () => {
  const combined = readExample('matrix.md');
  const { questionMarkdown, answerKeyMarkdown } = splitCombinedMarkdown(combined);
  assert.doesNotMatch(questionMarkdown, /__Suggested Answers__/);
  assert.deepEqual(keyValues(answerKeyMarkdown), [
    { key: 'Blaze', value: 'Send to mission' },
    { key: 'Echohawk', value: 'Do not send to mission' },
    { key: 'Moonshade', value: 'Send to mission' },
    { key: 'Silverwind', value: 'Do not send to mission' },
    { key: 'Wind Flare', value: 'Send to mission' },
  ]);
  const activity = buildActivityFromMarkdown(questionMarkdown);
  assert.equal(detectAnswersPresent(activity), false);
});

test('Matrix: merge assessment example restores row answers', () => {
  const merged = mergeQuestionAndAnswerKey(
    readExample('assessment-matrix.md'),
    readExample('assessment-matrix-answer-key.md')
  );
  const activity = buildActivityFromMarkdown(merged);
  assert.deepEqual(activity.matrix.correctColumnIndexByRow, [0, 1, 0, 1, 0]);
});

test('Sort Into Boxes: split strips category assignments', () => {
  const combined = readExample('sort-into-boxes.md');
  const { questionMarkdown, answerKeyMarkdown } = splitCombinedMarkdown(combined);
  assert.doesNotMatch(questionMarkdown, /brilliant!:/);
  assert.deepEqual(keyValues(answerKeyMarkdown), [
    { key: 'That was absolutely brilliant!', value: 'Positive' },
    { key: "I'm really proud of your progress", value: 'Positive' },
    { key: "You clearly didn't even try", value: 'Negative' },
    { key: 'This is the worst idea ever', value: 'Negative' },
  ]);
});

test('Sort Into Boxes: split/merge keeps a colon in the item text', () => {
  const combined = `__Type__

Sort Into Boxes

__Categories__

- Positive
- Negative

__Items__

- Note\\: good: Positive
- Skip this: Negative
`;
  const { questionMarkdown, answerKeyMarkdown } = splitCombinedMarkdown(combined);
  assert.match(questionMarkdown, /Note\\: good/);
  assert.doesNotMatch(questionMarkdown, /Note: good: Positive/);
  assert.deepEqual(keyValues(answerKeyMarkdown), [
    { key: 'Note: good', value: 'Positive' },
    { key: 'Skip this', value: 'Negative' },
  ]);
  const merged = mergeQuestionAndAnswerKey(questionMarkdown, answerKeyMarkdown);
  const activity = buildActivityFromMarkdown(merged);
  const byText = Object.fromEntries(activity.items.map(it => [it.text, it.correct]));
  assert.equal(byText['Note: good'], 'Positive');
  assert.equal(byText['Skip this'], 'Negative');
});

test('Swipe: split converts left/right items into a flat list', () => {
  const combined = readExample('swipe-left-right.md');
  const { questionMarkdown, answerKeyMarkdown } = splitCombinedMarkdown(combined);
  assert.match(questionMarkdown, /__Items__/);
  assert.doesNotMatch(questionMarkdown, /__Left Label Items__/);
  assert.match(answerKeyMarkdown, /Adaptive Leadership/);
  assert.match(answerKeyMarkdown, /Traditional Mgmt/);
  const activity = buildActivityFromMarkdown(questionMarkdown);
  assert.equal(detectAnswersPresent(activity), false);
});

test('merge keeps an empty answer-key scaffold from a question with no answers', () => {
  const question = `__Type__

Text Input

__Practice Question__

Capital of France?

`;
  const { answerKeyMarkdown } = splitCombinedMarkdown(question);
  assert.match(answerKeyMarkdown, /__Type__/);
  assert.match(answerKeyMarkdown, /__Answer Key__/);
  assert.equal(parseAnswerKey(answerKeyMarkdown).answers.length, 0);
  const merged = mergeQuestionAndAnswerKey(question, answerKeyMarkdown);
  assert.match(merged, /Capital of France\?/);
  assert.doesNotMatch(merged, /__Answer Key__/);
});

test('merge rejects an answer key whose type differs from the question', () => {
  const question = readExample('assessment-text-input.md');
  const key = readExample('assessment-mcq-answer-key.md');
  assert.throws(
    () => mergeQuestionAndAnswerKey(question, key),
    /type does not match/
  );
});

test('merge rejects a question with no type when an answer key is present', () => {
  const key = readExample('assessment-text-input-answer-key.md');
  assert.throws(
    () => mergeQuestionAndAnswerKey('Capital of France?', key),
    /missing a type/
  );
});

test('merge rejects answer-key entries that lack a separator', () => {
  const question = readExample('assessment-text-input.md');
  const key = `__Type__

Text Input

__Answer Key__

- Question 1
`;
  assert.throws(
    () => mergeQuestionAndAnswerKey(question, key),
    /missing a separator/
  );
});

test('merge keeps answer-key entries with a separator and an empty value', () => {
  const question = `__Type__

Text Input

__Practice Question__

Capital of France?

__Correct Answers__

- [kind: string]
`;
  const key = `__Type__

Text Input

__Answer Key__

- Question 1:
`;
  const merged = mergeQuestionAndAnswerKey(question, key);
  assert.match(merged, /Capital of France\?/);
  assert.match(merged, /\[kind: string\]/);
});

test('merge rejects non-empty answer-key content with no parseable entries', () => {
  const question = readExample('assessment-text-input.md');
  assert.throws(
    () => mergeQuestionAndAnswerKey(question, 'this is not an answer key'),
    /no parseable entries/
  );
});

test('assessment examples merge then split back to the same key entries', () => {
  const pairs = [
    ['assessment-text-input.md', 'assessment-text-input-answer-key.md'],
    ['assessment-mcq.md', 'assessment-mcq-answer-key.md'],
    ['assessment-fib.md', 'assessment-fib-answer-key.md'],
    ['assessment-matching.md', 'assessment-matching-answer-key.md'],
    ['assessment-matrix.md', 'assessment-matrix-answer-key.md'],
    ['assessment-sort.md', 'assessment-sort-answer-key.md'],
    ['assessment-swipe.md', 'assessment-swipe-answer-key.md'],
  ];
  for (const [questionFile, keyFile] of pairs) {
    const question = readExample(questionFile);
    const key = readExample(keyFile);
    const merged = mergeQuestionAndAnswerKey(question, key);
    const { answerKeyMarkdown } = splitCombinedMarkdown(merged);
    assert.deepEqual(
      keyValues(answerKeyMarkdown),
      keyValues(key),
      `${questionFile} round-trip`
    );
  }
});
