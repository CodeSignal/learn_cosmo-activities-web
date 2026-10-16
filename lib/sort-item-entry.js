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

module.exports = { parseSortItemEntry };
