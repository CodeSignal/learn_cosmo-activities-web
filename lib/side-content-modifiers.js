const FENCE_BLOCK = /^[ \t]{0,3}(```|~~~)[^\n]*\n[\s\S]*?^[ \t]{0,3}\1[^\n]*$/gm;

function mapOutsideFences(text, fn) {
  const source = String(text);
  const re = new RegExp(FENCE_BLOCK.source, FENCE_BLOCK.flags);
  let out = '';
  let last = 0;
  let match;
  while ((match = re.exec(source))) {
    out += fn(source.slice(last, match.index));
    out += match[0];
    last = match.index + match[0].length;
  }
  out += fn(source.slice(last));
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
