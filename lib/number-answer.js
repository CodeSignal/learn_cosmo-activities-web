/**
 * Reads the number in a numeric Text Input answer ([kind: numeric], numeric-with-currency,
 * numeric-with-units). The same rules apply to what the learner typed and to the answer key.
 *
 * Accepted, after trimming:
 *   - digits with an optional sign (-, + or U+2212): 5000, -12, +3
 *   - a dot as the decimal point: 1234.56, .5, 5.
 *   - an optional exponent: 1e6, 2.5E-3
 *   - thousands separators between groups of exactly three digits, either all commas or all
 *     spaces (a space, no-break space, thin space or narrow no-break space):
 *     5,000  1,234.56  -1,000  12,345,678  1 234.5
 *   - numeric-with-currency: the currency symbol (options.currency) before or after the number,
 *     with optional space; a sign may come before the symbol: $1,200.50  -$5  $-5  1,200.50 $
 *   - numeric-with-units: one of options.units (any case) before or after the number: 1,000 kg
 *
 * Rejected (returns NaN), so the answer never matches and the field shows a format message:
 *   - a decimal comma: 12,5  4,50  0,500. It cannot be told apart from a thousands separator
 *     ("1,500"), so learners are asked to use a dot instead of the scorer guessing.
 *   - misplaced or mixed separators: 1,23,4  1,2345  ,123  1,  1,234 567  1.234,5
 *   - anything else: 5k  50%  1/2  1.2.3  $5 in a field without a currency
 *   - empty text
 *
 * Answer keys are read with parseNumberAnswerKey: the same rules, except that a key they cannot
 * read and that has no comma keeps the value parseFloat gave it before (12.5% is 12.5).
 *
 * public/utils/number-answer.js is the browser copy of this file; test/number-answer.test.js
 * checks that both read every input the same way.
 */

const GROUP_SPACES = ' \\u00a0\\u2009\\u202f';
const NUMBER_PATTERN = new RegExp(
  '^[-+\\u2212]?' +
  '(?:' +
    '(?:[1-9]\\d{0,2}(?:,\\d{3})+' +
    `|[1-9]\\d{0,2}(?:[${GROUP_SPACES}]\\d{3})+` +
    '|\\d+)(?:\\.\\d*)?' +
    '|\\.\\d+' +
  ')' +
  '(?:e[-+]?\\d+)?$',
  'i'
);

function readPlainNumber(text) {
  if (!NUMBER_PATTERN.test(text)) return NaN;
  return Number(text.replace(/[,\s]/g, '').replace('−', '-'));
}

// Removes one symbol from the start or the end of the text, longest symbol first.
function stripSymbol(text, symbols, ignoreCase) {
  const fold = s => (ignoreCase ? s.toLowerCase() : s);
  const folded = fold(text);
  const sorted = symbols
    .map(s => String(s).trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const symbol of sorted) {
    const target = fold(symbol);
    if (folded.endsWith(target)) return text.slice(0, text.length - symbol.length).trimEnd();
    if (folded.startsWith(target)) return text.slice(symbol.length).trimStart();
  }
  return text;
}

// Trims the text and drops the currency symbol or unit, keeping a sign that came before it:
// "-$5" becomes "-5".
function stripAnswerSymbols(text, options) {
  let body = String(text == null ? '' : text).trim();
  const sign = /^[-+−]/.test(body) ? body[0] : '';
  if (sign) body = body.slice(1);

  if (options.currency !== undefined && options.currency !== null) {
    body = stripSymbol(body, [String(options.currency)], false);
  }
  if (options.units) {
    const units = Array.isArray(options.units) ? options.units : String(options.units).split(',');
    body = stripSymbol(body, units, true);
  }

  return sign + body;
}

/**
 * @param {string} text  the answer as typed, or an answer-key value
 * @param {{ currency?: string, units?: string[]|string }} [options]
 * @returns {number} the value, or NaN when the text is empty or not a readable number
 */
function parseNumberAnswer(text, options = {}) {
  return readPlainNumber(stripAnswerSymbols(text, options));
}

/**
 * Reads an answer-key value. It follows parseNumberAnswer, except that a value those rules
 * cannot read and that has no comma is read by its leading number, as parseFloat read every
 * key before: "12.5%" is 12.5, and "500 g" is 500 when g is not one of the units. A value with
 * a comma is not guessed, because the comma may be a decimal comma.
 * @param {string} text  the answer-key value
 * @param {{ currency?: string, units?: string[]|string }} [options]
 * @returns {number} the value, or NaN when it cannot be read
 */
function parseNumberAnswerKey(text, options = {}) {
  const stripped = stripAnswerSymbols(text, options);
  const value = readPlainNumber(stripped);
  if (!Number.isNaN(value) || stripped.includes(',')) return value;
  return parseFloat(stripped.replace('−', '-'));
}

module.exports = { parseNumberAnswer, parseNumberAnswerKey };
