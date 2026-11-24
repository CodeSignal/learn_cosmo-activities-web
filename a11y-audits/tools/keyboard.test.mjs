/**
 * Keyboard behavior for MCQ and matrix radios/checkboxes.
 *
 * Arrows move focus without selecting. Enter/Space selects the focused option.
 * On a single-select MCQ, that also moves focus to the next question (or to the
 * explanation textarea when one follows). Checkboxes and matrix cells keep focus.
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { REPO_ROOT, ensureServer, openPlay, selectExample } from './lib/harness.js';

// Selecting an example rewrites these, so keep the developer's copies intact.
const DATA_FILES = ['question.md', 'answer.md', 'report.md', 'score.json'].map((f) =>
  path.join(REPO_ROOT, 'data', f)
);

let stopServer;
let browser;
let savedData;

before(async () => {
  savedData = await Promise.all(DATA_FILES.map((f) => readFile(f, 'utf8').catch(() => null)));
  stopServer = await ensureServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  await stopServer?.();
  await Promise.all(
    DATA_FILES.map((f, i) =>
      savedData[i] === null ? unlink(f).catch(() => {}) : writeFile(f, savedData[i])
    )
  );
});

async function open(t, example) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce'
  });
  t.after(() => context.close());
  const page = await context.newPage();
  await selectExample(example);
  await openPlay(page);
  return page;
}

const focusedId = (page) => page.evaluate(() => document.activeElement?.id || null);
const ids = (locator) => locator.evaluateAll((els) => els.map((e) => e.id));
const checked = (locator) => locator.evaluateAll((els) => els.map((e) => e.checked));
const mcqInputs = (page, qIdx) =>
  page.locator(`.mcq-question[data-question-index="${qIdx}"] input`);

describe('MCQ single-select', () => {
  // mcq-2-questions.md: question 0 is single-select, question 1 is multi-select.
  const EXAMPLE = 'mcq-2-questions.md';

  test('arrows move focus without selecting, and wrap', async (t) => {
    const page = await open(t, EXAMPLE);
    const radios = mcqInputs(page, 0);
    const radioIds = await ids(radios);
    await radios.first().focus();

    await page.keyboard.press('ArrowDown');
    assert.equal(await focusedId(page), radioIds[1]);
    await page.keyboard.press('ArrowRight');
    assert.equal(await focusedId(page), radioIds[2]);
    await page.keyboard.press('ArrowUp');
    assert.equal(await focusedId(page), radioIds[1]);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await focusedId(page), radioIds.at(-1), 'ArrowLeft from the first option wraps');
    await page.keyboard.press('ArrowDown');
    assert.equal(await focusedId(page), radioIds[0], 'ArrowDown from the last option wraps');

    assert.deepEqual(await checked(radios), radioIds.map(() => false));
  });

  for (const key of ['Space', 'Enter']) {
    test(`${key} selects the focused option and moves to the next question`, async (t) => {
      const page = await open(t, EXAMPLE);
      const radios = mcqInputs(page, 0);
      await radios.first().focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press(key);

      assert.deepEqual(await checked(radios), [false, true, false, false]);
      const [nextFirst] = await ids(mcqInputs(page, 1));
      assert.equal(await focusedId(page), nextFirst);
      assert.deepEqual(await checked(mcqInputs(page, 1)), [false, false, false, false]);
    });
  }

  test('holding Space does not select an option in the next question', async (t) => {
    const page = await open(t, EXAMPLE);
    await mcqInputs(page, 0).first().focus();
    await page.keyboard.down('Space');
    await page.keyboard.down('Space');
    await page.keyboard.down('Space');
    await page.keyboard.up('Space');

    assert.deepEqual(await checked(mcqInputs(page, 0)), [true, false, false, false]);
    assert.deepEqual(await checked(mcqInputs(page, 1)), [false, false, false, false]);
  });

  test('a mouse click selects without moving focus to the next question', async (t) => {
    const page = await open(t, EXAMPLE);
    await page.locator('.mcq-question[data-question-index="0"] .mcq-option').nth(2).click();

    assert.deepEqual(await checked(mcqInputs(page, 0)), [false, false, true, false]);
    const nextIds = await ids(mcqInputs(page, 1));
    assert.ok(!nextIds.includes(await focusedId(page)));
  });
});

describe('MCQ multi-select', () => {
  const EXAMPLE = 'mcq-2-questions.md';

  test('arrows move focus without toggling, and wrap', async (t) => {
    const page = await open(t, EXAMPLE);
    const boxes = mcqInputs(page, 1);
    const boxIds = await ids(boxes);
    await boxes.first().focus();

    await page.keyboard.press('ArrowDown');
    assert.equal(await focusedId(page), boxIds[1]);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    assert.equal(await focusedId(page), boxIds.at(-1));

    assert.deepEqual(await checked(boxes), boxIds.map(() => false));
  });

  test('Space and Enter toggle the focused box and keep focus', async (t) => {
    const page = await open(t, EXAMPLE);
    const boxes = mcqInputs(page, 1);
    const boxIds = await ids(boxes);
    await boxes.first().focus();

    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    assert.deepEqual(await checked(boxes), [true, false, true, false]);
    assert.equal(await focusedId(page), boxIds[2]);

    await page.keyboard.press('Space');
    assert.deepEqual(await checked(boxes), [true, false, false, false]);
  });

  test('holding Space toggles only once', async (t) => {
    const page = await open(t, EXAMPLE);
    const boxes = mcqInputs(page, 1);
    await boxes.first().focus();
    await page.keyboard.down('Space');
    await page.keyboard.down('Space');
    await page.keyboard.down('Space');
    await page.keyboard.up('Space');

    assert.deepEqual(await checked(boxes), [true, false, false, false]);
  });
});

describe('MCQ with an explanation', () => {
  // mcq.md: one single-select question with "Explain Your Answer".
  const EXAMPLE = 'mcq.md';

  test('Space selects and moves focus to the explanation textarea', async (t) => {
    const page = await open(t, EXAMPLE);
    const radios = mcqInputs(page, 0);
    await radios.first().focus();
    await page.keyboard.press('Space');

    assert.deepEqual(await checked(radios), [true, false, false, false]);
    assert.equal(
      await page.evaluate(() => document.activeElement?.classList.contains('mcq-explain-textarea')),
      true
    );
  });

  test('holding Space does not type into the explanation, but typing works after release', async (t) => {
    const page = await open(t, EXAMPLE);
    await mcqInputs(page, 0).first().focus();
    await page.keyboard.down('Space');
    await page.keyboard.down('Space');
    await page.keyboard.down('Space');
    await page.keyboard.up('Space');

    const textarea = page.locator('.mcq-explain-textarea');
    assert.equal(await textarea.inputValue(), '');
    await page.keyboard.type('a b');
    assert.equal(await textarea.inputValue(), 'a b');
  });
});

describe('Matrix', () => {
  // matrix.md: five rows, two columns.
  const EXAMPLE = 'matrix.md';
  const rowInputs = (page, rowIdx) =>
    page.locator(`#matrix-tbody tr[data-row-index="${rowIdx}"] input[type="radio"]`);

  test('arrows move focus within the row without selecting, and wrap', async (t) => {
    const page = await open(t, EXAMPLE);
    const row = rowInputs(page, 0);
    const rowIds = await ids(row);
    await row.first().focus();

    await page.keyboard.press('ArrowRight');
    assert.equal(await focusedId(page), rowIds[1]);
    await page.keyboard.press('ArrowRight');
    assert.equal(await focusedId(page), rowIds[0], 'ArrowRight from the last cell wraps');
    await page.keyboard.press('ArrowDown');
    assert.equal(await focusedId(page), rowIds[1], 'ArrowDown stays in the row');
    await page.keyboard.press('ArrowUp');
    assert.equal(await focusedId(page), rowIds[0]);

    assert.deepEqual(await checked(page.locator('#matrix-tbody input')), Array(10).fill(false));
  });

  for (const key of ['Space', 'Enter']) {
    test(`${key} selects the focused cell and keeps focus`, async (t) => {
      const page = await open(t, EXAMPLE);
      const row = rowInputs(page, 0);
      const rowIds = await ids(row);
      await row.first().focus();

      await page.keyboard.press(key);
      assert.deepEqual(await checked(row), [true, false]);
      assert.equal(await focusedId(page), rowIds[0]);

      await page.keyboard.press('ArrowRight');
      await page.keyboard.press(key);
      assert.deepEqual(await checked(row), [false, true], 'choosing another cell clears the first');
      assert.equal(await focusedId(page), rowIds[1]);
      assert.deepEqual(await checked(rowInputs(page, 1)), [false, false]);
    });
  }
});
