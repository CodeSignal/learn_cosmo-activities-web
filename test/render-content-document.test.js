const fs = require('node:fs');
const path = require('node:path');
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
  const documentFamilies = [...doc.matchAll(/--code-family:\s*"([^"]+)"/g)].map((m) => m[1]);
  const codeFamily = documentFamilies.length ? documentFamilies.pop() : designSystemFamily;
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
