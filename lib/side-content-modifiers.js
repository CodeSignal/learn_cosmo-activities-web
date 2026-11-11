function mapOutsideFences(text, fn) {
  const source = String(text);
  let out = '';
  let outsideStart = 0;
  let fence = null;
  let i = 0;

  while (i < source.length) {
    const nl = source.indexOf('\n', i);
    const lineEnd = nl === -1 ? source.length : nl + 1;
    const content = (nl === -1 ? source.slice(i) : source.slice(i, nl)).replace(/\r$/, '');

    if (!fence) {
      const open = content.match(/^ *(`{3,}|~{3,})/);
      if (open) {
        if (i > outsideStart) out += fn(source.slice(outsideStart, i));
        fence = { marker: open[1][0], length: open[1].length };
        out += source.slice(i, lineEnd);
        outsideStart = lineEnd;
      }
    } else {
      out += source.slice(i, lineEnd);
      outsideStart = lineEnd;
      const close = content.match(/^ *(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === fence.marker && close[1].length >= fence.length) {
        fence = null;
      }
    }

    if (nl === -1) break;
    i = lineEnd;
  }

  if (!fence && outsideStart < source.length) {
    out += fn(source.slice(outsideStart));
  }
  return out;
}

const MODIFIER = /[ \t]*\[(designSystem|openInNewTab|contentWidth:[ \t]*([^\]\r\n]+))\]/gi;
const TRAILING_MODIFIERS = /(?:\[(?:designSystem|openInNewTab|contentWidth:[^\]\r\n]+)\][ \t]*)+$/i;

/**
 * Strips modifiers from one line and records them in `found`. Modifiers count
 * on a line of their own (several per line, any order) or after the URL on a
 * URL line. [contentWidth: …] also counts anywhere else. Returns null when
 * only modifiers were on the line, so the caller drops the whole line.
 */
function stripLineModifiers(line, found) {
  const trailing = line.match(TRAILING_MODIFIERS);
  const lead = trailing ? line.slice(0, trailing.index) : '';
  const runStart = trailing && /^\s*(?:(?:https?:\/\/|\/)\S*\s+)?$/i.test(lead)
    ? trailing.index
    : line.length;
  let removed = false;
  const rest = line.replace(MODIFIER, (match, name, width, offset) => {
    if (width === undefined && offset + match.indexOf('[') < runStart) return match;
    removed = true;
    if (width !== undefined) {
      if (!found.contentWidth) found.contentWidth = width.trim();
    } else if (/^designSystem$/i.test(name)) {
      found.designSystem = true;
    } else {
      found.openInNewTab = true;
    }
    return '';
  });
  return removed && !rest.trim() ? null : rest;
}

function parseSideContentModifiers(contentText) {
  const found = { contentWidth: null, designSystem: false, openInNewTab: false };
  const contentWithoutModifiers = mapOutsideFences(contentText, (chunk) =>
    chunk.split(/(?<=\n)/).map((line) => {
      const eol = line.match(/\r?\n$/)?.[0] || '';
      const rest = stripLineModifiers(line.slice(0, line.length - eol.length), found);
      return rest === null ? '' : rest + eol;
    }).join('')
  ).trim();
  return { ...found, contentWithoutModifiers };
}

module.exports = { parseSideContentModifiers, mapOutsideFences };
