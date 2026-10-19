const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { renderMarkdown } = require('../lib/render-markdown');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('matching-latex-chips suggested answers keep $$...$$ for KaTeX', () => {
  const md = read('data/examples/matching-latex-chips.md');
  const suggested = md
    .split('__Suggested Answers__')[1]
    .split('\n')
    .map((line) => line.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean);

  assert.equal(suggested.length, 4);
  for (const choice of suggested) {
    assert.match(choice, /\$\$y=x\^2\$\$/);
    const html = renderMarkdown(choice);
    assert.match(html, /\$\$y=x\^2\$\$/);
    assert.doesNotMatch(html, /<em>/);
  }

  const blanks = [...md.matchAll(/\[\[blank:([^\]]+)\]\]/gi)].map((m) => m[1].trim());
  assert.deepEqual(new Set(blanks), new Set(suggested));
});

test('matching choice chips render markdown HTML and KaTeX', () => {
  const src = read('public/modules/matching.js');
  assert.match(src, /from '\.\.\/utils\/katex-render\.js'/);
  assert.match(src, /choicesHtml/);
  assert.match(src, /choiceLabelHtml/);
  assert.match(src, /matching-choice-label/);
  assert.match(src, /choiceButton\.innerHTML/);
  assert.match(src, /renderMath\(choiceButton\)/);
  assert.match(src, /renderMath\(selectionArea\)/);
  assert.doesNotMatch(
    src,
    /choiceButton\.setAttribute\(\s*['"]aria-label['"]/,
    'do not override the choice accessible name with raw $$...$$'
  );
});

test('matching choice label is a single block so Chrome cannot flex-wrap text beside math', () => {
  const css = read('public/modules/matching.css');
  assert.match(css, /\.matching-choice-label\s*\{[^}]*display:\s*block/);
  assert.match(css, /\.matching-choice-label \.katex/);
  assert.match(css, /white-space:\s*nowrap/);
});
