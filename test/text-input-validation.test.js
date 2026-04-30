const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseValidationOptions,
  parseTextInputAnswerItems,
  validateTextInputString,
  validateTextInputNumeric,
  validateTextInputNumericWithUnits,
  validateTextInputNumericWithCurrency,
  getTextInputValidationCandidates,
  validateTextInputAnswer
} = require('../lib/text-input-validation');

test('parseValidationOptions parses answer with kind/options', () => {
  const parsed = parseValidationOptions('Paris [kind: string] [options: caseSensitive=false,fuzzy=false]');
  assert.equal(parsed.correctAnswer, 'Paris');
  assert.equal(parsed.validation.kind, 'string');
  assert.deepEqual(parsed.validation.options, { caseSensitive: false, fuzzy: false });
});

test('parseValidationOptions supports validate-later without answer text', () => {
  const parsed = parseValidationOptions('[kind: validate-later]');
  assert.equal(parsed.correctAnswer, '');
  assert.equal(parsed.validation.kind, 'validate-later');
  assert.deepEqual(parsed.validation.options, {});
});

test('parseTextInputAnswerItems keeps all accepted answers', () => {
  const parsed = parseTextInputAnswerItems([
    'USA [kind: string] [options: caseSensitive=false]',
    'U.S.A. [kind: string] [options: caseSensitive=false]',
    'US [kind: string] [options: caseSensitive=false]'
  ]);

  assert.equal(parsed.correctAnswers.length, 3);
  assert.equal(parsed.correctAnswer, 'USA');
  assert.equal(parsed.validation.kind, 'string');
});

test('validateTextInputString supports case-insensitive matching', () => {
  assert.equal(validateTextInputString('PARIS', 'Paris', { caseSensitive: false }), true);
  assert.equal(validateTextInputString('PARIS', 'Paris', { caseSensitive: true }), false);
});

test('validateTextInputString supports fuzzy matching and punctuation normalization', () => {
  assert.equal(validateTextInputString("dont repeat yourself", "Don't Repeat Yourself", { fuzzy: true }), true);
  assert.equal(validateTextInputString('accomxodation', 'accommodation', { fuzzy: 0.95 }), false);
  assert.equal(validateTextInputString('acommodation', 'accommodation', { fuzzy: 0.7 }), true);
});

test('validateTextInputNumeric respects threshold and precision', () => {
  assert.equal(validateTextInputNumeric('3.141', '3.14', { threshold: 0.01, precision: 2 }), true);
  assert.equal(validateTextInputNumeric('3.20', '3.14', { threshold: 0.01, precision: 2 }), false);
  assert.equal(validateTextInputNumeric('abc', '3.14', { threshold: 0.01, precision: 2 }), false);
});

test('validateTextInputNumericWithUnits accepts valid units and decimal commas', () => {
  const options = { threshold: 0.01, units: ['kg', 'g'] };
  assert.equal(validateTextInputNumericWithUnits('1 kg', '1 kg', options), true);
  assert.equal(validateTextInputNumericWithUnits('1,0 kg', '1 kg', options), true);
  assert.equal(validateTextInputNumericWithUnits('2 kg', '1 kg', options), false);
});

test('validateTextInputNumericWithCurrency accepts currency formatting', () => {
  const options = { threshold: 0.01, currency: '$' };
  assert.equal(validateTextInputNumericWithCurrency('$4.50', '4.50', options), true);
  assert.equal(validateTextInputNumericWithCurrency('4,50$', '4.50', options), true);
  assert.equal(validateTextInputNumericWithCurrency('$5.00', '4.50', options), false);
});

test('getTextInputValidationCandidates supports legacy and modern shapes', () => {
  const legacy = getTextInputValidationCandidates({
    correctAnswer: 'Paris',
    validation: { kind: 'string', options: { caseSensitive: false } }
  });
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].correctAnswer, 'Paris');

  const modern = getTextInputValidationCandidates({
    correctAnswers: [
      { correctAnswer: 'USA', validation: { kind: 'string', options: {} } },
      { correctAnswer: 'US', validation: { kind: 'string', options: {} } }
    ]
  });
  assert.equal(modern.length, 2);
  assert.deepEqual(modern.map(c => c.correctAnswer), ['USA', 'US']);
});

test('validateTextInputAnswer accepts any configured correct answer', () => {
  const question = {
    correctAnswers: [
      { correctAnswer: 'USA', validation: { kind: 'string', options: { caseSensitive: false } } },
      { correctAnswer: 'U.S.A.', validation: { kind: 'string', options: { caseSensitive: false } } },
      { correctAnswer: 'US', validation: { kind: 'string', options: { caseSensitive: false } } }
    ]
  };

  assert.equal(validateTextInputAnswer(question, 'usa'), true);
  assert.equal(validateTextInputAnswer(question, 'U.S.A.'), true);
  assert.equal(validateTextInputAnswer(question, 'United States'), false);
});

test('validateTextInputAnswer handles validate-later semantics', () => {
  const question = {
    correctAnswers: [{ correctAnswer: '', validation: { kind: 'validate-later', options: {} } }]
  };

  assert.equal(validateTextInputAnswer(question, ''), false);
  assert.equal(validateTextInputAnswer(question, 'Any response'), null);
});

test('validateTextInputAnswer supports mixed answer types', () => {
  const question = {
    correctAnswers: [
      { correctAnswer: '0.5', validation: { kind: 'numeric', options: { threshold: 0.0001, precision: 4 } } },
      { correctAnswer: '.5', validation: { kind: 'numeric', options: { threshold: 0.0001, precision: 4 } } }
    ]
  };

  assert.equal(validateTextInputAnswer(question, '0.5'), true);
  assert.equal(validateTextInputAnswer(question, '.5'), true);
  assert.equal(validateTextInputAnswer(question, '0.6'), false);
});
