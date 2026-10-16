const { marked } = require('marked');

const MARKDOWN_RENDERER = new marked.Renderer();
MARKDOWN_RENDERER.table = function renderMarkdownTable(header, body) {
  return `<div class="table-scroll"><table class="table">\n<thead>${header}</thead>\n<tbody>${body}</tbody>\n</table></div>`;
};

/**
 * Math regions, in match order. `$$...$$` is the canonical inline form; the
 * others are legacy. `$$` must come before `$` so a `$$` block is never read
 * as two `$` regions. Inside math, `\$` is a literal dollar (KaTeX handles it).
 */
const MATH_PATTERNS = [
  /(?<!\\)\$\$(?:\\[\s\S]|[^\\])+?\$\$/g,
  /\\\[[\s\S]+?\\\]/g,
  /\\\([\s\S]+?\\\)/g,
  /(?<!\\)\$(?:\\.|[^\\\n$])+?\$/g
];

/** Same patterns, anchored at a given index (for scanners that walk text). */
const MATH_PATTERNS_STICKY = MATH_PATTERNS.map(re => new RegExp(re.source, 'y'));

/** Length of the math region starting at `index`, or 0 if none starts there. */
function mathRegionLengthAt(text, index) {
  for (const re of MATH_PATTERNS_STICKY) {
    re.lastIndex = index;
    const m = re.exec(text);
    if (m) return m[0].length;
  }
  return 0;
}

/**
 * Outside math, `\$` is a literal dollar sign. Wrap it so KaTeX skips it.
 */
function escapeMathDollars(markdown) {
  return markdown.replace(/\\\$/g, '<span class="no-math">$</span>');
}

/**
 * Stash math regions behind placeholders so markdown parsing can't mangle
 * them (marked drops the backslash in `\(`, `\{`, `\\`, `\,` and turns
 * `*...*` into emphasis).
 */
function protectMathRegions(markdown) {
  const store = [];
  let text = markdown;
  for (const re of MATH_PATTERNS) {
    text = text.replace(re, (match) => {
      const token = `MATHPROTECT${store.length}ENDMATHPROTECT`;
      store.push(match);
      return token;
    });
  }
  return { text, store };
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') return '';
  const { text, store } = protectMathRegions(markdown);
  let html = marked.parse(escapeMathDollars(text), { renderer: MARKDOWN_RENDERER });
  store.forEach((math, i) => {
    html = html.replace(`MATHPROTECT${i}ENDMATHPROTECT`, () => escapeHtml(math));
  });
  return html;
}

module.exports = { renderMarkdown, mathRegionLengthAt };
