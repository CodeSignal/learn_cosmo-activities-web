const test = require('node:test');
const assert = require('node:assert/strict');

const {
  questionIndexFromOrderedResult,
  arraysEqual,
  parseCommaSeparatedLabels,
  evaluateMcqSelection,
  evaluateMatrixResult,
  evaluateExactMatchResult,
  evaluateActivityResultCorrect,
  isTextInputResultValidateLater,
  countValidateLaterTextInputResults
} = require('../lib/activity-results-validation');

test('questionIndexFromOrderedResult prefers result order index', () => {
  assert.equal(questionIndexFromOrderedResult({ text: 'Question 2' }, 0, 3), 0);
  assert.equal(questionIndexFromOrderedResult({ text: 'Question 2' }, 1, 3), 1);
});

test('questionIndexFromOrderedResult parses legacy Question N label when index is out of range', () => {
  assert.equal(questionIndexFromOrderedResult({ text: 'Question 1' }, 99, 3), 0);
  assert.equal(questionIndexFromOrderedResult({ text: 'Question 3' }, 3, 3), 2);
  assert.equal(questionIndexFromOrderedResult({ text: 'Custom' }, 0, 1), 0);
  assert.equal(questionIndexFromOrderedResult({ text: 'Custom' }, 1, 2), 1);
  assert.equal(questionIndexFromOrderedResult({ text: 'Custom' }, 5, 2), -1);
});

test('arraysEqual compares sorted multiset equality', () => {
  assert.equal(arraysEqual(['B', 'A'], ['A', 'B']), true);
  assert.equal(arraysEqual(['A'], ['A', 'B']), false);
});

test('parseCommaSeparatedLabels trims and drops empties', () => {
  assert.deepEqual(parseCommaSeparatedLabels('A, B ,'), ['A', 'B']);
});

test('evaluateMcqSelection all mode requires exact set', () => {
  const q = { isMultiSelect: true, multiSelectMode: 'all' };
  assert.equal(evaluateMcqSelection(['A', 'B'], ['B', 'A'], q), true);
  assert.equal(evaluateMcqSelection(['A'], ['A', 'B'], q), false);
  assert.equal(evaluateMcqSelection(['A', 'B', 'C'], ['A', 'B'], q), false);
});

test('evaluateMcqSelection any mode allows subset of correct only', () => {
  const q = { isMultiSelect: true, multiSelectMode: 'any' };
  assert.equal(evaluateMcqSelection(['A'], ['A', 'B'], q), true);
  assert.equal(evaluateMcqSelection(['A', 'B'], ['A', 'B'], q), true);
  assert.equal(evaluateMcqSelection(['C'], ['A', 'B'], q), false);
  assert.equal(evaluateMcqSelection(['A', 'C'], ['A', 'B'], q), false);
  assert.equal(evaluateMcqSelection([], ['A'], q), false);
});

test('evaluateMcqSelection single-select uses sorted equality', () => {
  const q = { isMultiSelect: false };
  assert.equal(evaluateMcqSelection(['D'], ['D'], q), true);
  assert.equal(evaluateMcqSelection(['D'], ['C'], q), false);
});

test('evaluateMatrixResult requires non-empty trimmed equality', () => {
  assert.equal(evaluateMatrixResult('  Col A  ', 'Col A'), true);
  assert.equal(evaluateMatrixResult('', 'Col A'), false);
  assert.equal(evaluateMatrixResult('Col A', 'Col B'), false);
});

test('evaluateExactMatchResult is strict string equality', () => {
  assert.equal(evaluateExactMatchResult('x', 'x'), true);
  assert.equal(evaluateExactMatchResult(' x', 'x'), false);
});

test('evaluateActivityResultCorrect MCQ with activity and fallback', () => {
  const activity = {
    type: 'Multiple Choice',
    mcq: {
      questions: [
        {
          id: 0,
          isMultiSelect: true,
          multiSelectMode: 'any',
          options: []
        }
      ]
    }
  };
  const r0 = { text: 'Q1', selected: 'A', correct: 'A,B' };
  assert.equal(evaluateActivityResultCorrect(activity, r0, 0), true);

  const rWrong = { text: 'Q1', selected: 'A, C', correct: 'A,B' };
  assert.equal(evaluateActivityResultCorrect(activity, rWrong, 0), false);

  const noQuestion = { text: 'Q1', selected: 'B, A', correct: 'A, B' };
  assert.equal(evaluateActivityResultCorrect({ type: 'Multiple Choice', mcq: { questions: [] } }, noQuestion, 0), true);
});

test('evaluateActivityResultCorrect text input delegates to text-input validation', () => {
  const activity = {
    type: 'Text Input',
    textInput: {
      questions: [
        {
          id: 0,
          correctAnswers: [
            { correctAnswer: 'yes', validation: { kind: 'string', options: { caseSensitive: false } } },
            { correctAnswer: 'y', validation: { kind: 'string', options: { caseSensitive: false } } }
          ],
          correctAnswer: 'yes',
          validation: { kind: 'string', options: { caseSensitive: false } }
        }
      ]
    }
  };
  assert.equal(evaluateActivityResultCorrect(activity, { text: 'Q1', selected: 'YES', correct: 'yes' }, 0), true);
  assert.equal(evaluateActivityResultCorrect(activity, { text: 'Q1', selected: 'no', correct: 'yes' }, 0), false);
});

test('isTextInputResultValidateLater and count helper', () => {
  const activity = {
    type: 'Text Input',
    textInput: {
      questions: [
        { id: 0, validation: { kind: 'string' } },
        { id: 1, validation: { kind: 'validate-later' } }
      ]
    }
  };
  const results = [
    { text: 'Question 1', selected: 'a', correct: 'a' },
    { text: 'Question 2', selected: 'b', correct: '' }
  ];
  assert.equal(isTextInputResultValidateLater(activity, results[0], 0), false);
  assert.equal(isTextInputResultValidateLater(activity, results[1], 1), true);
  assert.equal(countValidateLaterTextInputResults(activity, results), 1);
});

test('evaluateActivityResultCorrect fill-in-the-blanks style uses exact match', () => {
  const activity = { type: 'Fill in the blanks' };
  assert.equal(
    evaluateActivityResultCorrect(activity, { selected: 'Paris', correct: 'Paris' }, 0),
    true
  );
  assert.equal(
    evaluateActivityResultCorrect(activity, { selected: 'paris', correct: 'Paris' }, 0),
    false
  );
});

test('evaluateActivityResultCorrect matching style uses exact match', () => {
  const activity = { type: 'Matching' };
  assert.equal(
    evaluateActivityResultCorrect(activity, { selected: 'Answer A', correct: 'Answer A' }, 0),
    true
  );
});
