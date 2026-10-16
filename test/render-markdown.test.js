const test = require('node:test');
const assert = require('node:assert/strict');

const { renderMarkdown } = require('../lib/render-markdown');

test('renderMarkdown leaves $$...$$ intact for KaTeX', () => {
  assert.equal(renderMarkdown('Area is $$A = \\pi r^2$$ here').trim(), '<p>Area is $$A = \\pi r^2$$ here</p>');
});

test('renderMarkdown keeps \\$ inside $$...$$ as LaTeX', () => {
  assert.equal(renderMarkdown('Total $$\\$5 + x$$ due').trim(), '<p>Total $$\\$5 + x$$ due</p>');
});

test('renderMarkdown does not mangle markdown-significant characters inside math', () => {
  const html = renderMarkdown('Set $$\\{a*b*c\\}$$ and $$\\begin{matrix}a\\\\b\\end{matrix}$$ and $$x \\, dx$$');
  assert.match(html, /\$\$\\\{a\*b\*c\\\}\$\$/);
  assert.match(html, /\$\$\\begin\{matrix\}a\\\\b\\end\{matrix\}\$\$/);
  assert.match(html, /\$\$x \\, dx\$\$/);
  assert.doesNotMatch(html, /<em>/);
});

test('renderMarkdown HTML-escapes math so < and & stay text', () => {
  assert.equal(renderMarkdown('$$a<b \\& c$$').trim(), '<p>$$a&lt;b \\&amp; c$$</p>');
});

test('renderMarkdown escapes quotes in math so image alts stay intact', () => {
  const html = renderMarkdown('![$$a "b"$$](x.png)');
  assert.match(html, /alt="\$\$a &quot;b&quot;\$\$"/);
  assert.doesNotMatch(html, /alt="\$\$a "/);
});

test('renderMarkdown wraps \\$ outside math so KaTeX skips it', () => {
  assert.equal(
    renderMarkdown('Costs \\$5 and \\$10').trim(),
    '<p>Costs <span class="no-math">$</span>5 and <span class="no-math">$</span>10</p>'
  );
});

test('renderMarkdown still renders markdown around math', () => {
  assert.equal(renderMarkdown('**Bold** $$x^2$$ *em*').trim(), '<p><strong>Bold</strong> $$x^2$$ <em>em</em></p>');
});

test('renderMarkdown preserves legacy $...$, \\(...\\) and \\[...\\] delimiters', () => {
  const html = renderMarkdown('A $x*y*z$ B \\(f(x)\\) C \\[g(x)\\]');
  assert.match(html, /\$x\*y\*z\$/);
  assert.match(html, /\\\(f\(x\)\\\)/);
  assert.match(html, /\\\[g\(x\)\\\]/);
});
