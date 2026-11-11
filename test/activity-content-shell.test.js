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
