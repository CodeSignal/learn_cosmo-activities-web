// Browser copy of lib/number-answer.js, which documents the accepted formats.
// Keep parseNumberAnswer identical in both files; test/number-answer.test.js compares them.
//
// In short: a dot is the decimal point; commas or spaces may separate groups of three digits
// (5,000  1,234.56  -1,000  1 234.5); a currency field also takes its symbol ($1,200.50) and a
// units field its unit (1,000 kg). A decimal comma (12,5) and misplaced separators (1,23,4) are
// not read as numbers.

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
export function parseNumberAnswer(text, options = {}) {
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
export function parseNumberAnswerKey(text, options = {}) {
  const stripped = stripAnswerSymbols(text, options);
  const value = readPlainNumber(stripped);
  if (!Number.isNaN(value) || stripped.includes(',')) return value;
  return parseFloat(stripped.replace('−', '-'));
}

const NUMBER_KINDS = ['numeric', 'numeric-with-currency', 'numeric-with-units'];

export const NUMBER_FORMAT_MESSAGE = 'Enter a number like 1234.5 or 1,234.5. Use a dot for decimals.';

/**
 * The message shown under a number field whose text cannot be read as a number,
 * or '' when the field is empty, readable, or not a number field.
 * @param {string} text
 * @param {string} kind  the question's validation kind
 * @param {{ currency?: string, units?: string[]|string }} [options]  the question's options
 */
export function getNumberFormatMessage(text, kind, options = {}) {
  if (!NUMBER_KINDS.includes(kind)) return '';
  if (!String(text == null ? '' : text).trim()) return '';
  const parseOptions = {};
  if (kind === 'numeric-with-currency') parseOptions.currency = options.currency ?? '$';
  if (kind === 'numeric-with-units') parseOptions.units = options.units || [];
  return Number.isNaN(parseNumberAnswer(text, parseOptions)) ? NUMBER_FORMAT_MESSAGE : '';
}
