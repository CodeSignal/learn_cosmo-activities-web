#!/usr/bin/env node
/**
 * Shrink-only axe CI for the Wave 0 floor set.
 *
 * Fails if a new rule appears or any rule's node count grows vs axe-baseline.json.
 * A fix that clears violations should update the baseline in the same PR
 * (WRITE_BASELINE=1 npm run a11y:ci).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { ensureServer, openPlay, runAxe, selectExample, sleep } from './lib/harness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = path.join(__dirname, 'axe-baseline.json');
const WRITE_BASELINE = process.env.WRITE_BASELINE === '1';
const THEMES = ['light', 'dark'];

const CI_SCENARIOS = [
  { id: 'fib-unanswered', example: 'fib-simple.md', setup: async () => {} },
  {
    id: 'fib-dropdown-open',
    example: 'fib-simple.md',
    setup: async (page) => {
      await page.locator('.blank').first().focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('.fib-dropdown', { timeout: 5000 });
    }
  },
  {
    id: 'matching-empty',
    example: 'matching.md',
    setup: async (page) => {
      await page.waitForSelector('.matching-selection-area');
      await sleep(400);
    }
  },
  { id: 'sort-tray', example: 'sort-into-boxes.md', setup: async () => {} },
  {
    id: 'sort-chip-selected',
    example: 'sort-into-boxes.md',
    setup: async (page) => {
      await page.locator('.categorization-chip').first().click();
    }
  },
  {
    id: 'sort-chip-placed',
    example: 'sort-into-boxes.md',
    setup: async (page) => {
      // Prefer a tray chip. Enter on an already-placed chip returns it to the tray
      // (and a prior CI state may have persisted that placement).
      const placed = page.locator('.categorization-chip.placed');
      if ((await placed.count()) === 0) {
        await page.locator('.categorization-tray .categorization-chip').first().click();
        await page.locator('.categorization-category-head').first().click();
      }
      await placed.first().waitFor({ state: 'visible', timeout: 5000 });
    }
  },
  { id: 'mcq-unanswered', example: 'mcq.md', setup: async () => {} },
  { id: 'matrix-unanswered', example: 'matrix.md', setup: async () => {} },
  { id: 'text-unanswered', example: 'text-input-simple.md', setup: async () => {} },
  {
    id: 'shell-split-markdown',
    example: 'side-content-markdown-table.md',
    setup: async (page) => {
      await page.waitForSelector('.split-panel-divider', { timeout: 10000 });
      await sleep(600);
    }
  }
];

function tally(records) {
  const byRule = {};
  const byState = {};
  for (const rec of records) {
    const stateKey = `${rec.id}/${rec.theme}`;
    byState[stateKey] = {};
    if (rec.error) {
      byState[stateKey].error = rec.error;
      continue;
    }
    for (const v of rec.axe.violations) {
      const n = v.nodeCount;
      byRule[v.id] = (byRule[v.id] || 0) + n;
      byState[stateKey][v.id] = n;
    }
  }
  return { byRule, byState };
}

function compare(baseline, current) {
  const failures = [];
  const hints = [];
  const baseRules = baseline.byRule || {};
  const curRules = current.byRule || {};

  for (const [id, count] of Object.entries(curRules)) {
    if (!(id in baseRules)) {
      failures.push(`New axe rule "${id}" (${count} nodes). Update the baseline only if this is expected.`);
      continue;
    }
    if (count > baseRules[id]) {
      failures.push(`axe "${id}" grew ${baseRules[id]} → ${count} (shrink-only).`);
    } else if (count < baseRules[id]) {
      hints.push(`axe "${id}" shrank ${baseRules[id]} → ${count}. Re-run WRITE_BASELINE=1 npm run a11y:ci in this PR.`);
    }
  }
  for (const id of Object.keys(baseRules)) {
    if (!(id in curRules) && baseRules[id] > 0) {
      hints.push(`axe "${id}" cleared (was ${baseRules[id]}). Re-run WRITE_BASELINE=1 npm run a11y:ci in this PR.`);
    }
  }
  return { failures, hints };
}

async function main() {
  const stopServer = await ensureServer();
  const browser = await chromium.launch({ headless: true });
  const records = [];
  try {
    for (const spec of CI_SCENARIOS) {
      for (const theme of THEMES) {
        process.stdout.write(`CI ${spec.id} (${theme})… `);
        const context = await browser.newContext({
          colorScheme: theme,
          viewport: { width: 1280, height: 800 },
          reducedMotion: 'reduce'
        });
        const page = await context.newPage();
        const rec = { id: spec.id, example: spec.example, theme };
        try {
          await selectExample(spec.example);
          await openPlay(page);
          await spec.setup(page);
          rec.axe = await runAxe(page);
          console.log(`violations=${rec.axe.violations.length}`);
        } catch (err) {
          rec.error = String(err && err.message ? err.message : err);
          console.log('ERROR', rec.error);
        }
        await context.close();
        records.push(rec);
      }
    }
  } finally {
    await browser.close();
    stopServer();
  }

  const errors = records.filter((r) => r.error);
  if (errors.length) {
    console.error(`\n${errors.length} CI state(s) failed to run.`);
    process.exit(1);
  }

  const current = {
    generatedAt: new Date().toISOString(),
    tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    ...tally(records)
  };

  if (WRITE_BASELINE) {
    await writeFile(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n');
    console.log('\nWrote', BASELINE_PATH);
    console.log('byRule', current.byRule);
    return;
  }

  let baseline;
  try {
    baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf8'));
  } catch {
    console.error(`Missing ${BASELINE_PATH}. Run WRITE_BASELINE=1 npm run a11y:ci`);
    process.exit(1);
  }

  const { failures, hints } = compare(baseline, current);
  for (const h of hints) console.log('hint:', h);
  if (failures.length) {
    console.error('\nShrink-only axe baseline failed:');
    for (const f of failures) console.error(' -', f);
    process.exit(1);
  }
  console.log('\nAxe baseline OK', current.byRule);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
