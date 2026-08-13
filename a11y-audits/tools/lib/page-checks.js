/**
 * Browser-side checks Playwright injects via page.evaluate.
 * Must stay serializable (no Node closures).
 */

export function runPageChecks() {
  const effectiveOpacity = (el) => {
    let o = 1;
    let n = el;
    while (n && n !== document.documentElement) {
      const op = getComputedStyle(n).opacity;
      o *= op === '' ? 1 : Number(op);
      n = n.parentElement;
    }
    return o;
  };

  const isVisible = (el) => {
    if (!el || !(el instanceof Element)) return false;
    if (effectiveOpacity(el) === 0) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const parseRgba = (str) => {
    if (!str || str === 'transparent') return [0, 0, 0, 0];
    const m = String(str).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (!m) return [0, 0, 0, 0];
    return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  };

  const composite = (fg, bg) => {
    const a = fg[3];
    if (a >= 1) return [fg[0], fg[1], fg[2], 1];
    return [
      fg[0] * a + bg[0] * (1 - a),
      fg[1] * a + bg[1] * (1 - a),
      fg[2] * a + bg[2] * (1 - a),
      1
    ];
  };

  const relLum = (rgb) => {
    const f = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  };

  const contrastRatio = (a, b) => {
    const l1 = relLum(a);
    const l2 = relLum(b);
    const hi = Math.max(l1, l2);
    const lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  };

  const effectiveBackground = (el) => {
    let bg = [255, 255, 255, 1];
    const stack = [];
    let n = el;
    while (n && n !== document.documentElement) {
      stack.push(n);
      n = n.parentElement;
    }
    stack.push(document.documentElement);
    stack.reverse();
    for (const node of stack) {
      const style = getComputedStyle(node);
      const parsed = parseRgba(style.backgroundColor);
      const op = style.opacity === '' ? 1 : Number(style.opacity);
      const withOp = [parsed[0], parsed[1], parsed[2], parsed[3] * op];
      if (withOp[3] > 0) bg = composite(withOp, bg);
    }
    return bg;
  };

  const isDisabled = (el) => {
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return true;
    if (el.closest('[disabled], [aria-disabled="true"]')) return true;
    return false;
  };

  const isLargeText = (el) => {
    const style = getComputedStyle(el);
    const px = parseFloat(style.fontSize);
    const weight = style.fontWeight;
    const bold = weight === 'bold' || Number(weight) >= 700;
    return (bold && px >= 18.66) || px >= 24;
  };

  // --- landmarks / structure ---
  const landmarks = [...document.querySelectorAll('[role], main, nav, header, footer, aside, form')].map((el) => ({
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute('role') || el.tagName.toLowerCase(),
    name: (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '').slice(0, 80)
  }));

  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')].map((el) => ({
    tag: el.tagName.toLowerCase(),
    level: el.getAttribute('aria-level') || el.tagName[1],
    text: (el.textContent || '').trim().slice(0, 80)
  }));

  const iframes = [...document.querySelectorAll('iframe')].map((el) => ({
    src: (el.getAttribute('src') || '').slice(0, 120),
    title: el.getAttribute('title'),
    ariaLabel: el.getAttribute('aria-label')
  }));

  const liveRegions = [...document.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]')].map((el) => ({
    id: el.id,
    live: el.getAttribute('aria-live'),
    role: el.getAttribute('role'),
    childCount: el.children.length,
    htmlLength: el.innerHTML.length
  }));

  const skipLinks = [...document.querySelectorAll('a[href^="#"]')].filter((a) =>
    /skip/i.test(a.textContent || a.getAttribute('aria-label') || '')
  ).map((a) => a.getAttribute('href'));

  // --- tab order ---
  const tabbableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(',');

  const tabStops = [...document.querySelectorAll(tabbableSelector)]
    .filter(isVisible)
    .map((el) => {
      const style = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        id: el.id,
        className: String(el.className).slice(0, 80),
        tabIndex: el.tabIndex,
        name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60),
        outline: style.outline,
        boxShadow: style.boxShadow
      };
    });

  // --- nested interactives ---
  const interactiveSelector = 'a[href], button, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';
  const nestedInteractives = [];
  document.querySelectorAll(interactiveSelector).forEach((outer) => {
    if (!isVisible(outer)) return;
    outer.querySelectorAll(interactiveSelector).forEach((inner) => {
      if (inner === outer || !isVisible(inner)) return;
      nestedInteractives.push({
        outer: `${outer.tagName.toLowerCase()}.${String(outer.className).slice(0, 40)} role=${outer.getAttribute('role')}`,
        inner: `${inner.tagName.toLowerCase()}.${String(inner.className).slice(0, 40)} role=${inner.getAttribute('role')}`
      });
    });
  });

  // --- target size (2.5.8) ---
  const targetSizes = [];
  document.querySelectorAll(interactiveSelector).forEach((el) => {
    if (!isVisible(el) || isDisabled(el)) return;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const inline = style.display.includes('inline') && el.parentElement && getComputedStyle(el.parentElement).display.includes('inline') === false
      ? style.display.includes('inline') && !style.display.includes('flex') && !style.display.includes('grid')
      : style.display === 'inline' || style.display === 'inline-flex';
    if (rect.width + 0.5 < 24 || rect.height + 0.5 < 24) {
      targetSizes.push({
        tag: el.tagName.toLowerCase(),
        className: String(el.className).slice(0, 60),
        role: el.getAttribute('role'),
        name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 50),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        display: style.display,
        possiblyInline: inline || el.classList.contains('blank')
      });
    }
  });

  // --- contrast of visible text ---
  const contrastFails = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = (node.textContent || '').trim();
      if (!text) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || !isVisible(parent)) return NodeFilter.FILTER_REJECT;
      if (parent.closest('script, style, noscript, [aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
      if (isDisabled(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const seen = new Set();
  while (walker.nextNode()) {
    const parent = walker.currentNode.parentElement;
    if (!parent || seen.has(parent)) continue;
    seen.add(parent);
    const style = getComputedStyle(parent);
    const fgParsed = parseRgba(style.color);
    const op = effectiveOpacity(parent);
    const fg = [fgParsed[0], fgParsed[1], fgParsed[2], fgParsed[3] * op];
    const bg = effectiveBackground(parent);
    const painted = composite(fg, bg);
    const ratio = contrastRatio(painted, bg);
    const large = isLargeText(parent);
    const min = large ? 3 : 4.5;
    if (ratio + 0.01 < min) {
      contrastFails.push({
        text: (parent.textContent || '').trim().slice(0, 60),
        selector: `${parent.tagName.toLowerCase()}.${String(parent.className).slice(0, 50)}`,
        ratio: Math.round(ratio * 100) / 100,
        min,
        large,
        fg: style.color,
        bg: `rgb(${bg.map((n) => Math.round(n)).slice(0, 3).join(',')})`
      });
    }
    if (contrastFails.length >= 40) break;
  }

  // --- widget snapshots ---
  const blanks = [...document.querySelectorAll('.blank')].map((el) => ({
    ariaLabel: el.getAttribute('aria-label'),
    role: el.getAttribute('role'),
    expanded: el.getAttribute('aria-expanded'),
    haspopup: el.getAttribute('aria-haspopup'),
    text: (el.textContent || '').trim(),
    tabIndex: el.tabIndex,
    empty: el.classList.contains('empty')
  }));

  const fibDropdown = document.querySelector('.fib-dropdown');
  const fibOptions = fibDropdown
    ? [...fibDropdown.querySelectorAll('[role="option"], .fib-option')].map((el) => ({
        role: el.getAttribute('role'),
        tabIndex: el.tabIndex,
        ariaSelected: el.getAttribute('aria-selected')
      }))
    : [];

  const matchingChoices = document.querySelector('#matching-choices');
  const matchingChoiceButtons = matchingChoices
    ? [...matchingChoices.querySelectorAll('button, [role="option"]')].map((el) => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        disabled: el.disabled,
        ariaLabel: el.getAttribute('aria-label')
      }))
    : [];

  const katex = document.querySelectorAll('.katex').length;
  const katexAriaHidden = document.querySelectorAll('.katex[aria-hidden="true"], .katex .katex-html[aria-hidden]').length;

  const errorIcons = [...document.querySelectorAll('[class*="error-icon"]')].map((el) => ({
    className: el.className,
    ariaHidden: el.getAttribute('aria-hidden'),
    role: el.getAttribute('role'),
    label: el.getAttribute('aria-label')
  }));

  const invalidEls = [...document.querySelectorAll('[aria-invalid="true"]')].map((el) => ({
    className: String(el.className).slice(0, 60),
    describedby: el.getAttribute('aria-describedby')
  }));

  const htmlLang = document.documentElement.lang;

  const toolbar = document.getElementById('global-toolbar');
  const toolbarInfo = toolbar
    ? {
        inMain: !!toolbar.closest('main'),
        buttons: [...toolbar.querySelectorAll('button')].map((b) => ({
          label: b.getAttribute('aria-label'),
          disabled: b.disabled
        }))
      }
    : null;

  const splitDivider = document.querySelector('.split-panel-divider');
  const splitInfo = splitDivider
    ? {
        role: splitDivider.getAttribute('role'),
        label: splitDivider.getAttribute('aria-label'),
        valuemin: splitDivider.getAttribute('aria-valuemin'),
        valuemax: splitDivider.getAttribute('aria-valuemax'),
        valuenow: splitDivider.getAttribute('aria-valuenow'),
        tabIndex: splitDivider.tabIndex,
        width: Math.round(splitDivider.getBoundingClientRect().width * 10) / 10,
        height: Math.round(splitDivider.getBoundingClientRect().height * 10) / 10
      }
    : null;

  const scrollIndicator = document.querySelector('.scroll-indicator');
  const scrollInfo = scrollIndicator
    ? {
        visible: scrollIndicator.classList.contains('visible'),
        ariaHidden: scrollIndicator.getAttribute('aria-hidden'),
        role: scrollIndicator.getAttribute('role')
      }
    : null;

  return {
    title: document.title,
    htmlLang,
    landmarks,
    headings,
    iframes,
    liveRegions,
    skipLinks,
    tabStops,
    nestedInteractives,
    targetSizes,
    contrastFails,
    blanks,
    fibDropdownOpen: !!fibDropdown,
    fibOptions,
    matchingChoicesRole: matchingChoices ? matchingChoices.getAttribute('role') : null,
    matchingChoiceButtons,
    katex,
    katexAriaHidden,
    errorIcons,
    invalidEls,
    toolbarInfo,
    splitInfo,
    scrollInfo,
    nextButtonsInDom: document.querySelectorAll('.text-input-next-button, .mcq-next-button').length,
    textInputNextContainers: document.querySelectorAll('.text-input-next-button-container').length
  };
}

export function sampleFocusRing() {
  const el = document.activeElement;
  if (!el || el === document.body) {
    return { focused: false };
  }
  const style = getComputedStyle(el);
  return {
    focused: true,
    tag: el.tagName.toLowerCase(),
    className: String(el.className).slice(0, 80),
    outline: style.outline,
    outlineWidth: style.outlineWidth,
    outlineColor: style.outlineColor,
    boxShadow: style.boxShadow,
    outlineOffset: style.outlineOffset
  };
}

export function activeDescriptor() {
  const el = document.activeElement;
  if (!el) return null;
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id,
    className: String(el.className).slice(0, 80),
    name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60)
  };
}
