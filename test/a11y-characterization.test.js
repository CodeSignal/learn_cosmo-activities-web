const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function sliceFn(src, name) {
  const start = src.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `missing function ${name}`);
  const next = src.indexOf('\n  function ', start + 1);
  const end = next === -1 ? src.length : next;
  return src.slice(start, end);
}

test('A1: #activity-container is not a live region', () => {
  const html = read('public/index.html');
  const open = html.match(/<div id="activity-container"[^>]*>/);
  assert.ok(open, 'activity-container exists');
  assert.doesNotMatch(
    open[0],
    /aria-live/,
    'activity-container must not dump the whole activity to a live region (audit A1)'
  );
});

test('A1 characterization: learner document has lang and a main landmark', () => {
  const html = read('public/index.html');
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<main class="main">/);
});

test('A5 characterization: the same tray chip is a button with role=listitem and aria-pressed', () => {
  // Wave 1 Sort widget PR must not leave role=listitem on the same node as aria-pressed.
  const src = read('public/modules/sort.js');
  const makeChip = sliceFn(src, 'makeChip');
  assert.match(makeChip, /document\.createElement\('button'\)/);
  assert.match(
    makeChip,
    /if\s*\(\s*!placed\s*&&\s*activeItemIndex\s*===\s*itemIndex\s*\)[\s\S]*setAttribute\(\s*'aria-pressed',\s*'true'\s*\)/
  );

  const tray = sliceFn(src, 'renderTray');
  assert.match(
    tray,
    /const chip = makeChip\(idx,\s*\{\s*placed:\s*false\s*\}\);\s*chip\.setAttribute\(\s*'role',\s*'listitem'\s*\)/
  );
});

test('A6 characterization: category role=button cards nest placed chip buttons', () => {
  const src = read('public/modules/sort.js');
  const cats = sliceFn(src, 'renderCategories');
  assert.match(cats, /card\.setAttribute\(\s*'role',\s*'button'\s*\)/);
  assert.match(cats, /zone\.appendChild\(makeChip\(idx,\s*\{\s*placed:\s*true\s*\}\)\)/);
  assert.match(cats, /card\.appendChild\(zone\)/);
});

test('A3 characterization: filled blank accessible name stays "blank N"', () => {
  const server = read('server.js');
  assert.match(
    server,
    /aria-label="blank \$\{currentIndex \+ 1\}"/,
    'server stamps aria-label="blank N" on each blank span'
  );

  const src = read('public/modules/fib.js');
  const fn = sliceFn(src, 'updateBlankDisplays');
  assert.match(fn, /blank\.textContent\s*=\s*value/);
  assert.doesNotMatch(
    fn,
    /aria-label/,
    'updateBlankDisplays never updates the accessible name when filling a blank'
  );
});

test('A9 characterization: side-content iframe is created and sourced without a title', () => {
  // Wave 1 A9 should set title (or aria-label) on the iframe.
  const src = read('public/utils/activity-content-shell.js');
  const start = src.indexOf("document.createElement('iframe')");
  const end = src.indexOf('const cleanup', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const block = src.slice(start, end);
  assert.match(block, /activity-content-iframe/);
  assert.match(block, /leftPanel\.appendChild\(iframe\)/);
  assert.match(block, /iframe\.src\s*=/);
  assert.doesNotMatch(block, /\.title\s*=/);
  assert.doesNotMatch(block, /setAttribute\(\s*['"]title['"]/);
  assert.doesNotMatch(block, /setAttribute\(\s*['"]aria-label['"]/);
});

test('A11 characterization: Matching choices are buttons with role=option in a listbox', () => {
  // Wave 1 A11 drops listbox/option on native buttons.
  const src = read('public/modules/matching.js');
  assert.match(src, /role="listbox"/);
  assert.match(src, /createElement\('button'\)/);
  assert.match(src, /setAttribute\(\s*'role',\s*'option'\s*\)/);
});
