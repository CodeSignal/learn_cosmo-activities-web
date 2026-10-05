// A repeatable Text Input question ([options: repeatable=true]) stores all its entries in one answer
// string, "<label> 1:\n<text>\n\n<label> 2:\n<text>", so results, reports, and saved answers stay plain
// strings. Empty entries are dropped and the numbering is compacted.
//
// A line inside an entry that looks like an entry header ("<label> N:") is saved with a leading
// backslash so it stays part of that entry when the answer is parsed back; parsing removes it again.

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function headerLinePattern(label) {
  return `${escapeRegExp(label)} \\d+:[ \\t]*`;
}

export function serializeRepeatableAnswer(entries, label) {
  const escapeHeaders = new RegExp(`^(\\\\*${headerLinePattern(label)})$`, 'gm');
  return entries
    .map(entry => String(entry || '').trim())
    .filter(Boolean)
    .map((entry, index) => `${label} ${index + 1}:\n${entry.replace(escapeHeaders, '\\$1')}`)
    .join('\n\n');
}

export function parseRepeatableAnswer(answer, label) {
  const text = String(answer || '');
  if (!text.trim()) return [''];
  const header = new RegExp(`^${headerLinePattern(label)}(?:\\r?\\n|$)`, 'gm');
  const unescapeHeaders = new RegExp(`^\\\\(\\\\*${headerLinePattern(label)})$`, 'gm');
  const unescape = part => part.replace(unescapeHeaders, '$1').trim();
  if (!new RegExp(header.source, 'm').test(text)) return [unescape(text)];
  const entries = text.split(header).map(unescape).filter(Boolean);
  return entries.length > 0 ? entries : [''];
}
