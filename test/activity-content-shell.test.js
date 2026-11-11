const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const SHELL = fs.readFileSync(
  path.join(__dirname, '..', 'public/utils/activity-content-shell.js'),
  'utf8'
);

function sandboxTokens() {
  const match = SHELL.match(/iframe\.setAttribute\(\s*'sandbox',\s*'([^']*)'\s*\)/);
  assert.ok(match, 'markdown/HTML content iframe is sandboxed');
  return match[1].trim().split(/\s+/);
}

test('markdown/HTML content iframe lets forms submit', () => {
  const tokens = sandboxTokens();
  assert.ok(tokens.includes('allow-forms'), 'inline apps can submit forms');
  assert.ok(tokens.includes('allow-scripts'));
  assert.ok(tokens.includes('allow-popups'));
  assert.ok(tokens.includes('allow-popups-to-escape-sandbox'));
});

test('markdown/HTML content iframe stays cross-origin to the activity', () => {
  assert.ok(!sandboxTokens().includes('allow-same-origin'));
  assert.doesNotMatch(SHELL, /allow-same-origin/);
});

function allowFeatures(source) {
  return source.split(';').map((feature) => feature.trim()).filter(Boolean);
}

test('URL content iframe may go fullscreen', () => {
  const start = SHELL.indexOf("document.createElement('iframe')");
  const end = SHELL.indexOf('leftPanel.appendChild(iframe)', start);
  const block = SHELL.slice(start, end);
  const allow = block.match(/'allow',\s*hasUrl\s*\?\s*'([^']*)'\s*:\s*'([^']*)'/);
  assert.ok(allow, 'the allow attribute depends on the content type');
  const [, urlAllow, inlineAllow] = allow;
  assert.ok(allowFeatures(urlAllow).includes('fullscreen'), 'URL content gets the fullscreen permission');
  assert.ok(allowFeatures(urlAllow).includes('clipboard-read'));
  assert.ok(allowFeatures(urlAllow).includes('clipboard-write'));
  assert.doesNotMatch(block, /allowfullscreen/, 'allow="fullscreen" covers it; Chrome warns when both are set');
  assert.deepEqual(allowFeatures(inlineAllow), ['clipboard-read', 'clipboard-write'], 'inline content is unchanged');
});
