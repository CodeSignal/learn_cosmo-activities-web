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

// Same WCAG relative-luminance / contrast math as a11y-audits/tools/lib/page-checks.js.
function hexToRgb(hex) {
  const n = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
}

function relLum(rgb) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

function contrastRatio(a, b) {
  const l1 = relLum(a);
  const l2 = relLum(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function baseColorHex() {
  const css = read('public/design-system/colors/colors.css');
  const map = {};
  const re = /(--Colors-Base-[A-Za-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\b/g;
  let m;
  while ((m = re.exec(css))) map[m[1]] = m[2];
  return map;
}

function darkChoiceAliases(css) {
  const dark = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
  const alias = (prop) => {
    const m = dark.match(new RegExp(`${prop}:\\s*var\\((--Colors-Base-[A-Za-z0-9-]+)\\)`));
    assert.ok(m, `dark ${prop} must alias a --Colors-Base-* token`);
    return m[1];
  };
  return {
    fg: alias('--Colors-Learn-Practice-Interactive-Choice-Main-Label'),
    bg: alias('--Colors-Learn-Practice-Interactive-Choice-Main-Background'),
    hover: alias('--Colors-Learn-Practice-Interactive-Choice-Main-Background-Hover')
  };
}

function assertChoiceContrast(file, hex, aliases, which, token) {
  const fg = hex[aliases.fg];
  const bg = hex[token];
  assert.ok(fg, `${file}: unresolved ${aliases.fg}`);
  assert.ok(bg, `${file}: unresolved ${token}`);
  const ratio = contrastRatio(hexToRgb(fg), hexToRgb(bg));
  assert.ok(
    ratio + 0.01 >= 4.5,
    `${file} dark ${which} ${aliases.fg} (${fg}) on ${token} (${bg}) is ${ratio.toFixed(2)}:1, need 4.5:1`
  );
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

test('A2: FIB listbox is named and keyboard-operable', () => {
  const src = read('public/modules/fib.js');
  const open = sliceFn(src, 'openMenuForBlank');
  const close = sliceFn(src, 'closeMenu');
  const keys = sliceFn(src, 'handleMenuKeydown');

  assert.match(open, /setAttribute\(\s*['"]role['"],\s*['"]listbox['"]\)/);
  assert.match(open, /setAttribute\(\s*['"]aria-labelledby['"]/);
  assert.match(open, /setAttribute\(\s*['"]aria-controls['"]/);
  assert.match(open, /createElement\('div'\)/);
  assert.doesNotMatch(open, /createElement\('button'\)/);
  assert.match(open, /setAttribute\(\s*['"]role['"],\s*['"]option['"]\)/);
  assert.match(close, /removeAttribute\(\s*['"]aria-controls['"]\)/);

  assert.match(keys, /ArrowDown/);
  assert.match(keys, /ArrowUp/);
  assert.match(keys, /['"]Enter['"]/);
  assert.match(keys, /Escape/);
  assert.match(keys, /Tab/);
});

test('A10: validate errors are named, invalid, and announced', () => {
  const html = read('public/index.html');
  assert.match(html, /id="activity-status"[^>]*role="status"/);
  assert.doesNotMatch(
    html,
    /id="activity-container"[^>]*aria-live/i,
    'status lives on #activity-status, not #activity-container'
  );

  const util = read('public/utils/validate-status.js');
  assert.match(util, /This answer is incorrect\./);
  assert.match(util, /function setValidateStatus/);
  assert.match(util, /setAttribute\(\s*['"]aria-invalid['"],\s*['"]true['"]\)/);

  for (const file of ['mcq.js', 'text-input.js', 'matrix.js', 'sort.js']) {
    const src = read(`public/modules/${file}`);
    assert.match(src, /setValidateStatus/, `${file} updates the status region`);
  }

  const mcqIcon = sliceFn(read('public/modules/mcq.js'), 'addErrorIcon');
  assert.match(mcqIcon, /aria-hidden/);
  const textIcon = sliceFn(read('public/modules/text-input.js'), 'addErrorIcon');
  assert.match(textIcon, /aria-hidden/);

  const sortChip = sliceFn(read('public/modules/sort.js'), 'makeChip');
  assert.match(sortChip, /setControlInvalid\(chip,\s*['"]sort-validate-error['"]\)/);
  assert.match(read('public/modules/sort.js'), /INCORRECT_ANSWER_TEXT/);
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

test('A11: Matching choices are a labeled group of buttons', () => {
  const src = read('public/modules/matching.js');
  assert.doesNotMatch(src, /role="listbox"/);
  assert.doesNotMatch(src, /setAttribute\(\s*'role',\s*'option'\s*\)/);
  assert.match(src, /id="matching-choices"[^>]*role="group"/);
  assert.match(src, /aria-label="Answer choices"/);
  assert.match(src, /createElement\('button'\)/);
  assert.match(src, /choiceButton\.disabled\s*=\s*true/);
});

test('A7: dark choice default and hover contrast are at least 4.5:1', () => {
  const hex = baseColorHex();
  for (const file of ['public/modules/matching.css', 'public/modules/sort.css']) {
    const aliases = darkChoiceAliases(read(file));
    assertChoiceContrast(file, hex, aliases, 'fill', aliases.bg);
    assertChoiceContrast(file, hex, aliases, 'hover', aliases.hover);
  }
});

test('A8: Sort instructions meet 4.5:1 in light and keep the click-or-drag copy', () => {
  const sortJs = read('public/modules/sort.js');
  assert.match(
    sortJs,
    /Click or drag the items onto the cards above/,
    'instruction copy stays put (P8 / A14 is out of this plan)'
  );

  const sortCss = read('public/modules/sort.css');
  const colorM = sortCss.match(
    /\.categorization-instructions-text\s*\{[^}]*color:\s*var\((--Colors-Text-Body-[A-Za-z]+)\)/
  );
  assert.ok(colorM, 'instructions text sets a Body color token');
  assert.notEqual(
    colorM[1],
    '--Colors-Text-Body-Lighter',
    'body-xxsmall must not use Body-Lighter'
  );

  const colorsCss = read('public/design-system/colors/colors.css');
  const light = colorsCss.slice(0, colorsCss.indexOf('@media (prefers-color-scheme: dark)'));
  const resolve = (prop) => {
    const m = light.match(new RegExp(`${prop}:\\s*var\\((--Colors-Base-[A-Za-z0-9-]+)\\)`));
    assert.ok(m, `light ${prop} aliases a base token`);
    return m[1];
  };
  const hex = baseColorHex();
  const fgToken = resolve(colorM[1]);
  const bgToken = resolve('--Colors-Backgrounds-Main-Default');
  const fg = hex[fgToken];
  const bg = hex[bgToken];
  assert.ok(fg && bg, `unresolved ${fgToken} or ${bgToken}`);
  const ratio = contrastRatio(hexToRgb(fg), hexToRgb(bg));
  assert.ok(
    ratio + 0.01 >= 4.5,
    `instructions ${colorM[1]} (${fg}) on Main-Default (${bg}) is ${ratio.toFixed(2)}:1, need 4.5:1`
  );
});

test('D1: inactive cards keep full-contrast text', () => {
  const css = read('public/design-system/components/horizontal-cards/horizontal-cards.css');
  const inactive = css.match(
    /\.horizontal-cards-card:not\(\.horizontal-cards-card-active\)\s*\{[^}]+\}/
  );
  assert.ok(inactive, 'inactive card rule exists');
  assert.doesNotMatch(inactive[0], /opacity\s*:/);
  assert.match(inactive[0], /box-shadow:\s*inset/);

  const js = read('public/design-system/components/horizontal-cards/horizontal-cards.js');
  assert.doesNotMatch(js, /aria-hidden/);
});

test('A17: Matrix table is a native table, not role=grid', () => {
  const src = read('public/modules/matrix.js');
  assert.match(src, /<table class="matrix-table" id="matrix-table" aria-label="Matrix question">/);
  assert.doesNotMatch(src, /role="grid"/);
});

test('A16: scroll indicator is hidden from AT', () => {
  const src = read('public/app.js');
  const init = sliceFn(src, 'initScrollIndicator');
  assert.match(init, /className\s*=\s*'scroll-indicator'/);
  assert.match(init, /setAttribute\(\s*'aria-hidden',\s*'true'\s*\)/);
  assert.doesNotMatch(init, /scroll for more/i);
});

test('A18: MCQ fieldset is named from existing question UI; options use the visible label', () => {
  const src = read('public/modules/mcq.js');
  assert.match(src, /createElement\('fieldset'\)/);
  assert.match(src, /setAttribute\(\s*'aria-labelledby'/);
  assert.doesNotMatch(src, /aria-label['"],\s*`Option /);
});

test('D2: split divider is named and uses a 24px pointer target', () => {
  const js = read('public/design-system/components/split-panel/split-panel.js');
  assert.match(js, /['"]Resize reference panel['"]/);
  assert.match(js, /setAttribute\('aria-label'/);

  const css = read('public/design-system/components/split-panel/split-panel.css');
  const container = css.match(/\.split-panel-container\s*\{[^}]+\}/);
  assert.ok(container, 'container rule exists');
  assert.doesNotMatch(container[0], /min-width:\s*24px/);
  assert.doesNotMatch(container[0], /min-height:\s*24px/);
  assert.match(css, /padding:\s*0 10px/);
  assert.match(css, /\.split-panel-divider\s*\{[\s\S]*?min-height:\s*24px/);
});

test('D3: split divider line uses Neutral-800, not a hardcoded hex', () => {
  const css = read('public/design-system/components/split-panel/split-panel.css');
  assert.doesNotMatch(css, /#2b3b52/i);
  assert.match(
    css,
    /--Colors-Split-Panel-Divider-Line:\s*var\(--Colors-Base-Neutral-800\)/
  );
  const after = css.match(/\.split-panel-divider::after\s*\{[^}]+\}/);
  assert.ok(after, 'horizontal ::after rule exists');
  assert.match(after[0], /background:\s*var\(--Colors-Split-Panel-Divider-Line\)/);
});
