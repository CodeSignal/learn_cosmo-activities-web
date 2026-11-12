const test = require('node:test');
const assert = require('node:assert/strict');

const { parseScoringGroups, scoringGroupMemberNoun } = require('../lib/scoring-groups');

const mcq = { type: 'Multiple Choice', mcq: { questions: [{}, {}, {}, {}] } };
const textInput = { type: 'Text Input', textInput: { questions: [{}, {}, {}, {}, {}] } };
const matrix = { type: 'Matrix', matrix: { rows: ['Cash', 'Inventory', 'Sales'], columns: ['Debit', 'Credit'] } };

test('no section or an empty section means no groups', () => {
  assert.deepEqual(parseScoringGroups(undefined, mcq), []);
  assert.deepEqual(parseScoringGroups([], mcq), []);
  assert.deepEqual(parseScoringGroups(['', '  '], mcq), []);
});

test('reads a range of questions as one group, titled as written', () => {
  assert.deepEqual(parseScoringGroups(['Questions 1-3'], mcq), [
    { title: 'Questions 1-3', members: [0, 1, 2] }
  ]);
});

test('reads comma-separated questions and ranges, in any order', () => {
  assert.deepEqual(parseScoringGroups(['Question 5, Questions 1-2'], textInput), [
    { title: 'Question 5, Questions 1-2', members: [0, 1, 4] }
  ]);
});

test('reads several groups', () => {
  assert.deepEqual(parseScoringGroups(['Questions 1-2', 'Question 3, Question 5'], textInput), [
    { title: 'Questions 1-2', members: [0, 1] },
    { title: 'Question 3, Question 5', members: [2, 4] }
  ]);
});

test('accepts singular or plural nouns, any case, spaces and an en dash in ranges', () => {
  assert.deepEqual(parseScoringGroups(['question 1 - 2'], mcq)[0].members, [0, 1]);
  assert.deepEqual(parseScoringGroups(['QUESTIONS 4'], mcq)[0].members, [3]);
  assert.deepEqual(parseScoringGroups(['Questions 2–4'], mcq)[0].members, [1, 2, 3]);
});

test('Matrix groups name rows', () => {
  assert.deepEqual(parseScoringGroups(['Rows 1-3'], matrix), [{ title: 'Rows 1-3', members: [0, 1, 2] }]);
  assert.deepEqual(parseScoringGroups(['Row 1, Row 3'], matrix)[0].members, [0, 2]);
});

test('a single-member group is allowed', () => {
  assert.deepEqual(parseScoringGroups(['Question 2'], mcq), [{ title: 'Question 2', members: [1] }]);
});

test('rejects a member written with the wrong noun or as a label', () => {
  assert.throws(() => parseScoringGroups(['Row 1'], mcq), /cannot read "Row 1"\. Write "Question 2" or "Questions 1-3"/);
  assert.throws(() => parseScoringGroups(['Question 1'], matrix), /Write "Row 2" or "Rows 1-3"/);
  assert.throws(() => parseScoringGroups(['Cash, Inventory'], matrix), /cannot read "Cash"/);
  assert.throws(() => parseScoringGroups(['Q1-3'], mcq), /cannot read "Q1-3"/);
});

test('rejects members the activity does not have', () => {
  assert.throws(() => parseScoringGroups(['Questions 3-5'], mcq), /"Questions 3-5" is outside questions 1-4/);
  assert.throws(() => parseScoringGroups(['Question 0'], mcq), /outside questions 1-4/);
  assert.throws(() => parseScoringGroups(['Rows 4'], matrix), /"Rows 4" is outside rows 1-3/);
});

test('rejects a range that counts down', () => {
  assert.throws(() => parseScoringGroups(['Rows 3-1'], matrix), /"Rows 3-1" counts down/);
});

test('rejects a member listed twice, in one group or in two', () => {
  assert.throws(() => parseScoringGroups(['Questions 1-2', 'Question 2'], mcq), /Question 2 is already in a group/);
  assert.throws(() => parseScoringGroups(['Questions 1-3, Question 2'], mcq), /Question 2 is already in a group/);
});

test('rejects a group with no members', () => {
  assert.throws(() => parseScoringGroups([','], mcq), /lists no questions/);
});

test('rejects activity types without groups', () => {
  const fib = { type: 'Fill In The Blanks', fib: { blanks: [{}, {}] } };
  assert.throws(() => parseScoringGroups(['Blanks 1-2'], fib), /works with Text Input, Multiple Choice and Matrix, not Fill In The Blanks/);
});

test('scoringGroupMemberNoun names the members for reports', () => {
  assert.equal(scoringGroupMemberNoun(mcq), 'question');
  assert.equal(scoringGroupMemberNoun(textInput), 'question');
  assert.equal(scoringGroupMemberNoun(matrix), 'row');
  assert.equal(scoringGroupMemberNoun({ type: 'Matching' }), null);
});
