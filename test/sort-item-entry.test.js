const test = require('node:test');
const assert = require('node:assert/strict');

const { parseSortItemEntry } = require('../lib/sort-item-entry');

test('parseSortItemEntry splits at the first colon', () => {
  assert.deepEqual(parseSortItemEntry('Apple: Fruit'), { text: 'Apple', correct: 'Fruit' });
});

test('parseSortItemEntry keeps colons in the category label', () => {
  assert.deepEqual(parseSortItemEntry('Ratio: 1:2'), { text: 'Ratio', correct: '1:2' });
});

test('parseSortItemEntry unescapes \\: and \\\\ in the text', () => {
  assert.deepEqual(parseSortItemEntry('Time 10\\:30 a\\\\b: Morning'), { text: 'Time 10:30 a\\b', correct: 'Morning' });
});

test('parseSortItemEntry keeps LaTeX backslashes in the text', () => {
  assert.deepEqual(
    parseSortItemEntry('$$f(x) = \\sin(x)$$: Derivative is $$\\cos(x)$$'),
    { text: '$$f(x) = \\sin(x)$$', correct: 'Derivative is $$\\cos(x)$$' }
  );
  assert.deepEqual(
    parseSortItemEntry('\\( \\frac{5}{5} \\): Equals 1'),
    { text: '\\( \\frac{5}{5} \\)', correct: 'Equals 1' }
  );
});

test('parseSortItemEntry ignores colons inside math', () => {
  assert.deepEqual(parseSortItemEntry('$$f: A \\to B$$: Function'), { text: '$$f: A \\to B$$', correct: 'Function' });
});

test('parseSortItemEntry keeps \\$ for literal dollars', () => {
  assert.deepEqual(parseSortItemEntry('Costs \\$5: Cheap'), { text: 'Costs \\$5', correct: 'Cheap' });
});
