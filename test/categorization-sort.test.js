const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateActivityResultCorrect
} = require('../lib/activity-results-validation');
const { buildScoreJson } = require('../lib/build-score-json');
const { buildActivityReportMarkdown } = require('../lib/build-activity-report');

function sortActivity() {
  return {
    type: 'Sort Into Boxes',
    question: 'Sort each phrase by tone.',
    categories: ['Positive', 'Negative'],
    items: [
      { text: 'That was absolutely brilliant!', correct: 'Positive' },
      { text: 'You clearly didn’t even try', correct: 'Negative' }
    ]
  };
}

test('categorization: a result is correct when selected category matches', () => {
  const activity = sortActivity();
  const correct = { text: 'That was absolutely brilliant!', selected: 'Positive', correct: 'Positive' };
  const wrong = { text: 'You clearly didn’t even try', selected: 'Positive', correct: 'Negative' };
  assert.equal(evaluateActivityResultCorrect(activity, correct, 0), true);
  assert.equal(evaluateActivityResultCorrect(activity, wrong, 1), false);
});

test('categorization: an unplaced item (empty selection) is incorrect', () => {
  const activity = sortActivity();
  const unplaced = { text: 'That was absolutely brilliant!', selected: '', correct: 'Positive' };
  assert.equal(evaluateActivityResultCorrect(activity, unplaced, 0), false);
});

test('categorization: score json counts each placed item against its category', () => {
  const activity = sortActivity();
  const results = [
    { text: 'That was absolutely brilliant!', selected: 'Positive', correct: 'Positive' },
    { text: 'You clearly didn’t even try', selected: 'Positive', correct: 'Negative' }
  ];
  const score = buildScoreJson(activity, results);
  assert.equal(score.totalScore, 1);
  assert.equal(score.maxScore, 2);
  assert.deepEqual(score.breakoutScores, [
    { title: 'That was absolutely brilliant!', score: 1, maxScore: 1 },
    { title: 'You clearly didn’t even try', score: 0, maxScore: 1 }
  ]);
});

test('categorization: report lists each item with candidate vs expected category', () => {
  const activity = sortActivity();
  const results = [
    { text: 'That was absolutely brilliant!', selected: 'Positive', correct: 'Positive' },
    { text: 'You clearly didn’t even try', selected: '', correct: 'Negative' }
  ];
  const md = buildActivityReportMarkdown(activity, results);
  assert.match(md, /\*\*Activity type:\*\* Sort Into Boxes/);
  assert.match(md, /### That was absolutely brilliant!/);
  assert.match(md, /\*\*Candidate's Answer:\*\* Positive/);
  assert.match(md, /\*\*Expected:\*\* Negative/);
  // No answer renders as the shared placeholder, not an empty string.
  assert.match(md, /\*\*Candidate's Answer:\*\* _No answer_/);
  // The old "responses will be listed below" placeholder note is gone.
  assert.doesNotMatch(md, /when this activity records responses/);
});

test('categorization: supports more than two categories', () => {
  const activity = {
    type: 'Sort Into Boxes',
    categories: ['Mammal', 'Bird', 'Reptile'],
    items: [
      { text: 'Dolphin', correct: 'Mammal' },
      { text: 'Eagle', correct: 'Bird' },
      { text: 'Gecko', correct: 'Reptile' }
    ]
  };
  const results = [
    { text: 'Dolphin', selected: 'Mammal', correct: 'Mammal' },
    { text: 'Eagle', selected: 'Reptile', correct: 'Bird' },
    { text: 'Gecko', selected: 'Reptile', correct: 'Reptile' }
  ];
  const score = buildScoreJson(activity, results);
  assert.equal(score.totalScore, 2);
  assert.equal(score.maxScore, 3);
});
