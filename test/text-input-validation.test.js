const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  parseValidationOptions,
  parseTextInputAnswerItems,
  validateTextInputString,
  validateTextInputNumeric,
  validateTextInputNumericWithUnits,
  validateTextInputNumericWithCurrency,
  isWithinThreshold,
  resolveThreshold,
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

test('parseValidationOptions supports multiLine on validate-later', () => {
  const parsed = parseValidationOptions('[kind: validate-later] [options: multiLine=true]');
  assert.equal(parsed.correctAnswer, '');
  assert.equal(parsed.validation.kind, 'validate-later');
  assert.deepEqual(parsed.validation.options, { multiLine: true });
});

test('parseValidationOptions keeps repeatable and itemLabel on validate-later', () => {
  const parsed = parseValidationOptions('[kind: validate-later] [options: multiLine=true,repeatable=true,itemLabel=Defect]');
  assert.equal(parsed.correctAnswer, '');
  assert.equal(parsed.validation.kind, 'validate-later');
  assert.deepEqual(parsed.validation.options, { multiLine: true, repeatable: true, itemLabel: 'Defect' });
});

test('parseTextInputAnswerItems treats standalone options as metadata', () => {
  const parsed = parseTextInputAnswerItems([
    '[options: multiLine=true]'
  ]);

  assert.equal(parsed.correctAnswer, '');
  assert.equal(parsed.correctAnswers.length, 0);
  assert.equal(parsed.validation.kind, 'string');
  assert.deepEqual(parsed.validation.options, { multiLine: true });
});

test('parseTextInputAnswerItems keeps kind/options when answer text is stripped', () => {
  const parsed = parseTextInputAnswerItems([
    '[kind: string] [options: multiLine=true]'
  ]);

  assert.equal(parsed.correctAnswer, '');
  assert.equal(parsed.correctAnswers.length, 0);
  assert.equal(parsed.validation.kind, 'string');
  assert.deepEqual(parsed.validation.options, { multiLine: true });
});

test('parseTextInputAnswerItems keeps repeatable options when answer text is stripped', () => {
  const parsed = parseTextInputAnswerItems([
    '[kind: string] [options: multiLine=true,repeatable=true,itemLabel=Defect]'
  ]);

  assert.equal(parsed.correctAnswer, '');
  assert.equal(parsed.correctAnswers.length, 0);
  assert.equal(parsed.validation.kind, 'string');
  assert.deepEqual(parsed.validation.options, {
    multiLine: true,
    repeatable: true,
    itemLabel: 'Defect'
  });
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

test('validateTextInputString ignoreWhitespace defaults off', () => {
  assert.equal(validateTextInputString('s + 3', 's+3', { caseSensitive: true, fuzzy: false }), false);
});

test('validateTextInputString ignoreWhitespace strips all whitespace for comparison', () => {
  const opts = { caseSensitive: true, fuzzy: false, ignoreWhitespace: true };
  assert.equal(validateTextInputString('s + 3', 's+3', opts), true);
  assert.equal(validateTextInputString('  s\n+\t3  ', 's+3', opts), true);
  assert.equal(validateTextInputString('s + 4', 's+3', opts), false);
});

test('parseValidationOptions parses ignoreWhitespace option', () => {
  const parsed = parseValidationOptions(
    's+3 [kind: string] [options: caseSensitive=true,fuzzy=false,ignoreWhitespace=true]'
  );
  assert.equal(parsed.correctAnswer, 's+3');
  assert.equal(parsed.validation.options.ignoreWhitespace, true);
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

test('validateTextInputNumeric accepts an answer exactly one threshold away', () => {
  // In floating point, 0.31 - 0.3 is 0.010000000000000009: a hair above 0.01.
  assert.equal(validateTextInputNumeric('0.31', '0.3', { threshold: 0.01, precision: 2 }), true);
  assert.equal(validateTextInputNumeric('0.29', '0.3', { threshold: 0.01, precision: 2 }), true);
  assert.equal(validateTextInputNumeric('1.1', '1', { threshold: 0.1, precision: 1 }), true);
  assert.equal(
    validateTextInputNumeric('123456.789013', '123456.789012', { threshold: 0.000001, precision: 6 }),
    true
  );
});

test('validateTextInputNumeric rejects an answer two thresholds away', () => {
  assert.equal(validateTextInputNumeric('0.32', '0.3', { threshold: 0.01, precision: 2 }), false);
  assert.equal(
    validateTextInputNumeric('123456.789014', '123456.789012', { threshold: 0.000001, precision: 6 }),
    false
  );
});

test('validateTextInputNumeric with threshold 0 needs an exact match after rounding', () => {
  assert.equal(validateTextInputNumeric('0.30', '0.3', { threshold: 0, precision: 2 }), true);
  assert.equal(validateTextInputNumeric('0.304', '0.3', { threshold: 0, precision: 2 }), true);
  assert.equal(validateTextInputNumeric('0.31', '0.3', { threshold: 0, precision: 2 }), false);
});

test('validateTextInputNumericWithUnits and WithCurrency accept an answer exactly one threshold away', () => {
  const units = { threshold: 0.01, units: ['kg'] };
  assert.equal(validateTextInputNumericWithUnits('1.01 kg', '1 kg', units), true);
  assert.equal(validateTextInputNumericWithUnits('1.02 kg', '1 kg', units), false);

  const currency = { threshold: 0.01, currency: '$' };
  assert.equal(validateTextInputNumericWithCurrency('$0.99', '1.00', currency), true);
  assert.equal(validateTextInputNumericWithCurrency('$1234567.90', '1234567.89', currency), true);
  assert.equal(validateTextInputNumericWithCurrency('$1234567.91', '1234567.89', currency), false);
});

test('numeric validators reject answers that parse or round to Infinity', () => {
  // parseFloat reads "Infinity" and "1e999" as Infinity, and rounding 1e307 to two decimals
  // overflows to it. The slack grows with the numbers compared, so Infinity <= Infinity held.
  const options = { threshold: 0.1, precision: 2 };
  for (const answer of ['Infinity', '-Infinity', '1e999', '1e307']) {
    assert.equal(validateTextInputNumeric(answer, '3.14', options), false, answer);
  }
  assert.equal(validateTextInputNumeric('Infinity', 'Infinity', options), false);
  assert.equal(validateTextInputNumericWithUnits('Infinity kg', '1 kg', { threshold: 0.01, units: ['kg'] }), false);
  assert.equal(validateTextInputNumericWithCurrency('$Infinity', '1.00', { threshold: 0.01, currency: '$' }), false);
});

function loadPracticeModeIsWithinThreshold() {
  // The practice-mode copy is a closure inside initTextInput; evaluate its source directly.
  const src = fs.readFileSync(path.join(__dirname, '../public/modules/text-input.js'), 'utf8');
  const start = src.indexOf('function isWithinThreshold(');
  assert.notEqual(start, -1, 'missing function isWithinThreshold');
  const end = src.indexOf('\n  function ', start + 1);
  return new Function(`${src.slice(start, end === -1 ? src.length : end)}\nreturn isWithinThreshold;`)();
}

test('practice mode compares numbers with the same tolerance as the scorer', () => {
  const practice = loadPracticeModeIsWithinThreshold();
  const cases = [
    [0.31, 0.3, 0.01, true],
    [0.29, 0.3, 0.01, true],
    [0.32, 0.3, 0.01, false],
    [0.31, 0.3, 0, false],
    [0.3, 0.3, 0, true],
    [123456.789013, 123456.789012, 0.000001, true],
    [123456.789014, 123456.789012, 0.000001, false],
    [Infinity, 3.14, 0.1, false],
    [-Infinity, 3.14, 0.1, false],
    [3.14, Infinity, 0.1, false],
    [Infinity, Infinity, 0.1, false],
    [Infinity, Infinity, 0, false],
    [NaN, 3.14, 0.1, false]
  ];
  for (const [a, b, threshold, expected] of cases) {
    assert.equal(isWithinThreshold(a, b, threshold), expected, `scorer: ${a} vs ${b} at ${threshold}`);
    assert.equal(practice(a, b, threshold), expected, `practice: ${a} vs ${b} at ${threshold}`);
  }
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

// -----------------------------------------------------------------------
// Percentage thresholds
// -----------------------------------------------------------------------

test('resolveThreshold leaves a number threshold as it is', () => {
  assert.equal(resolveThreshold(0.01, 50), 0.01);
  assert.equal(resolveThreshold(0, 50), 0);
  assert.equal(resolveThreshold(10, -50), 10);
});

test('resolveThreshold turns a percentage into that share of the key', () => {
  assert.equal(resolveThreshold('20%', 50), 10);
  assert.equal(resolveThreshold('20%', -50), 10);
  assert.equal(resolveThreshold('12.5%', 8), 1);
  assert.equal(resolveThreshold('.5%', 200), 1);
  assert.equal(resolveThreshold(' 20 % ', 50), 10);
  assert.equal(resolveThreshold('20%', 0), 0);
  assert.equal(resolveThreshold('0%', 50), 0);
});

test('resolveThreshold returns NaN for a string that is not a percentage', () => {
  for (const threshold of ['abc%', '%', '20%%', '-20%', '20 percent', '20', '']) {
    assert.ok(Number.isNaN(resolveThreshold(threshold, 50)), JSON.stringify(threshold));
  }
});

test('validateTextInputNumeric with threshold=20% accepts answers within 20% of the key, inclusive', () => {
  const options = { threshold: '20%', precision: 2 };
  assert.equal(validateTextInputNumeric('50', '50', options), true);
  assert.equal(validateTextInputNumeric('60', '50', options), true);
  assert.equal(validateTextInputNumeric('40', '50', options), true);
  assert.equal(validateTextInputNumeric('60.01', '50', options), false);
  assert.equal(validateTextInputNumeric('39.99', '50', options), false);
  // 20% of 231 is 46.2: 184.8 to 277.2.
  const whole = { threshold: '20%', precision: 0 };
  assert.equal(validateTextInputNumeric('185', '231', whole), true);
  assert.equal(validateTextInputNumeric('277', '231', whole), true);
  assert.equal(validateTextInputNumeric('184', '231', whole), false);
  assert.equal(validateTextInputNumeric('278', '231', whole), false);
});

test('a percentage threshold on a decimal key keeps the floating-point slack', () => {
  // 10% of 0.3 is 0.03, and |0.33 - 0.3| is 0.030000000000000027 in floating point.
  const options = { threshold: '10%', precision: 2 };
  assert.equal(validateTextInputNumeric('0.33', '0.3', options), true);
  assert.equal(validateTextInputNumeric('0.27', '0.3', options), true);
  assert.equal(validateTextInputNumeric('0.34', '0.3', options), false);
  assert.equal(validateTextInputNumeric('0.26', '0.3', options), false);
});

test('a percentage threshold on a negative key is a band around the key', () => {
  const options = { threshold: '20%', precision: 2 };
  assert.equal(validateTextInputNumeric('-60', '-50', options), true);
  assert.equal(validateTextInputNumeric('-40', '-50', options), true);
  assert.equal(validateTextInputNumeric('-60.01', '-50', options), false);
  assert.equal(validateTextInputNumeric('-39.99', '-50', options), false);
  assert.equal(validateTextInputNumeric('50', '-50', options), false);
});

test('a percentage threshold with key 0, or threshold=0%, needs an exact match after rounding', () => {
  assert.equal(validateTextInputNumeric('0', '0', { threshold: '20%', precision: 2 }), true);
  assert.equal(validateTextInputNumeric('0.004', '0', { threshold: '20%', precision: 2 }), true);
  assert.equal(validateTextInputNumeric('0.01', '0', { threshold: '20%', precision: 2 }), false);
  assert.equal(validateTextInputNumeric('-0.01', '0', { threshold: '20%', precision: 2 }), false);
  assert.equal(validateTextInputNumeric('50.004', '50', { threshold: '0%', precision: 2 }), true);
  assert.equal(validateTextInputNumeric('50.01', '50', { threshold: '0%', precision: 2 }), false);
});

test('a malformed percentage threshold matches nothing, like any other threshold that is not a number', () => {
  assert.equal(validateTextInputNumeric('50', '50', { threshold: 'abc%', precision: 2 }), false);
  assert.equal(validateTextInputNumeric('50', '50', { threshold: 'abc', precision: 2 }), false);
  assert.equal(validateTextInputNumericWithUnits('10 TB', '10 TB', { threshold: 'abc%', units: ['TB'] }), false);
  assert.equal(validateTextInputNumericWithCurrency('$100', '100', { threshold: 'abc%', currency: '$' }), false);
});

test('absolute thresholds are unchanged next to percentage ones', () => {
  assert.equal(validateTextInputNumeric('60', '50', { threshold: 10, precision: 2 }), true);
  assert.equal(validateTextInputNumeric('60.01', '50', { threshold: 10, precision: 2 }), false);
  assert.equal(validateTextInputNumeric('0.31', '0.3', { threshold: 0.01, precision: 2 }), true);
  assert.equal(validateTextInputNumeric('3.14', '3.14', {}), true);
  assert.equal(validateTextInputNumeric('3.16', '3.14', {}), false);
});

test('numeric-with-units and numeric-with-currency take percentage thresholds', () => {
  const units = { threshold: '20%', units: ['TB'] };
  assert.equal(validateTextInputNumericWithUnits('12 TB', '10 TB', units), true);
  assert.equal(validateTextInputNumericWithUnits('8TB', '10 TB', units), true);
  assert.equal(validateTextInputNumericWithUnits('12.01 TB', '10 TB', units), false);
  assert.equal(validateTextInputNumericWithUnits('7.99 TB', '10 TB', units), false);

  const currency = { threshold: '20%', currency: '$' };
  assert.equal(validateTextInputNumericWithCurrency('$120', '100', currency), true);
  assert.equal(validateTextInputNumericWithCurrency('80$', '$100', currency), true);
  assert.equal(validateTextInputNumericWithCurrency('$120.01', '100', currency), false);
  assert.equal(validateTextInputNumericWithCurrency('$79.99', '100', currency), false);
});

test('threshold=20% in an answer key reaches the validator as a percentage', () => {
  const parsed = parseTextInputAnswerItems(['50 [kind: numeric] [options: precision=2,threshold=20%]']);
  assert.deepEqual(parsed.validation, { kind: 'numeric', options: { precision: 2, threshold: '20%' } });
  assert.equal(validateTextInputAnswer(parsed, '60'), true);
  assert.equal(validateTextInputAnswer(parsed, '61'), false);
});

test('the browser gets threshold=20% without the key', () => {
  // /api/activity sends buildActivityFromMarkdown(question.md) as is.
  const { buildActivityFromMarkdown } = require('../lib/parse-question');
  const questionMd = fs.readFileSync(
    path.join(__dirname, '../data/examples/assessment-text-input-estimates.md'),
    'utf8'
  );
  const activity = buildActivityFromMarkdown(questionMd);
  const [first] = activity.textInput.questions;
  assert.equal(first.correctAnswer, '');
  assert.deepEqual(first.correctAnswers, []);
  assert.deepEqual(first.validation, { kind: 'numeric', options: { precision: 0, threshold: '20%' } });
  const sent = JSON.stringify(activity);
  for (const key of ['20000000', '231', '10 TB']) {
    assert.equal(sent.includes(key), false, `browser payload contains ${key}`);
  }
});

function loadPracticeModeFunctions(names) {
  // The practice-mode copies are closures inside initTextInput; evaluate their source directly.
  const src = fs.readFileSync(path.join(__dirname, '../public/modules/text-input.js'), 'utf8');
  const bodies = names.map(name => {
    const start = src.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `missing function ${name}`);
    const end = src.indexOf('\n  function ', start + 1);
    return src.slice(start, end === -1 ? src.length : end);
  });
  return new Function(`${bodies.join('\n')}\nreturn { ${names.join(', ')} };`)();
}

test('practice mode applies percentage thresholds like the scorer', () => {
  const practice = loadPracticeModeFunctions([
    'isWithinThreshold',
    'resolveThreshold',
    'validateNumeric',
    'validateNumericWithUnits',
    'validateNumericWithCurrency'
  ]);
  const scorer = {
    numeric: validateTextInputNumeric,
    'numeric-with-units': validateTextInputNumericWithUnits,
    'numeric-with-currency': validateTextInputNumericWithCurrency
  };
  const browser = {
    numeric: practice.validateNumeric,
    'numeric-with-units': practice.validateNumericWithUnits,
    'numeric-with-currency': practice.validateNumericWithCurrency
  };
  const pct = { threshold: '20%', precision: 2 };
  const cases = [
    ['numeric', '60', '50', pct, true],
    ['numeric', '60.01', '50', pct, false],
    ['numeric', '-40', '-50', pct, true],
    ['numeric', '-39.99', '-50', pct, false],
    ['numeric', '0', '0', pct, true],
    ['numeric', '0.01', '0', pct, false],
    ['numeric', '0.33', '0.3', { threshold: '10%', precision: 2 }, true],
    ['numeric', '0.34', '0.3', { threshold: '10%', precision: 2 }, false],
    ['numeric', '50.004', '50', { threshold: '0%', precision: 2 }, true],
    ['numeric', '50.01', '50', { threshold: '0%', precision: 2 }, false],
    ['numeric', '50', '50', { threshold: 'abc%', precision: 2 }, false],
    ['numeric', '60', '50', { threshold: 10, precision: 2 }, true],
    ['numeric', '60.01', '50', { threshold: 10, precision: 2 }, false],
    ['numeric-with-units', '12 TB', '10 TB', { threshold: '20%', units: ['TB'] }, true],
    ['numeric-with-units', '12.01 TB', '10 TB', { threshold: '20%', units: ['TB'] }, false],
    ['numeric-with-currency', '$80', '100', { threshold: '20%', currency: '$' }, true],
    ['numeric-with-currency', '$79.99', '100', { threshold: '20%', currency: '$' }, false]
  ];
  for (const [kind, answer, key, options, expected] of cases) {
    const label = `${kind}: ${answer} vs ${key} at ${JSON.stringify(options)}`;
    assert.equal(scorer[kind](answer, key, options), expected, `scorer ${label}`);
    assert.equal(browser[kind](answer, key, options), expected, `practice ${label}`);
  }
});
