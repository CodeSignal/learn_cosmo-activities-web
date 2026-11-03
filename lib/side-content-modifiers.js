function mapOutsideFences(text, fn) {
  const source = String(text);
  let out = '';
  let outsideStart = 0;
  let fence = null;
  let i = 0;

  while (i < source.length) {
    const nl = source.indexOf('\n', i);
    const lineEnd = nl === -1 ? source.length : nl + 1;
    const content = nl === -1 ? source.slice(i) : source.slice(i, nl);

    if (!fence) {
      const open = content.match(/^[ \t]{0,3}(`{3,}|~{3,})/);
      if (open) {
        if (i > outsideStart) out += fn(source.slice(outsideStart, i));
        fence = { marker: open[1][0], length: open[1].length };
        out += source.slice(i, lineEnd);
        outsideStart = lineEnd;
      }
    } else {
      out += source.slice(i, lineEnd);
      outsideStart = lineEnd;
      const close = content.match(/^[ \t]{0,3}(`{3,}|~{3,})[ \t]*$/);
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

function parseSideContentModifiers(contentText) {
  let contentWidth = null;
  let designSystem = false;
  mapOutsideFences(contentText, (chunk) => {
    if (!contentWidth) {
      const match = chunk.match(/\[contentWidth:\s*([^\]]+)\]/i);
      if (match) contentWidth = match[1].trim();
    }
    if (/(?:^|\n)\s*\[designSystem\]\s*(?:\n|$)/i.test(chunk)) {
      designSystem = true;
    }
    return chunk;
  });
  const contentWithoutModifiers = mapOutsideFences(contentText, (chunk) =>
    chunk
      .replace(/\s*\[contentWidth:\s*[^\]]+\]\s*/gi, '')
      .replace(/(?:^|\n)\s*\[designSystem\]\s*(?=\n|$)/gi, '\n')
  ).trim();
  return { contentWidth, designSystem, contentWithoutModifiers };
}

module.exports = { parseSideContentModifiers, mapOutsideFences };
