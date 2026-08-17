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
    /(?:^|\s)aria-live(?:\s*=|[\s/>])/i,
    'activity-container must not dump the whole activity to a live region (audit A1)'
  );
});

test('A1 characterization: learner document has lang and a main landmark', () => {
  const html = read('public/index.html');
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<main class="main">/);
});

test('A5: tray chip is a button with aria-pressed; listitem stays on a wrapper', () => {
  const src = read('public/modules/sort.js');
  const makeChip = sliceFn(src, 'makeChip');
  assert.match(makeChip, /document\.createElement\('button'\)/);
  assert.match(
    makeChip,
    /if\s*\(\s*!placed\s*&&\s*activeItemIndex\s*===\s*itemIndex\s*\)[\s\S]*setAttribute\(\s*'aria-pressed',\s*'true'\s*\)/
  );
  assert.doesNotMatch(makeChip, /setAttribute\(\s*'role',\s*'listitem'\s*\)/);

  const tray = sliceFn(src, 'renderTray');
  assert.doesNotMatch(
    tray,
    /chip\.setAttribute\(\s*'role',\s*'listitem'\s*\)/
  );
  assert.match(tray, /setAttribute\(\s*'role',\s*'listitem'\s*\)/);
  assert.match(tray, /item\.appendChild\(chip\)/);
});

test('A6: category cards are labeled groups, not role=button wrappers around chips', () => {
  const src = read('public/modules/sort.js');
  const cats = sliceFn(src, 'renderCategories');
  assert.doesNotMatch(cats, /card\.setAttribute\(\s*'role',\s*'button'\s*\)/);
  assert.match(cats, /card\.setAttribute\(\s*'role',\s*'group'\s*\)/);
  assert.match(cats, /zone\.appendChild\(makeChip\(idx,\s*\{\s*placed:\s*true\s*\}\)\)/);
  assert.match(cats, /card\.appendChild\(zone\)/);
  assert.match(cats, /head = document\.createElement\('button'\)/);
});

test('A4: render restores focus via data-item-index after rebuild', () => {
  const src = read('public/modules/sort.js');
  assert.match(src, /function render\(\) \{\s*const target = captureFocus\(\);/);
  assert.match(src, /function restoreFocus\(/);
  assert.match(src, /dataset\.itemIndex/);
  assert.match(src, /next\.focus\(\)/);
});

test('A3: filled blank accessible name is the chosen value', () => {
  const server = read('server.js');
  assert.match(
    server,
    /aria-label="blank \$\{currentIndex \+ 1\}"/,
    'server stamps aria-label="blank N" on each empty blank span'
  );

  const src = read('public/modules/fib.js');
  const fn = sliceFn(src, 'updateBlankDisplays');
  assert.match(fn, /blank\.textContent\s*=\s*value/);
  assert.match(
    fn,
    /if\s*\(\s*value\s*\)[\s\S]*removeAttribute\(\s*['"]aria-label['"]\)/,
    'filled blanks drop aria-label so the visible value is the accessible name'
  );
  assert.match(
    fn,
    /setAttribute\(\s*['"]aria-label['"],\s*`blank \$\{i \+ 1\}`/,
    'empty blanks restore the placeholder name'
  );
});

test('A9: side-content iframe has a title from content type', () => {
  const src = read('public/utils/activity-content-shell.js');
  const start = src.indexOf("document.createElement('iframe')");
  const end = src.indexOf('const cleanup', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const block = src.slice(start, end);
  assert.match(block, /activity-content-iframe/);
  assert.match(block, /leftPanel\.appendChild\(iframe\)/);
  assert.match(block, /iframe\.src\s*=/);
  assert.match(
    block,
    /iframe\.title\s*=[\s\S]*\? ['"]Simulation['"] : ['"]Reference['"]/,
    'markdown and external URLs are Reference; /sim/ is Simulation'
  );
  assert.match(
    block,
    /startsWith\(\s*['"]\/sim\//,
    '/sim/ content is titled Simulation'
  );
});

test('A11 characterization: Matching choices are buttons with role=option in a listbox', () => {
  // Wave 1 A11 drops listbox/option on native buttons.
  const src = read('public/modules/matching.js');
  assert.match(src, /role="listbox"/);
  assert.match(src, /createElement\('button'\)/);
  assert.match(src, /setAttribute\(\s*'role',\s*'option'\s*\)/);
});
