const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('A1 characterization: #activity-container is a polite live region', () => {
  // Wave 1 A1 removes aria-live from this node and should flip this assertion.
  const html = read('public/index.html');
  assert.match(
    html,
    /id="activity-container"[^>]*aria-live="polite"/,
    'activity-container currently dumps the whole activity to a live region (audit A1)'
  );
});

test('A1 characterization: learner document has lang and a main landmark', () => {
  const html = read('public/index.html');
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<main class="main">/);
});

test('A5 characterization: tray chips set role=listitem on the button', () => {
  // Wave 1 Sort widget PR must not leave role=listitem on the same node as aria-pressed.
  const src = read('public/modules/sort.js');
  assert.match(src, /chip\.setAttribute\(\s*'role',\s*'listitem'\s*\)/);
  assert.match(src, /setAttribute\(\s*'aria-pressed'/);
});

test('A6 characterization: category cards are role=button wrapping placed chips', () => {
  const src = read('public/modules/sort.js');
  assert.match(src, /card\.setAttribute\(\s*'role',\s*'button'\s*\)/);
  assert.match(src, /makeChip\(idx,\s*\{\s*placed:\s*true\s*\}\)/);
});

test('A3 characterization: updateBlankDisplays does not clear aria-label', () => {
  const src = read('public/modules/fib.js');
  const start = src.indexOf('function updateBlankDisplays');
  const end = src.indexOf('function handleOutsideScroll', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const fn = src.slice(start, end);
  assert.doesNotMatch(
    fn,
    /removeAttribute\(\s*['"]aria-label['"]\s*\)/,
    'filled blanks still keep aria-label="blank N" (audit A3)'
  );
});

test('A9 characterization: side-content iframe is created without a title', () => {
  // Wave 1 A9 should set title (or aria-label) before appending the iframe.
  const src = read('public/utils/activity-content-shell.js');
  const start = src.indexOf("document.createElement('iframe')");
  const end = src.indexOf('leftPanel.appendChild(iframe)', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const create = src.slice(start, end);
  assert.match(create, /activity-content-iframe/);
  assert.doesNotMatch(create, /\.title\s*=/);
  assert.doesNotMatch(create, /setAttribute\(\s*['"]title['"]/);
  assert.doesNotMatch(create, /setAttribute\(\s*['"]aria-label['"]/);
});

test('A11 characterization: Matching choices are buttons with role=option in a listbox', () => {
  // Wave 1 A11 drops listbox/option on native buttons.
  const src = read('public/modules/matching.js');
  assert.match(src, /role="listbox"/);
  assert.match(src, /createElement\('button'\)/);
  assert.match(src, /setAttribute\(\s*'role',\s*'option'\s*\)/);
});
