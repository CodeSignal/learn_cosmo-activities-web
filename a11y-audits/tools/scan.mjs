#!/usr/bin/env node
/**
 * WCAG 2.2 AA audit runner for Cosmo Activities Web.
 * Selects examples via /api/examples/select and scans /play in light + dark.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { activeDescriptor, runPageChecks, sampleFocusRing } from './lib/page-checks.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const EVIDENCE_DIR = path.resolve(__dirname, '../8-13-26/evidence');
const BASE = process.env.A11Y_BASE_URL || 'http://127.0.0.1:3000';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const THEMES = ['light', 'dark'];
const ONLY = new Set(
  (process.env.A11Y_ONLY || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/examples/list`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Examples server did not respond at ${BASE}`);
}

async function ensureServer() {
  try {
    const res = await fetch(`${BASE}/api/examples/list`);
    if (res.ok) {
      console.log('Reusing existing examples server at', BASE);
      return () => {};
    }
  } catch {
    /* start our own */
  }
  console.log('Starting npm run examples…');
  const child = spawn('npm', ['run', 'examples'], {
    cwd: REPO_ROOT,
    env: { ...process.env, SIM_ORIGIN: process.env.SIM_ORIGIN || 'http://127.0.0.1:8080' },
    stdio: 'pipe'
  });
  child.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  await waitForServer();
  return () => {
    child.kill('SIGTERM');
  };
}

async function selectExample(filename) {
  const res = await fetch(`${BASE}/api/examples/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  });
  if (!res.ok) {
    throw new Error(`Failed to select ${filename}: ${res.status} ${await res.text()}`);
  }
}

async function openPlay(page) {
  await page.goto(`${BASE}/play`, { waitUntil: 'load' });
  await page.waitForSelector('#activity-container > *', { timeout: 15000 });
  await sleep(400);
}

async function runAxe(page) {
  const builder = new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .exclude('.activity-content-iframe')
    .exclude('iframe');
  const results = await builder.analyze();
  const slim = (nodes) =>
    nodes.slice(0, 8).map((n) => ({
      html: n.html?.slice(0, 180),
      target: n.target
    }));
  return {
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      tags: v.tags,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: slim(v.nodes)
    })),
    incomplete: results.incomplete.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: slim(v.nodes)
    })),
    passes: results.passes.length
  };
}

function scenario(id, example, setup) {
  return { id, example, setup };
}

const SCENARIOS = [
  scenario('shell-no-side', 'fib-simple.md', async () => {}),
  scenario('shell-split-markdown', 'side-content-markdown-table.md', async (page) => {
    await page.waitForSelector('.split-panel-divider', { timeout: 10000 });
    await sleep(600);
  }),
  scenario('shell-split-url', 'mcq-with-url-content.md', async (page) => {
    await page.waitForSelector('.split-panel-divider', { timeout: 10000 });
    await sleep(400);
  }),
  scenario('shell-split-sim', 'matching-split-screen-sim.md', async (page) => {
    await page.waitForSelector('.split-panel-divider', { timeout: 10000 });
    await sleep(400);
  }),
  scenario('shell-scroll-indicator', 'mcq-big-question.md', async (page) => {
    await sleep(300);
  }),

  scenario('fib-unanswered', 'fib-simple.md', async () => {}),
  scenario('fib-dropdown-open', 'fib-simple.md', async (page) => {
    const blank = page.locator('.blank').first();
    await blank.focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('.fib-dropdown', { timeout: 5000 });
  }),
  scenario('fib-keyboard-in-menu', 'fib-simple.md', async (page) => {
    await page.locator('.blank').first().focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('.fib-dropdown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
  }),
  scenario('fib-filled', 'fib-simple.md', async (page) => {
    await page.locator('.blank').first().press('Enter');
    await page.waitForSelector('.fib-option', { timeout: 5000 });
    await page.locator('.fib-option').first().click();
  }),
  scenario('fib-table', 'fib-markdown-table-inline-blanks.md', async () => {}),
  scenario('fib-latex', 'fib-latex.md', async (page) => {
    await sleep(500);
  }),

  scenario('matching-empty', 'matching.md', async (page) => {
    await page.waitForSelector('.matching-selection-area');
    await sleep(400);
  }),
  scenario('matching-focused', 'matching.md', async (page) => {
    await page.waitForSelector('.matching-selection-area');
    await sleep(400);
    await page.locator('.matching-selection-area').first().focus();
  }),
  scenario('matching-one-matched', 'matching.md', async (page) => {
    await page.waitForSelector('.matching-choice-button');
    await sleep(400);
    await page.locator('.matching-choice-button:not([disabled])').first().click();
    await sleep(400);
  }),
  scenario('matching-latex', 'matching-latex.md', async (page) => {
    await sleep(500);
  }),

  scenario('matrix-unanswered', 'matrix.md', async () => {}),
  scenario('matrix-selected', 'matrix.md', async (page) => {
    await page.locator('label.input-radio').first().click();
  }),
  scenario('matrix-validate', 'matrix.md', async (page) => {
    await page.locator('label.input-radio').first().click();
    await fetch(`${BASE}/validate`, { method: 'POST' });
    await sleep(400);
  }),
  scenario('matrix-markdown', 'matrix-markdown-table.md', async () => {}),

  scenario('mcq-unanswered', 'mcq.md', async () => {}),
  scenario('mcq-selected-explain', 'mcq.md', async (page) => {
    await page.locator('.mcq-option').first().click();
  }),
  scenario('mcq-validate', 'mcq.md', async (page) => {
    await page.locator('.mcq-option').first().click();
    await fetch(`${BASE}/validate`, { method: 'POST' });
    await sleep(400);
  }),
  scenario('mcq-two-questions', 'mcq-2-questions.md', async () => {}),
  scenario('mcq-multiselect', 'mcq-full-spread.md', async (page) => {
    await page.locator('.mcq-option').first().click();
  }),

  scenario('sort-tray', 'sort-into-boxes.md', async () => {}),
  scenario('sort-chip-selected', 'sort-into-boxes.md', async (page) => {
    await page.locator('.categorization-chip').first().click();
  }),
  scenario('sort-keyboard-place', 'sort-into-boxes.md', async (page) => {
    await page.locator('.categorization-chip').first().focus();
    await page.keyboard.press('Enter');
    await page.locator('.categorization-category').first().focus();
    await page.keyboard.press('Enter');
    await sleep(200);
  }),
  scenario('sort-focus-survival', 'sort-into-boxes.md', async (page) => {
    const first = page.locator('.categorization-chip').first();
    await first.focus();
    await page.locator('.categorization-chip').nth(1).click();
  }),
  scenario('sort-validate', 'sort-into-boxes.md', async (page) => {
    await page.locator('.categorization-chip').first().click();
    await page.locator('.categorization-category').nth(1).click();
    await fetch(`${BASE}/validate`, { method: 'POST' });
    await sleep(400);
  }),
  scenario('sort-three-categories', 'sort-into-boxes-three-categories.md', async () => {}),

  scenario('text-unanswered', 'text-input-simple.md', async () => {}),
  scenario('text-filled', 'text-input-simple.md', async (page) => {
    await page.locator('.text-input-field').first().fill('Paris');
  }),
  scenario('text-advanced', 'text-input-advanced.md', async (page) => {
    await page.locator('.text-input-field').first().fill('Paris');
  }),
  scenario('text-validate', 'text-input-simple.md', async (page) => {
    await page.locator('.text-input-field').first().fill('zzz');
    await fetch(`${BASE}/validate`, { method: 'POST' });
    await sleep(400);
  })
];

async function extraWidgetChecks(page, scenarioId) {
  const extras = {};
  if (scenarioId === 'fib-dropdown-open' || scenarioId === 'fib-keyboard-in-menu') {
    extras.focusRing = await page.evaluate(sampleFocusRing);
    extras.active = await page.evaluate(activeDescriptor);
    extras.dropdownStillOpen = await page.locator('.fib-dropdown').count();
  }
  if (scenarioId === 'matching-focused') {
    extras.focusRing = await page.evaluate(sampleFocusRing);
  }
  if (scenarioId === 'sort-focus-survival') {
    extras.active = await page.evaluate(activeDescriptor);
  }
  if (scenarioId === 'sort-chip-selected') {
    extras.pressed = await page.locator('.categorization-chip[aria-pressed="true"]').count();
  }
  if (scenarioId === 'shell-split-markdown') {
    await page.locator('.split-panel-divider').focus();
    extras.dividerFocus = await page.evaluate(sampleFocusRing);
    extras.dividerActive = await page.evaluate(activeDescriptor);
  }
  if (scenarioId === 'fib-unanswered' || scenarioId === 'shell-no-side') {
    await page.locator('.blank').first().focus();
    extras.blankFocusRing = await page.evaluate(sampleFocusRing);
    await page.locator('[data-tool-id="fib-clear-all"]').focus();
    extras.toolbarFocusRing = await page.evaluate(sampleFocusRing);
  }
  return extras;
}

async function runScenario(browser, theme, spec) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  const record = {
    id: spec.id,
    example: spec.example,
    theme,
    error: null
  };
  try {
    await selectExample(spec.example);
    await openPlay(page);
    await spec.setup(page);
    const shotName = `${spec.id}--${theme}.png`;
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, shotName),
      fullPage: true
    });
    record.screenshot = shotName;
    record.axe = await runAxe(page);
    record.page = await page.evaluate(runPageChecks);
    record.extras = await extraWidgetChecks(page, spec.id);
  } catch (err) {
    record.error = String(err && err.stack ? err.stack : err);
    console.error(`FAIL ${spec.id} ${theme}:`, err.message || err);
    try {
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `${spec.id}--${theme}--error.png`),
        fullPage: true
      });
    } catch {
      /* ignore */
    }
  }
  await context.close();
  return record;
}

async function mobileSpotCheck(browser) {
  const context = await browser.newContext({
    colorScheme: 'light',
    viewport: { width: 375, height: 667 }
  });
  const page = await context.newPage();
  const record = { id: 'mobile-mcq-big', example: 'mcq-big-question.md', theme: 'light', viewport: '375x667' };
  try {
    await selectExample('mcq-big-question.md');
    await openPlay(page);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'mobile-mcq-big--light.png'),
      fullPage: true
    });
    record.axe = await runAxe(page);
    record.page = await page.evaluate(runPageChecks);
  } catch (err) {
    record.error = String(err);
  }
  await context.close();
  return record;
}

function summarize(records) {
  const axeByRule = {};
  for (const rec of records) {
    if (!rec.axe) continue;
    for (const v of rec.axe.violations) {
      axeByRule[v.id] ??= { help: v.help, impact: v.impact, states: [] };
      axeByRule[v.id].states.push(`${rec.id}/${rec.theme} (${v.nodes.length})`);
    }
  }
  return { axeByRule, totalStates: records.length, errors: records.filter((r) => r.error).length };
}

async function main() {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const stopServer = await ensureServer();
  const browser = await chromium.launch({ headless: true });
  const records = [];
  try {
    for (const spec of SCENARIOS) {
      if (ONLY.size && !ONLY.has(spec.id)) continue;
      for (const theme of THEMES) {
        process.stdout.write(`Scanning ${spec.id} (${theme})… `);
        const rec = await runScenario(browser, theme, spec);
        records.push(rec);
        const axeN = rec.axe ? rec.axe.violations.length : 'err';
        console.log(rec.error ? 'ERROR' : `axe violations=${axeN}`);
      }
    }
    if (!ONLY.size) {
      records.push(await mobileSpotCheck(browser));
    } else {
      const prevPath = path.join(EVIDENCE_DIR, 'report.json');
      try {
        const prev = JSON.parse(await (await import('node:fs/promises')).readFile(prevPath, 'utf8'));
        const keep = (prev.records || []).filter((r) => !ONLY.has(r.id));
        records.unshift(...keep);
      } catch {
        /* no previous report */
      }
    }
  } finally {
    await browser.close();
    stopServer();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    standard: 'WCAG 2.2 AA',
    base: BASE,
    axeTags: AXE_TAGS,
    playwright: require('playwright/package.json').version,
    summary: summarize(records),
    records
  };
  const out = path.join(EVIDENCE_DIR, 'report.json');
  await writeFile(out, JSON.stringify(report, null, 2));
  console.log('\nWrote', out);
  console.log('States:', report.summary.totalStates, 'errors:', report.summary.errors);
  console.log('Axe rules fired:');
  for (const [id, info] of Object.entries(report.summary.axeByRule)) {
    console.log(`  ${id} [${info.impact}] ${info.help} — ${info.states.length} states`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
