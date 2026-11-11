const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  looksLikeHtml,
  renderContentBody,
  renderContentDocument
} = require('../lib/render-content-document');
const { parseSideContentFromSectionTokens } = require('../lib/parse-question');

test('looksLikeHtml accepts a leading tag and rejects markdown', () => {
  assert.equal(looksLikeHtml('<div><h1>Scenario</h1></div>'), true);
  assert.equal(looksLikeHtml('  <h1>Scenario</h1>'), true);
  assert.equal(looksLikeHtml('# Scenario'), false);
  assert.equal(looksLikeHtml('Maya starts a new session'), false);
  assert.equal(looksLikeHtml('<https://example.com>'), false);
});

test('renderContentBody passes HTML through and renders markdown', () => {
  assert.equal(
    renderContentBody('<h1 class="heading-small">Scenario</h1>'),
    '<h1 class="heading-small">Scenario</h1>'
  );
  assert.equal(renderContentBody('**Bold** copy').trim(), '<p><strong>Bold</strong> copy</p>');
});

test('renderContentDocument keeps the legacy document unless designSystem is set', () => {
  const doc = renderContentDocument('<h1>Scenario</h1>');
  assert.doesNotMatch(doc, /family=Work\+Sans/);
  assert.doesNotMatch(doc, /\/design-system\/typography\/typography\.css/);
  assert.doesNotMatch(doc, /var\(--heading-family\)/);
  assert.match(doc, /<h1>Scenario<\/h1>/);
});

test('renderContentDocument loads design-system assets when opted in', () => {
  const doc = renderContentDocument('<h1>Scenario</h1>', { designSystem: true });
  assert.match(doc, /family=Work\+Sans/);
  assert.match(doc, /\/design-system\/colors\/colors\.css/);
  assert.match(doc, /\/design-system\/typography\/typography\.css/);
  assert.match(doc, /\/design-system\/spacing\/spacing\.css/);
  assert.match(doc, /\/design-system\/components\/table\/table\.css/);
  assert.match(doc, /var\(--heading-family\)/);
  assert.match(doc, /var\(--body-family\)/);
  assert.match(doc, /var\(--code-family\)/);
  assert.match(doc, /background-color: var\(--Colors-Backgrounds-Main-Default\)/);
  assert.doesNotMatch(doc, /background-color: var\(--Colors-Backgrounds-Main-Top\)/);
  assert.match(doc, /\.markdown-content \.table \{[\s\S]*table-layout: fixed/);
  assert.match(doc, /\.markdown-content \.table th,[\s\S]*white-space: normal/);
  assert.match(doc, /<h1>Scenario<\/h1>/);
  assert.doesNotMatch(doc, /<p><h1>/);
});

function fontFaces(css, family) {
  return (css.match(/@font-face\s*\{[^}]*\}/g) || []).filter((face) =>
    new RegExp(`font-family:\\s*['"]${family}['"]`).test(face)
  );
}

function faceDescriptor(face, name) {
  const match = face.match(new RegExp(`${name}:\\s*([^;]+);`));
  return match ? match[1].trim() : null;
}

test('renderContentDocument shows code text while the design-system code font loads', () => {
  const typography = fs.readFileSync(
    path.join(__dirname, '../public/design-system/typography/typography.css'),
    'utf8'
  );
  const designSystemFamily = typography.match(/--code-family:\s*"([^"]+)"/)[1];
  const doc = renderContentDocument('<p>rootHash = <code>e10a8dbe31fe</code></p>', {
    designSystem: true
  });
  assert.match(doc, /<code>e10a8dbe31fe<\/code>/);
  assert.match(doc, /\.markdown-content code \{\s*font-family: var\(--code-family\), monospace;/);

  // A --code-family set in the document wins over typography.css (loaded earlier).
  const declaration = [...doc.matchAll(/--code-family:\s*([^;]+);/g)].at(-1);
  const codeFamily = declaration ? declaration[1].match(/"([^"]+)"/)[1] : designSystemFamily;
  if (declaration) {
    assert.ok(
      declaration.index > doc.indexOf('/design-system/typography/typography.css'),
      'the document sets --code-family after loading typography.css'
    );
    // .code-small, .code-medium… use var(--code-family) alone, so the
    // fallback shown while the font loads has to come from the variable.
    assert.match(declaration[1], /,\s*monospace\s*$/, 'code-* classes fall back to monospace');
  }
  const codeFaces = [...fontFaces(typography, codeFamily), ...fontFaces(doc, codeFamily)];
  assert.ok(codeFaces.length > 0, `${codeFamily} is declared`);
  for (const face of codeFaces) {
    assert.match(
      face,
      /font-display:\s*(?:swap|fallback|optional);/,
      `a ${codeFamily} face hides code text while it loads`
    );
  }

  // Same files, weights and styles as the design system, so code looks the same.
  const designSystemFaces = fontFaces(typography, designSystemFamily);
  assert.ok(designSystemFaces.length > 0, `typography.css declares ${designSystemFamily}`);
  for (const face of designSystemFaces) {
    const file = face.match(/url\('([^']+\.woff2)'\)/)[1];
    const match = codeFaces.find((candidate) =>
      candidate.includes(`url('${file}')`) &&
      faceDescriptor(candidate, 'font-weight') === faceDescriptor(face, 'font-weight') &&
      faceDescriptor(candidate, 'font-style') === faceDescriptor(face, 'font-style')
    );
    assert.ok(match, `${codeFamily} loads ${file} with the same weight and style`);
  }
});

test('renderContentDocument loads no web font for code in the legacy document', () => {
  const doc = renderContentDocument('<p>rootHash = <code>e10a8dbe31fe</code></p>');
  assert.doesNotMatch(doc, /@font-face/);
  assert.doesNotMatch(doc, /--code-family/);
  assert.match(doc, /<code>e10a8dbe31fe<\/code>/);
});

test('parseSideContentFromSectionTokens treats designSystem as opt-in', () => {
  const withFlag = parseSideContentFromSectionTokens([
    { raw: '<h1>Scenario</h1>\n\n[designSystem]\n[contentWidth: 35%]' }
  ]);
  assert.equal(withFlag.markdown, '<h1>Scenario</h1>');
  assert.equal(withFlag.designSystem, true);
  assert.equal(withFlag.contentWidth, '35%');

  const legacy = parseSideContentFromSectionTokens([
    { raw: '# Reference Table\n\n[contentWidth: 35%]' }
  ]);
  assert.equal(legacy.markdown, '# Reference Table');
  assert.equal(legacy.designSystem, undefined);

  const mentionsFlag = parseSideContentFromSectionTokens([
    { raw: 'Add `[designSystem]` to a later activity.\n\n[contentWidth: 35%]' }
  ]);
  assert.match(mentionsFlag.markdown, /\[designSystem\]/);
  assert.equal(mentionsFlag.designSystem, undefined);

  const fencedFlag = parseSideContentFromSectionTokens([
    {
      raw: 'Example:\n\n```text\n[designSystem]\n[contentWidth: 40%]\n```\n\n# Title'
    }
  ]);
  assert.match(fencedFlag.markdown, /```text\n\[designSystem\]\n\[contentWidth: 40%\]\n```/);
  assert.equal(fencedFlag.designSystem, undefined);
  assert.equal(fencedFlag.contentWidth, undefined);

  const nestedFence = parseSideContentFromSectionTokens([
    { raw: '````text\n```\n[designSystem]\n````\n\n# Title' }
  ]);
  assert.match(nestedFence.markdown, /\[designSystem\]/);
  assert.equal(nestedFence.designSystem, undefined);

  const unclosedFence = parseSideContentFromSectionTokens([
    { raw: '```text\n[designSystem]\n# Title' }
  ]);
  assert.match(unclosedFence.markdown, /\[designSystem\]/);
  assert.equal(unclosedFence.designSystem, undefined);

  const tabIndentedTicks = parseSideContentFromSectionTokens([
    { raw: '# Title\n\t```\n[designSystem]' }
  ]);
  assert.equal(tabIndentedTicks.designSystem, true);

  const listItemFence = parseSideContentFromSectionTokens([
    { raw: '1. Example\n\n    ```text\n    [designSystem]\n    ```\n\n[designSystem]\n# Title' }
  ]);
  assert.match(listItemFence.markdown, /```text\n    \[designSystem\]\n    ```/);
  assert.equal(listItemFence.designSystem, true);
  assert.match(listItemFence.markdown, /# Title/);

  const crlfFence = parseSideContentFromSectionTokens([
    { raw: '```text\r\n[designSystem]\r\n```\r\n\r\n[designSystem]\r\n# Title' }
  ]);
  assert.match(crlfFence.markdown, /```text\r?\n\[designSystem\]\r?\n```/);
  assert.equal(crlfFence.designSystem, true);
  assert.match(crlfFence.markdown, /# Title/);
});

const MODIFIER_LAYOUTS = [
  {
    name: '[designSystem] directly above [contentWidth]',
    raw: '[designSystem]\n[contentWidth: 40%]\n<h1>Scenario</h1>',
    expected: { markdown: '<h1>Scenario</h1>', contentWidth: '40%', designSystem: true }
  },
  {
    name: '[contentWidth] directly above [designSystem]',
    raw: '[contentWidth: 40%]\n[designSystem]\n<h1>Scenario</h1>',
    expected: { markdown: '<h1>Scenario</h1>', contentWidth: '40%', designSystem: true }
  },
  {
    name: 'modifier lines after the content, in reverse order',
    raw: '<h1>Scenario</h1>\n[contentWidth: 40%]\n[designSystem]',
    expected: { markdown: '<h1>Scenario</h1>', contentWidth: '40%', designSystem: true }
  },
  {
    name: 'modifiers sharing one line',
    raw: '[designSystem] [contentWidth: 40%]\n# Title',
    expected: { markdown: '# Title', contentWidth: '40%', designSystem: true }
  },
  {
    name: 'modifier paragraphs separated by blank lines',
    raw: '[contentWidth: 60%]\n\n[designSystem]\n\n<style>\n  .val { color: red; }\n</style>\n<p>Hi</p>',
    expected: {
      markdown: '<style>\n  .val { color: red; }\n</style>\n<p>Hi</p>',
      contentWidth: '60%',
      designSystem: true
    }
  },
  {
    name: 'URL followed by modifiers in any order',
    raw: 'https://stackblitz.com/edit/x?embed=1 [contentWidth: 65%] [openInNewTab]',
    expected: { url: 'https://stackblitz.com/edit/x?embed=1', openInNewTab: true, contentWidth: '65%' }
  },
  {
    name: 'URL followed by every modifier',
    raw: 'https://stackblitz.com/edit/x?embed=1 [openInNewTab] [contentWidth: 40%] [designSystem]',
    expected: { url: 'https://stackblitz.com/edit/x?embed=1', openInNewTab: true, contentWidth: '40%' }
  },
  {
    name: 'URL with modifiers on the next lines',
    raw: 'https://stackblitz.com/edit/x?embed=1\n[designSystem]\n[openInNewTab]\n[contentWidth: 40%]',
    expected: { url: 'https://stackblitz.com/edit/x?embed=1', openInNewTab: true, contentWidth: '40%' }
  },
  {
    name: 'site-relative URL with a modifier',
    raw: '/sim/ [contentWidth: 50%]',
    expected: { url: '/sim/', openInNewTab: false, contentWidth: '50%' }
  },
  {
    name: 'a flag at the end of a prose line stays text',
    raw: 'Turn the flag on with [designSystem]\n\n[contentWidth: 35%]',
    expected: { markdown: 'Turn the flag on with [designSystem]', contentWidth: '35%' }
  },
  {
    name: 'a modifier line between two lines of text',
    raw: 'First paragraph.\n[designSystem]\nSecond paragraph.',
    expected: { markdown: 'First paragraph.\n\nSecond paragraph.', designSystem: true }
  },
  {
    name: 'URL with a note on a later line',
    raw: 'https://stackblitz.com/edit/x?embed=1 [openInNewTab]\n\nOpens the starter project.',
    expected: { url: 'https://stackblitz.com/edit/x?embed=1', openInNewTab: true }
  }
];

test('parseSideContentFromSectionTokens reads modifiers on consecutive lines in any order', () => {
  for (const { name, raw, expected } of MODIFIER_LAYOUTS) {
    assert.deepEqual(parseSideContentFromSectionTokens([{ raw }]), expected, name);
  }
});

test('parseSideContentFromSectionTokens removes a modifier line without joining its neighbours', () => {
  for (const raw of [
    'First paragraph.\n\n[contentWidth: 40%]\n\nSecond paragraph.',
    'First paragraph.\n[contentWidth: 40%]\nSecond paragraph.',
    'First paragraph.\n[designSystem]\nSecond paragraph.'
  ]) {
    const html = renderContentBody(parseSideContentFromSectionTokens([{ raw }]).markdown);
    assert.match(html, /<p>First paragraph\.<\/p>/, raw);
    assert.match(html, /<p>Second paragraph\.<\/p>/, raw);
  }

  // Joined, the text above a rule would become a heading.
  const rule = parseSideContentFromSectionTokens([{ raw: 'Some text\n[designSystem]\n---' }]);
  assert.match(renderContentBody(rule.markdown), /^<p>Some text<\/p>\n<hr>/);
});

test('the editor parses side-content modifiers like the server', () => {
  const editor = fs.readFileSync(path.join(__dirname, '../public/editor.js'), 'utf8');
  const start = editor.indexOf('function mapOutsideFences');
  const end = editor.indexOf('// Parse markdown into editable structure');
  assert.ok(start !== -1 && end > start, 'editor.js keeps its copy of the parser');
  const sandbox = {};
  vm.runInNewContext(
    `${editor.slice(start, end)}
this.parseContentTextToStructure = parseContentTextToStructure;
this.formatSideContentMarkdown = formatSideContentMarkdown;`,
    sandbox
  );
  for (const { name, raw, expected } of MODIFIER_LAYOUTS) {
    const { url, markdown, ...modifiers } = expected;
    const want = url !== undefined
      ? { type: 'url', value: url, ...modifiers }
      : { type: 'markdown', value: markdown, ...modifiers };
    const structure = sandbox.parseContentTextToStructure(raw);
    assert.deepEqual(JSON.parse(JSON.stringify(structure)), want, name);

    // Saving from the editor writes the modifiers back where the server reads them.
    const saved = sandbox.formatSideContentMarkdown(structure);
    assert.deepEqual(parseSideContentFromSectionTokens([{ raw: saved }]), expected, `${name} (saved)`);
  }
});
