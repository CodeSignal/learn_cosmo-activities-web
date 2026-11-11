const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lib = require('../lib/number-answer');
const {
  validateTextInputNumeric,
  validateTextInputNumericWithUnits,
  validateTextInputNumericWithCurrency,
  validateTextInputAnswer
} = require('../lib/text-input-validation');

// The browser copy is an ES module with no imports; load it through a data: URL so the
// test does not depend on Node's module-syntax detection for .js files.
async function loadBrowserCopy() {
  const source = fs.readFileSync(path.join(__dirname, '../public/utils/number-answer.js'), 'utf8');
  return import(`data:text/javascript,${encodeURIComponent(source)}`);
}

// [text, options, expected value or NaN]
const CASES = [
  ['5000', {}, 5000],
  ['5,000', {}, 5000],
  ['1,234.56', {}, 1234.56],
  ['-1,000', {}, -1000],
  ['+1,000', {}, 1000],
  ['12,345,678.9', {}, 12345678.9],
  ['1 234.5', {}, 1234.5],
  ['1 234.5', {}, 1234.5],
  ['  5,000  ', {}, 5000],
  ['0.5', {}, 0.5],
  ['.5', {}, 0.5],
  ['5.', {}, 5],
  ['-0.25', {}, -0.25],
  ['−1,000', {}, -1000],
  ['1e3', {}, 1000],
  ['2.5E-3', {}, 0.0025],
  ['007', {}, 7],
  ['', {}, NaN],
  ['   ', {}, NaN],
  ['12,5', {}, NaN],
  ['4,50', {}, NaN],
  ['0,500', {}, NaN],
  ['1,23,4', {}, NaN],
  ['1,2345', {}, NaN],
  [',123', {}, NaN],
  ['1,', {}, NaN],
  ['1,,000', {}, NaN],
  ['1, 000', {}, NaN],
  ['1,234 567', {}, NaN],
  ['1.234,5', {}, NaN],
  ['1.2.3', {}, NaN],
  ['5k', {}, NaN],
  ['50%', {}, NaN],
  ['1/2', {}, NaN],
  ['-', {}, NaN],
  ['.', {}, NaN],
  ['--5', {}, NaN],
  ['$5', {}, NaN],
  ['$1,200.50', { currency: '$' }, 1200.5],
  ['$ 1,200.50', { currency: '$' }, 1200.5],
  ['1,200.50$', { currency: '$' }, 1200.5],
  ['1,200.50 $', { currency: '$' }, 1200.5],
  ['-$1,200.50', { currency: '$' }, -1200.5],
  ['$-1,200.50', { currency: '$' }, -1200.5],
  ['1,200.50', { currency: '$' }, 1200.5],
  ['€1.234', { currency: '€' }, 1.234],
  ['$$5', { currency: '$' }, NaN],
  ['$12,5', { currency: '$' }, NaN],
  ['€5', { currency: '$' }, NaN],
  ['1,000 kg', { units: ['kg', 'g'] }, 1000],
  ['1,000kg', { units: ['kg', 'g'] }, 1000],
  ['1,000 KG', { units: ['kg', 'g'] }, 1000],
  ['250 g', { units: ['kg', 'g'] }, 250],
  ['1 000 g', { units: ['kg', 'g'] }, 1000],
  ['1,0 kg', { units: ['kg', 'g'] }, NaN],
  ['1,000 lb', { units: ['kg', 'g'] }, NaN]
];

function describeCase(text, options) {
  const extra = Object.keys(options).length ? ` with ${JSON.stringify(options)}` : '';
  return `${JSON.stringify(text)}${extra}`;
}

test('parseNumberAnswer reads thousands separators and rejects decimal commas', () => {
  for (const [text, options, expected] of CASES) {
    const actual = lib.parseNumberAnswer(text, options);
    if (Number.isNaN(expected)) {
      assert.ok(Number.isNaN(actual), `${describeCase(text, options)} should be rejected, got ${actual}`);
    } else {
      assert.equal(actual, expected, describeCase(text, options));
    }
  }
});

// The parser code, from its first constant to the end of parseNumberAnswer, without `export`.
function parserSource(rel) {
  const source = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  const start = source.indexOf('const GROUP_SPACES');
  const end = source.indexOf('\n}\n', source.indexOf('function parseNumberAnswer'));
  assert.ok(start >= 0 && end > start, `parser not found in ${rel}`);
  return source.slice(start, end).replace(/^export /gm, '');
}

test('the browser copy of parseNumberAnswer matches lib/', async () => {
  assert.equal(
    parserSource('public/utils/number-answer.js'),
    parserSource('lib/number-answer.js'),
    'keep the parser code identical in lib/number-answer.js and public/utils/number-answer.js'
  );

  const browser = await loadBrowserCopy();
  for (const [text, options] of CASES) {
    assert.deepEqual(
      browser.parseNumberAnswer(text, options),
      lib.parseNumberAnswer(text, options),
      describeCase(text, options)
    );
  }

  // A seeded sweep over the characters people type into number fields.
  let seed = 7;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const alphabet = '0123456789,. -+$e';
  for (let i = 0; i < 3000; i++) {
    let text = '';
    const length = 1 + Math.floor(random() * 9);
    for (let j = 0; j < length; j++) text += alphabet[Math.floor(random() * alphabet.length)];
    for (const options of [{}, { currency: '$' }, { units: ['kg'] }]) {
      assert.deepEqual(
        browser.parseNumberAnswer(text, options),
        lib.parseNumberAnswer(text, options),
        describeCase(text, options)
      );
    }
  }
});

test('getNumberFormatMessage stays empty for empty or readable answers', async () => {
  const { getNumberFormatMessage } = await loadBrowserCopy();
  assert.equal(getNumberFormatMessage('', 'numeric'), '');
  assert.equal(getNumberFormatMessage('   ', 'numeric'), '');
  assert.equal(getNumberFormatMessage('5000', 'numeric'), '');
  assert.equal(getNumberFormatMessage('5,000', 'numeric'), '');
  assert.equal(getNumberFormatMessage('-1,000', 'numeric'), '');
  assert.equal(getNumberFormatMessage('$1,200.50', 'numeric-with-currency', { currency: '$' }), '');
  assert.equal(getNumberFormatMessage('1,000 kg', 'numeric-with-units', { units: ['kg'] }), '');
});

test('getNumberFormatMessage explains the accepted format for unreadable answers', async () => {
  const { getNumberFormatMessage, NUMBER_FORMAT_MESSAGE } = await loadBrowserCopy();
  assert.match(NUMBER_FORMAT_MESSAGE, /1,234\.5/);
  assert.match(NUMBER_FORMAT_MESSAGE, /dot for decimals/);
  assert.equal(getNumberFormatMessage('12,5', 'numeric'), NUMBER_FORMAT_MESSAGE);
  assert.equal(getNumberFormatMessage('1,23,4', 'numeric'), NUMBER_FORMAT_MESSAGE);
  assert.equal(getNumberFormatMessage('5k', 'numeric'), NUMBER_FORMAT_MESSAGE);
  assert.equal(getNumberFormatMessage('$5', 'numeric'), NUMBER_FORMAT_MESSAGE);
  assert.equal(getNumberFormatMessage('$12,5', 'numeric-with-currency', { currency: '$' }), NUMBER_FORMAT_MESSAGE);
});

test('getNumberFormatMessage ignores kinds that are not numbers', async () => {
  const { getNumberFormatMessage } = await loadBrowserCopy();
  assert.equal(getNumberFormatMessage('12,5', 'string'), '');
  assert.equal(getNumberFormatMessage('12,5', 'validate-later'), '');
  assert.equal(getNumberFormatMessage('12,5', undefined), '');
});

test('numeric answers with thousands separators match the key', () => {
  const options = { precision: 6, threshold: 0 };
  assert.equal(validateTextInputNumeric('5,000', '5000', options), true);
  assert.equal(validateTextInputNumeric('1,234.56', '1234.56', options), true);
  assert.equal(validateTextInputNumeric('-1,000', '-1000', options), true);
  assert.equal(validateTextInputNumeric('5000', '5000', options), true);
  assert.equal(validateTextInputNumeric('5000', '5,000', options), true);
  assert.equal(validateTextInputNumeric('5,000', '5', options), false);
});

test('numeric answers that are not readable numbers never match', () => {
  const options = { precision: 6, threshold: 0 };
  assert.equal(validateTextInputNumeric('12,5', '12.5', options), false);
  assert.equal(validateTextInputNumeric('12,5', '12', options), false);
  assert.equal(validateTextInputNumeric('1,23,4', '1234', options), false);
  assert.equal(validateTextInputNumeric('1,23,4', '1.23', options), false);
  assert.equal(validateTextInputNumeric('5 apples', '5', options), false);
});

test('currency answers read the comma as a thousands separator', () => {
  const options = { threshold: 0 };
  assert.equal(validateTextInputNumericWithCurrency('1,234.56', '1234.56', options), true);
  assert.equal(validateTextInputNumericWithCurrency('1,234.56', '1.234', { threshold: 0.01 }), false);
  assert.equal(validateTextInputNumericWithCurrency('$1,200.50', '1200.50', options), true);
  assert.equal(validateTextInputNumericWithCurrency('$1,200.50', '$1,200.50', options), true);
  assert.equal(validateTextInputNumericWithCurrency('1200.5', '$1,200.50', options), true);
  assert.equal(validateTextInputNumericWithCurrency('$12,5', '12.5', options), false);
});

test('unit answers read the comma as a thousands separator', () => {
  const options = { threshold: 0, units: ['kg', 'g'] };
  assert.equal(validateTextInputNumericWithUnits('1,000 kg', '1000 kg', options), true);
  assert.equal(validateTextInputNumericWithUnits('1,000', '1000', options), true);
  assert.equal(validateTextInputNumericWithUnits('1,5 kg', '1.5 kg', options), false);
});

test('validateTextInputAnswer treats an empty number answer as unanswered', () => {
  const question = {
    correctAnswers: [{ correctAnswer: '0', validation: { kind: 'numeric', options: { threshold: 0 } } }]
  };
  assert.equal(validateTextInputAnswer(question, ''), false);
  assert.equal(validateTextInputAnswer(question, '0'), true);
  assert.equal(validateTextInputAnswer(question, '-0'), true);
});
