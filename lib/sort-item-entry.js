const { mathRegionLengthAt } = require('./render-markdown');

/**
 * Split a Sort Into Boxes `__Items__` entry ("Item text: Category") at the
 * first unescaped colon outside math. In the text portion, `\:` and `\\`
 * unescape; math regions and other backslashes are kept for rendering.
 * Everything after the separator is the category label, which may itself
 * contain raw colons.
 * @returns {{ text: string, correct: string }}
 */
function parseSortItemEntry(entry) {
  const s = String(entry);
  let text = '';
  let i = 0;
  let sepFound = false;
  while (i < s.length) {
    const mathLen = mathRegionLengthAt(s, i);
    if (mathLen) {
      text += s.slice(i, i + mathLen);
      i += mathLen;
      continue;
    }
    const ch = s[i];
    if (ch === '\\' && (s[i + 1] === ':' || s[i + 1] === '\\')) {
      text += s[i + 1];
      i += 2;
      continue;
    }
    if (ch === ':') {
      sepFound = true;
      i++;
      break;
    }
    text += ch;
    i++;
  }
  const correct = sepFound ? s.slice(i) : '';
  return { text: text.trim(), correct: correct.trim() };
}

/**
 * Escape Sort item text for the `Item: Category` form. Math regions are kept
 * unchanged. Outside math, `\` and `:` gain a leading backslash so a later
 * parseSortItemEntry round-trip keeps them in the item text.
 */
function escapeSortItemText(text) {
  const source = String(text == null ? '' : text);
  let result = '';
  let i = 0;
  while (i < source.length) {
    const mathLen = mathRegionLengthAt(source, i);
    if (mathLen) {
      result += source.slice(i, i + mathLen);
      i += mathLen;
      continue;
    }
    const ch = source[i];
    if (ch === '\\' || ch === ':') result += '\\';
    result += ch;
    i++;
  }
  return result;
}

module.exports = { parseSortItemEntry, escapeSortItemText };
