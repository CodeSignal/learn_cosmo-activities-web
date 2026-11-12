const test = require('node:test');
const assert = require('node:assert/strict');

const { buildScoreJson, scoreScoringGroups } = require('../lib/build-score-json');

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

test('leaves validate-later text input questions out of the score', () => {
  const activity = {
    type: 'Text Input',
    textInput: {
      questions: [{ id: 0, validation: { kind: 'validate-later' } }]
    }
  };
  const results = [{ text: 'Question 1', selected: 'some answer', correct: '' }];
  const score = buildScoreJson(activity, results);
  // Nothing to score automatically: the grader reports 0/0, which /score rejects,
  // so the platform asks a reviewer for a manual score.
  assert.equal(score.totalScore, 0);
  assert.equal(score.maxScore, 0);
  assert.deepEqual(score.breakoutScores, []);
});

test('leaves questions with no correct answer out of the score (explain-your-answer style)', () => {
  const activity = { type: 'Multiple Choice', mcq: { questions: [{ id: 0, isMultiSelect: false }] } };
  const results = [{ text: 'Explain It', selected: 'some text', correct: '' }];
  const score = buildScoreJson(activity, results);
  assert.equal(score.totalScore, 0);
  assert.equal(score.maxScore, 0);
  assert.deepEqual(score.breakoutScores, []);
});

test('every breakout has a positive maxScore when validate-later questions are mixed in', () => {
  const activity = {
    type: 'Text Input',
    textInput: {
      questions: [
        { id: 0, correctAnswer: 'Paris', validation: { kind: 'string', options: {} } },
        { id: 1, validation: { kind: 'validate-later', options: {} } },
        { id: 2, correctAnswer: '4', validation: { kind: 'numeric', options: {} } }
      ]
    }
  };
  const results = [
    { text: 'Question 1', selected: 'Paris', correct: 'Paris' },
    { text: 'Question 2', selected: 'Because it is.', correct: '' },
    { text: 'Question 3', selected: '5', correct: '4' }
  ];
  const score = buildScoreJson(activity, results);
  assert.equal(score.totalScore, 1);
  assert.equal(score.maxScore, 2);
  assert.deepEqual(score.breakoutScores, [
    { title: 'Question 1', score: 1, maxScore: 1 },
    { title: 'Question 3', score: 0, maxScore: 1 }
  ]);
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
    { title: 'Q1', score: 1, maxScore: 1 }
  ]);
});

// -----------------------------------------------------------------------
// Scoring groups
// -----------------------------------------------------------------------

function mcqActivity(count, scoringGroups) {
  const questions = Array.from({ length: count }, (_, id) => ({ id, isMultiSelect: false }));
  return { type: 'Multiple Choice', mcq: { questions }, scoringGroups };
}

function mcqResults(pairs) {
  return pairs.map(([selected, correct], i) => ({ text: `Question ${i + 1}`, selected, correct }));
}

test('a group whose members are all correct earns one point per member', () => {
  const activity = mcqActivity(4, [{ title: 'Questions 1-3', members: [0, 1, 2] }]);
  const results = mcqResults([['A', 'A'], ['C', 'C'], ['B', 'B'], ['D', 'D']]);
  const score = buildScoreJson(activity, results);
  assert.equal(score.totalScore, 4);
  assert.equal(score.maxScore, 4);
  assert.deepEqual(score.breakoutScores, [
    { title: 'Questions 1-3', score: 3, maxScore: 3 },
    { title: 'Question 4', score: 1, maxScore: 1 }
  ]);
});

test('one wrong member makes the whole group 0, and ungrouped questions score as before', () => {
  const activity = mcqActivity(4, [{ title: 'Questions 1-3', members: [0, 1, 2] }]);
  const results = mcqResults([['A', 'A'], ['B', 'C'], ['B', 'B'], ['D', 'D']]);
  const score = buildScoreJson(activity, results);
  assert.equal(score.totalScore, 1);
  assert.equal(score.maxScore, 4);
  assert.deepEqual(score.breakoutScores, [
    { title: 'Questions 1-3', score: 0, maxScore: 3 },
    { title: 'Question 4', score: 1, maxScore: 1 }
  ]);
});

test('an unanswered member counts as wrong', () => {
  const activity = mcqActivity(2, [{ title: 'Questions 1-2', members: [0, 1] }]);
  const score = buildScoreJson(activity, mcqResults([['A', 'A'], ['', 'B']]));
  assert.deepEqual(score.breakoutScores, [{ title: 'Questions 1-2', score: 0, maxScore: 2 }]);
});

test('a group sits where its first member is, and members need not be adjacent', () => {
  const activity = mcqActivity(4, [{ title: 'Question 2, Question 4', members: [1, 3] }]);
  const results = mcqResults([['A', 'A'], ['B', 'B'], ['C', 'D'], ['D', 'D']]);
  const score = buildScoreJson(activity, results);
  assert.deepEqual(score.breakoutScores, [
    { title: 'Question 1', score: 1, maxScore: 1 },
    { title: 'Question 2, Question 4', score: 2, maxScore: 2 },
    { title: 'Question 3', score: 0, maxScore: 1 }
  ]);
  assert.equal(score.totalScore, 3);
  assert.equal(score.maxScore, 4);
});

test('a Matrix group scores all rows together', () => {
  const activity = {
    type: 'Matrix',
    matrix: { rows: ['Cash', 'Inventory', 'Sales'], columns: ['Debit', 'Credit'] },
    scoringGroups: [{ title: 'Rows 1-3', members: [0, 1, 2] }]
  };
  const rows = (selected) => selected.map((sel, i) => ({
    text: `Row ${i + 1}`,
    selected: sel,
    correct: ['Debit', 'Credit', 'Credit'][i]
  }));
  assert.deepEqual(buildScoreJson(activity, rows(['Debit', 'Credit', 'Credit'])), {
    totalScore: 3,
    maxScore: 3,
    breakoutScores: [{ title: 'Rows 1-3', score: 3, maxScore: 3 }]
  });
  assert.deepEqual(buildScoreJson(activity, rows(['Debit', 'Credit', 'Debit'])), {
    totalScore: 0,
    maxScore: 3,
    breakoutScores: [{ title: 'Rows 1-3', score: 0, maxScore: 3 }]
  });
});

function textInputGroupActivity() {
  return {
    type: 'Text Input',
    textInput: {
      questions: [
        { id: 0, correctAnswer: 'Paris', validation: { kind: 'string', options: {} } },
        { id: 1, validation: { kind: 'validate-later', options: {} } },
        { id: 2, correctAnswer: '42', validation: { kind: 'numeric', options: { precision: 2, threshold: 0.01 } } },
        { id: 3, correctAnswer: '7', validation: { kind: 'numeric', options: {} } }
      ]
    },
    scoringGroups: [{ title: 'Questions 1-3', members: [0, 1, 2] }]
  };
}

test('a validate-later member is skipped: the group is worth its scorable members only', () => {
  const results = [
    { text: 'Question 1', selected: 'Paris', correct: 'Paris' },
    { text: 'Question 2', selected: 'Because.', correct: '' },
    { text: 'Question 3', selected: '42.01', correct: '42' },
    { text: 'Question 4', selected: '8', correct: '7' }
  ];
  const score = buildScoreJson(textInputGroupActivity(), results);
  assert.deepEqual(score.breakoutScores, [
    { title: 'Questions 1-3', score: 2, maxScore: 2 },
    { title: 'Question 4', score: 0, maxScore: 1 }
  ]);
  assert.equal(score.totalScore, 2);
  assert.equal(score.maxScore, 3);
});

test('a member with no answer-key entry is skipped like a validate-later one', () => {
  const activity = mcqActivity(3, [{ title: 'Questions 1-3', members: [0, 1, 2] }]);
  const results = mcqResults([['A', 'A'], ['B', ''], ['C', 'C']]);
  assert.deepEqual(buildScoreJson(activity, results).breakoutScores, [
    { title: 'Questions 1-3', score: 2, maxScore: 2 }
  ]);
});

test('a group with no scorable member is left out, so every breakout keeps a positive maxScore', () => {
  const activity = {
    type: 'Text Input',
    textInput: {
      questions: [
        { id: 0, validation: { kind: 'validate-later', options: {} } },
        { id: 1, validation: { kind: 'validate-later', options: {} } },
        { id: 2, correctAnswer: '4', validation: { kind: 'numeric', options: {} } }
      ]
    },
    scoringGroups: [{ title: 'Questions 1-2', members: [0, 1] }]
  };
  const results = [
    { text: 'Question 1', selected: 'a', correct: '' },
    { text: 'Question 2', selected: 'b', correct: '' },
    { text: 'Question 3', selected: '4', correct: '4' }
  ];
  assert.deepEqual(buildScoreJson(activity, results), {
    totalScore: 1,
    maxScore: 1,
    breakoutScores: [{ title: 'Question 3', score: 1, maxScore: 1 }]
  });

  // With nothing else to score, the task reports 0/0 for manual scoring, as before.
  assert.deepEqual(buildScoreJson(activity, results.slice(0, 2)), {
    totalScore: 0,
    maxScore: 0,
    breakoutScores: []
  });
});

test('scoreScoringGroups reports scorable and correct members per group', () => {
  const results = [
    { text: 'Question 1', selected: 'Paris', correct: 'Paris' },
    { text: 'Question 2', selected: 'Because.', correct: '' },
    { text: 'Question 3', selected: '41', correct: '42' },
    { text: 'Question 4', selected: '7', correct: '7' }
  ];
  const [groupScore] = scoreScoringGroups(textInputGroupActivity(), results);
  assert.deepEqual(groupScore.scorable, [0, 2]);
  assert.deepEqual(groupScore.correct, [0]);
  assert.equal(groupScore.score, 0);
  assert.equal(groupScore.maxScore, 2);
  assert.deepEqual(scoreScoringGroups(mcqActivity(1), mcqResults([['A', 'A']])), []);
});
