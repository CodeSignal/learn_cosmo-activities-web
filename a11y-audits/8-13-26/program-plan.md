# WCAG 2.2 AA accessibility program — Cosmo Activities Web

How we will run the ChatCPT (`learn_cosmo-chat`) process on this repo, adapted for six learner activity types and a large examples corpus.

**Standard:** WCAG 2.2 Level AA

**Status:** Phase 4 executing — see `wave-4-plan.md`. Critical/serious are on `main`.

**Gates (same as ChatCPT):**

1. Approve this plan (scope + scan matrix).
2. Phase 1 produces `audit.md`. Stop. You review.
3. Phase 2 produces `resolution-plan.md` for **critical + serious** only. Stop. You review.
4. Phase 3 executes only when you say go.
5. Phase 4 (moderate / minor) only after critical/serious are on `main`.

---

## Project facts

| Fact | This repo |
| --- | --- |
| App repo | [CodeSignal/learn_cosmo-activities-web](https://github.com/CodeSignal/learn_cosmo-activities-web) |
| Shared design system | Git submodule `public/design-system` → [CodeSignal/learn_bespoke-design-system](https://github.com/CodeSignal/learn_bespoke-design-system) (same library ChatCPT consumed) |
| How to start (learner app) | `npm start` → `http://localhost:3000` (serves `data/question.md`) |
| How to start (examples / audit driver) | `npm run examples` → `http://localhost:3000` (picker) and activity iframe at `/play` |
| Themes | **System only.** `prefers-color-scheme` + `<meta name="color-scheme" content="light dark">`. No in-app toggle. Playwright must emulate `colorScheme: 'light' \| 'dark'`. |
| i18n / `lang` | `<html lang="en">`. No i18n runtime. User-facing strings (including `aria-label`) are hardcoded English in JS. |
| Existing tests | **Pre-Wave 0:** `npm test` → Node’s built-in test runner on `test/**/*.test.js` (scoring / report / validation). **No browser, axe, or DOM tests today.** |
| Existing CI | **Pre-Wave 0:** `.github/workflows/build-release.yaml` runs on **release only**. **No pull-request CI.** |
| DS tests / CI | Design system already has Playwright + `@axe-core/playwright`, including token contrast and component a11y specs, on PR. |

### Learner activity types (in scope)

| Type | Module | Canonical example |
| --- | --- | --- |
| Fill in the blank | `public/modules/fib.js` | `data/examples/fib-simple.md` |
| Matching | `public/modules/matching.js` | `data/examples/matching.md` |
| Matrix | `public/modules/matrix.js` | `data/examples/matrix.md` |
| Multiple choice | `public/modules/mcq.js` | `data/examples/mcq.md` |
| Sort into Boxes | `public/modules/sort.js` | `data/examples/sort-into-boxes.md` |
| Text input | `public/modules/text-input.js` | `data/examples/text-input-simple.md` |

### Out of scope unless you say otherwise

- **Swipe Left/Right** (`swipe.js`, `swipe-left-right.md`) — unfinished, per you.
- **Question editor** (`public/editor.html`, `server.js --edit`) — authoring tool, not the learner runtime.
- **Examples picker chrome** (`public/examples-mode.html`) — local QA shell only. We **use** it (and `/api/examples/*`) to drive scans; we do **not** treat it as product UI.
- **Iframe contents** of `__Content__` URL embeds and `/sim/` simulations — third-party / other process. We scan the activity shell, splitter, and activity pane around them.
- **Unused design-system components** this app does not mount (Modal, Numeric Slider, DS Dropdown). FIB builds its own listbox; it does not use `dropdown.js`.
- **Host platform chrome** (CodeSignal lesson iframe around this app).
- **Screen-reader confirmation** (VoiceOver / JAWS / NVDA) — listed on the audit retest checklist, not claimed by axe.
- **Forced-colors / Windows High Contrast** as a full pass (Matching already has a forced-colors fallback; we note gaps, we do not certify).
- **Locales** — there are none to drive.

---

## How this differs from ChatCPT

ChatCPT was one conversational surface with a handful of UI states. This app is **six custom widgets** behind one shell, plus optional split-screen content. That changes the audit shape, not the process.

| ChatCPT | This project |
| --- | --- |
| One primary flow (chat, settings, dialogs) | Six activity renderers + shared shell (toolbar, split panel, live region, scroll indicator) |
| Hand-picked UI states | 43 in-scope example files; we **sample**, we do not axe all of them in every state |
| In-app or documented theme toggle | System `prefers-color-scheme` only — emulate in Playwright |
| i18n JSON; “no new hardcoded strings” | No i18n. New copy stays English in source. Do not invent an i18n layer during a11y work. |
| PR CI already existed or was added in Wave 0 | **Must introduce PR CI** (unit tests + shrink-only axe) — nothing runs on PRs today |
| DS findings → DS repo PRs → app submodule bump | Same. DS already carries ChatCPT remediations (token contrast specs, accessible-name overrides). Re-open those only if **this app still fails** when consuming the tokens. |
| `aria-live` / focus-survival extras because axe cannot see them | Same extras, **plus** per-widget keyboard models (FIB listbox, Matching carousel, Sort click-or-drag, Matrix grid, MCQ radio/checkbox, Text Input Next) |

Recent activity-local a11y work already landed here (Matching contrast and keyboard order, MCQ shuffle labels / focus rings, Sort keyboard placement). Phase 1 **re-verifies** those; it does not skip the activities.

---

## Architecture to inventory in Phase 1

Shared (every activity):

- `public/index.html` — `<main>`, `#activity-container` with `aria-live="polite"`, `lang="en"`.
- `public/app.js` — load `/api/activity`, mount shell, innerHTML swap, WebSocket `{ type: 'validate' }`.
- `public/components/toolbar.js` — icon-only Clear All / Open URL (has `aria-label`).
- `public/utils/activity-content-shell.js` — SplitPanel, side markdown / URL / `/sim/`.
- `public/utils/katex-render.js` — math in prompts, blanks, chips, tables.
- Design tokens via `prefers-color-scheme` in `public/design-system/colors/colors.css`.

Per-activity custom widgets (axe is a floor):

| Activity | Widget / AT model to inspect |
| --- | --- |
| FIB | Custom `role="button"` blanks + `role="listbox"` menu appended to `document.body`. Options listen to `mousedown` only in current code — keyboard-inside-menu is a targeted check. |
| Matching | DS Horizontal Cards carousel + selection `role="button"` with roving tabindex + `role="listbox"` of choice `<button role="option">`. Nested-role and focus-survival checks. |
| Matrix | `<table role="grid">` of native radios with sr-only labels; optional explain textarea. |
| MCQ | Native radio or checkbox (multi-select / `mcq-full-spread.md`); explain textarea; Next on later questions. |
| Sort | Click-to-select then click/Enter/Space on category **and** HTML5 drag-and-drop. Full `render()` rebuild — focus survival is mandatory. WCAG 2.5.7 Dragging Movements: keyboard equivalent already exists; verify it. |
| Text input | Native inputs (string / numeric / units / currency / multiline); Next; validation marks. |

Validation feedback is **not** a button in the UI. The host sends a WebSocket `validate` message. The audit harness must trigger `validationHandler()` (page evaluate or injected WS message) for MCQ, Matrix, Sort, and Text Input incorrect states.

---

## Proposed scan matrix

Drive the app at **`/play`**, not through the examples iframe. Sequence:

1. Start `npm run examples` (needs `SIM_ORIGIN` for split-sim examples).
2. `POST /api/examples/select` with `{ "filename": "…" }`.
3. Playwright navigates to `http://127.0.0.1:3000/play` (full activity document — axe can see the DOM).
4. Repeat with `colorScheme: 'light'` and `'dark'`.
5. Screenshot each state; write `a11y-audits/8-13-26/evidence/` + `report.json`.

Do **not** axe all 43 files × every interaction × both themes. Canonical + one complexity variant + shared shell is the floor. Extra examples only if the canonical cannot reach a state (e.g. multi-select, explain, Next).

### Shared shell (once, both themes)

| State | Example | Notes |
| --- | --- | --- |
| No side content | any canonical | Landmarks, toolbar, live region, heading hierarchy |
| Split + inline markdown | `side-content-markdown-table.md` | SplitPanel keyboard, focus order pane-to-pane, table in side content |
| Split + external URL | `mcq-with-url-content.md` | Shell + Open URL tool; **not** the remote iframe |
| Split + `/sim/` | `matching-split-screen-sim.md` (or `mcq-split-screen-sim.md`) | Shell + divider; **not** sim contents |
| Scroll indicator | `mcq-big-question.md` | Decorative vs announced; `aria-hidden` on sentinel already present |

### Per-activity states (both themes unless noted)

| Activity | Example(s) | States to walk |
| --- | --- | --- |
| FIB | `fib-simple.md`, `fib-markdown-table-inline-blanks.md`, `fib-latex.md` | Unanswered; dropdown open; filled; Clear All; blank inside a markdown table; KaTeX in/near a blank |
| Matching | `matching.md`, `matching-latex.md` | First card empty; selection focused; one choice applied; carousel to next card; used choices disabled; all matched; Clear All |
| Matrix | `matrix.md`, `matrix-markdown-table.md` | Unanswered; one row selected; explain (if present); after validate |
| MCQ | `mcq.md`, `mcq-2-questions.md`, `mcq-full-spread.md` | Unanswered radio; selected; explain textarea; Next; checkbox multi-select; after validate |
| Sort | `sort-into-boxes.md`, `sort-into-boxes-three-categories.md` | Tray full; chip selected (`aria-pressed`); placed via keyboard; placed via click; after validate (misplaced); Clear All |
| Text input | `text-input-simple.md`, `text-input-advanced.md` | Empty; filled; Next (multi-question); units/currency/multiline; after validate |

### Extra checks axe cannot make (every walked state, or the widget that needs it)

- Tab order and `:focus-visible` / `:focus` rings (Matching already uses `:focus` on purpose).
- **Focus survival** across `innerHTML` / `render()` (Sort, Matching choices rebuild, FIB menu open/close, validate restyle).
- Target size ≥ 24×24 CSS px (WCAG 2.5.8) — blanks, chips, radios, toolbar icons, carousel nav, splitter.
- Nested interactives (Matching listbox-of-buttons, Sort chip inside `role="button"` category card).
- Live-region rebuilds: `#activity-container[aria-live="polite"]` wraps the entire activity and is replaced on load — likely a wipe-and-reannounce. Treat as a first-class finding if confirmed, even if axe is silent.
- Contrast from **live computed styles**, compositing ancestor `opacity`. Skip disabled/inactive (1.4.3 exemption). Sort empty-zone dashes and Matching “Best response” already had dark-theme contrast work — remeasure.
- Dragging (2.5.7): Sort keyboard path is the accessible equivalent; confirm it is discoverable (instructions currently say “Click or drag”).

Viewport for screenshots: 1280×800. Spot-check one tall activity at 375×667 for reflow (1.4.10) and target size; not a full mobile certification.

---

## Audit harness

Keep tooling **out of the app build**, same as ChatCPT:

```text
a11y-audits/
  8-13-26/
    program-plan.md      ← this file
    audit.md             ← Phase 1
    resolution-plan.md   ← Phase 2 (after you approve the audit)
    evidence/            ← screenshots, report.json
  tools/                 ← Playwright + axe-core, contrast, extras
```

- Playwright + `@axe-core/playwright` tagged `wcag2a` through `wcag22aa` (best-practice optional, recorded separately).
- Axe is a **floor**. Custom widgets, live-region policy, and focus survival are code review + extra scripts.
- Contrast helper composites ancestor opacity; does not flag disabled controls.
- Harness may copy patterns from ChatCPT `a11y-audits/tools/` if that tree is available; otherwise write a small runner here. Design-system `tests/contrast-tokens.spec.js` is a reference for token sampling, not a substitute for **painted UI** contrast.

`a11y-audits/` stays uncommitted until you want it in git (ChatCPT kept artifacts in-repo). Recommend committing the plan, audit, and tools; gitignoring bulky `evidence/` PNGs if they get large.

---

## Phase 1 — Audit (findings only)

After you approve this plan:

1. Inventory the real UI (shell + each in-scope module) — landmarks, focus, live regions, custom widgets, tokens, hardcoded English.
2. Stand up the harness and walk the scan matrix in light and dark.
3. Write `a11y-audits/8-13-26/audit.md`:
   - Scope, method, **not covered**.
   - Index tables: ID, severity (critical / serious / moderate / minor), one-line finding, WCAG, theme.
   - **A1…** application, **D1…** design-system. Prefix is **not** ownership.
   - Each finding: Where (`file:lines`), what happens, measured evidence, impact, recommended **direction** (not a patch).
   - Prioritized remediation phases and a retest checklist (both themes).
4. **Stop.** Show the audit. Do not file issues or write product fixes.

---

## Phase 2 — Resolution plan (critical + serious only)

After you approve the audit, write `resolution-plan.md`:

- Sequence by **dependency**, not only severity. Restore AT usability first (landmarks, focus, live regions, traps), then keyboard/state, then contrast/target size.
- Default **one GitHub issue per finding, one PR per issue**. Bundle only when findings share one root cause. File bundled issues separately for traceability.
- Owning repo per finding. App symptoms that are token bugs belong in the design system. D-prefixed bugs that live in app glue belong in the app. Budget a **submodule bump PR** after every DS merge.
- Wave 0 **before** feature PRs (this repo is missing both pieces):
  - Characterization / DOM tests around the first render path a real fix will rewrite (likely `#activity-container` live region + one custom widget).
  - PR CI: `npm test` + axe. Capture today’s violations as a **shrink-only baseline** (new rule or higher count fails; a fix that clears violations updates the baseline in the same PR).
- Labels (`a11y`, severity, WCAG principle, `theme:dark-only`, `needs-manual-verify`), milestone, branches `fix/a11y-…`, conventional commits, **no issue numbers in commit subjects**.
- Issue body template: Finding, Where, Current, Expected, How verified, Suggested approach, Acceptance criteria, audit ID.
- Product decisions called out — **ask, do not guess**.
- **Stop.** Show the plan. Do not implement until you say go.

---

## Phase 3 — Execute

When you say start:

1. Create labels/milestone. File issues from the plan (enough context that the implementer need not re-read the whole audit).
2. Land Wave 0, then waves in order. Parallelize only independent items (especially app vs design system).
3. Per PR: acceptance criteria; light + dark where relevant; tests green; axe baseline shrinks or stays equal; keyboard walk of the touched flow; no new user-facing copy unless it is the fix. Link the audit ID. Open **ready for review** unless you say draft.
4. GitHub auto-close: each issue needs its own keyword (`Closes #12, closes #15`). `Closes #12 and #15` leaves #15 open.
5. After merge: `git checkout main && git pull`. Sync remaining branches. Point the issue map at **Closed (PR #N)**. After a DS merge, open the app submodule bump next.
6. Do not redo closed work. If a later finding was already fixed, close it with evidence.

---

## Phase 4 — Moderate / minor

After critical/serious are on `main`, write a companion plan (ChatCPT `wave-4-plan.md` equivalent):

- Re-verify anything earlier waves may have already fixed.
- Diagnose leftover axe baseline noise and give it an ID if it is real.
- Decide leftover product calls with you.
- Same one-issue-one-PR model, same DoD, same bump rule.

Then execute that plan the same way.

---

## Product decisions (ask; do not guess)

These will show up in the audit or the resolution plan. Do not invent answers during Phase 1.

1. **Editor** — confirm out of scope for this program.
2. **Skip link** — there is already a `<main>`. This app usually sits in a host iframe. Skip link vs landmarks-only is a product call (ChatCPT had the same fork).
3. **`aria-live` on `#activity-container`** — if Phase 1 confirms wipe-and-reannounce, removing or narrowing the live region vs adding a dedicated status region is a product/UX call.
4. **Dark stroke / placeholder tokens** — if contrast fails on DS semantic tokens, fix in DS (same as ChatCPT). If it fails only on app-specific CSS (Matching placeholder, Sort dashes, FIB empty blank), fix in the app.
5. **KaTeX** — math is visual. Policy for accessible names / `aria-hidden` on rendered math vs leaving KaTeX defaults.
6. **Sort instructions** — “Click or drag” omits keyboard. Copy change vs leaving drag as mouse-only with an unspoken keyboard path.
7. **Validate announcements** — incorrect marks exist visually; whether they must be announced (live region / `aria-invalid`) is a product call if not already required by 4.1.3 / 3.3.1.
8. **English-only** — confirm we do not add i18n as part of a11y remediations.

---

## Definition of done (whole program)

- Every numbered audit finding is Fixed, Mitigated (recorded product decision), or Won’t fix (recorded).
- Shrink-only axe baseline is at the post-fix floor.
- Issue map in the plan(s) points at real PR numbers.
- Retest checklist from the audit is the manual leftover (VoiceOver/JAWS/NVDA still required; axe does not replace it).

---

## Next step

Approve (or amend) **scope** and the **scan matrix**. Then Phase 1: stand up `a11y-audits/tools/`, walk the states, write `audit.md`, and stop.
