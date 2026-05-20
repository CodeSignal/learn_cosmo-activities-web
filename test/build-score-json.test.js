const test = require('node:test');
const assert = require('node:assert/strict');

const { buildScoreJson } = require('../lib/build-score-json');

test('scores a single correct MCQ answer', () => {
  const activity = { type: 'Multiple Choice', mcq: { questions: [{ id: 0, isMultiSelect: false }] } };
  const results = [{ text: 'Question 1', selected: 'A', correct: 'A' }];
  const score = buildScoreJson(activity, results);
  assert.equal(score.totalScore, 1);
  assert.equal(score.maxScore, 1);
  assert.deepEqual(score.breakoutScores, [{ title: 'Question 1', score: 1, maxScore: 1 }]);
});

test('scores a single incorrect MCQ answer', () => {
  const activity = { type: 'Multiple Choice', mcq: { questions: [{ id: 0, isMultiSelect: false }] } };
  const results = [{ text: 'Question 1', selected: 'B', correct: 'A' }];
  const score = buildScoreJson(activity, results);
  assert.equal(score.totalScore, 0);
  assert.equal(score.maxScore, 1);
  assert.deepEqual(score.breakoutScores, [{ title: 'Question 1', score: 0, maxScore: 1 }]);
});

test('scores multiple MCQ questions', () => {
  const activity = {
    type: 'Multiple Choice',
    mcq: { questions: [{ id: 0, isMultiSelect: false }, { id: 1, isMultiSelect: false }] }
  };
  const results = [
    { text: 'Question 1', selected: 'A', correct: 'A' },
    { text: 'Question 2', selected: 'B', correct: 'C' }
  ];
  const score = buildScoreJson(activity, results);
  assert.equal(score.totalScore, 1);
  assert.equal(score.maxScore, 2);
  assert.deepEqual(score.breakoutScores, [
    { title: 'Question 1', score: 1, maxScore: 1 },
    { title: 'Question 2', score: 0, maxScore: 1 }
  ]);
});

test('validate-later text input questions are unscorable (score 0, maxScore 0)', () => {
  const activity = {
    type: 'Text Input',
    textInput: {
      questions: [{ id: 0, validation: { kind: 'validate-later' } }]
    }
  };
  const results = [{ text: 'Question 1', selected: 'some answer', correct: '' }];
  const score = buildScoreJson(activity, results);
  assert.equal(score.totalScore, 0);
  assert.equal(score.maxScore, 0);
  assert.deepEqual(score.breakoutScores, [{ title: 'Question 1', score: 0, maxScore: 0 }]);
});

test('questions with no correct answer are unscorable (explain-your-answer style)', () => {
  const activity = { type: 'Multiple Choice', mcq: { questions: [{ id: 0, isMultiSelect: false }] } };
  const results = [{ text: 'Explain It', selected: 'some text', correct: '' }];
  const score = buildScoreJson(activity, results);
  assert.equal(score.totalScore, 0);
  assert.equal(score.maxScore, 0);
  assert.deepEqual(score.breakoutScores, [{ title: 'Explain It', score: 0, maxScore: 0 }]);
});

test('falls back to "Question N" title when result has no text', () => {
  const activity = { type: 'Multiple Choice', mcq: { questions: [{ id: 0, isMultiSelect: false }] } };
  const results = [{ selected: 'A', correct: 'A' }];
  const score = buildScoreJson(activity, results);
  assert.deepEqual(score.breakoutScores, [{ title: 'Question 1', score: 1, maxScore: 1 }]);
});

test('returns empty scores for empty results', () => {
  const score = buildScoreJson(null, []);
  assert.equal(score.totalScore, 0);
  assert.equal(score.maxScore, 0);
  assert.deepEqual(score.breakoutScores, []);
});

test('mixed scorable and unscorable questions', () => {
  const activity = {
    type: 'Multiple Choice',
    mcq: {
      questions: [
        { id: 0, isMultiSelect: false },
        { id: 1, isMultiSelect: false }
      ]
    }
  };
  const results = [
    { text: 'Q1', selected: 'A', correct: 'A' },
    { text: 'Q2 - Explain', selected: 'some thoughts', correct: '' }
  ];
  const score = buildScoreJson(activity, results);
  assert.equal(score.totalScore, 1);
  assert.equal(score.maxScore, 1);
  assert.deepEqual(score.breakoutScores, [
    { title: 'Q1', score: 1, maxScore: 1 },
    { title: 'Q2 - Explain', score: 0, maxScore: 0 }
  ]);
});
