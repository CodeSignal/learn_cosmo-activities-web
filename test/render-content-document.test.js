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
});
