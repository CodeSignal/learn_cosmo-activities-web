const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// Characterization of the Text Input number field markup, in the style of
// a11y-characterization.test.js. The parsing itself is covered by number-answer.test.js.

test('number fields are text inputs with a decimal keypad, so formatted numbers are kept', () => {
  const src = read('public/modules/text-input.js');
  assert.doesNotMatch(src, /type\s*=\s*isNumeric\s*\?\s*'number'/, 'no <input type=number> for numeric kinds');
  assert.doesNotMatch(src, /\.type\s*=\s*'number'/);
  assert.match(src, /inputMode\s*=\s*'decimal'/);

  const css = read('public/modules/text-input.css');
  assert.doesNotMatch(css, /\[type="number"\]/, 'no styles left for number-input spinners');
});

test('number fields read answers with the shared parser', () => {
  const src = read('public/modules/text-input.js');
  assert.match(src, /from '\.\.\/utils\/number-answer\.js'/);
  assert.match(src, /parseNumberAnswer\(/);
  // Practice mode reads answer keys the way the scorer does (lib/text-input-validation.js)
  assert.doesNotMatch(src, /parseNumberAnswer\(correctAnswer/, 'keys are read with parseNumberAnswerKey');
  assert.equal(src.match(/parseNumberAnswerKey\(correctAnswer/g)?.length, 3, 'all three number kinds');
  assert.doesNotMatch(src, /replace\(',',\s*'\.'\)/, 'no first-comma-to-dot rewrite');
});

test('unreadable numbers get a polite live message linked to the field', () => {
  const src = read('public/modules/text-input.js');
  assert.match(src, /getNumberFormatMessage\(/);
  assert.match(src, /setAttribute\('aria-live',\s*'polite'\)/);
  assert.match(src, /className = 'activity-error-text body-small text-input-format-message'/);
  assert.match(src, /-format-message`/);
  assert.match(src, /setControlInvalid\(input,\s*describedBy\)/);
  assert.match(src, /addEventListener\('change'/, 'the message appears when the candidate leaves the field');
});

test('the format message checks every accepted answer format, not only the first', () => {
  const src = read('public/modules/text-input.js');
  const fn = src.match(/function getAnswerFormatMessage\(question\) \{[\s\S]*?\n  \}/)?.[0] || '';
  assert.match(fn, /question\.answerFormats/);
  assert.match(fn, /messages\.every\(Boolean\)/);
  assert.match(src, /const text = getAnswerFormatMessage\(question\)/);
  assert.match(read('lib/parse-question.js'), /currentQuestion\.answerFormats = parsed\.answerFormats/);
});
