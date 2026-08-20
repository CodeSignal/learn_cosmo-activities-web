# Resolution plan — critical and serious only

**Audit:** [audit.md](./audit.md) (approved)  
**Standard:** WCAG 2.2 AA  
**Status:** Wave 0 on `main` (PR #20). Wave 1 executing. Product calls P1–P7 use the recommended defaults.

In scope: **A1–A11, D1–D2**. Out of this plan: A12–A20, D3 (Phase 4 after these are on `main`).

---

## Ownership (prefix ≠ repo)

| ID | Owning repo | Why |
| --- | --- | --- |
| A1, A2, A3, A9, A10, A11 | **learn_cosmo-activities-web** | App shell / FIB / Matching / validate / iframe glue |
| A4, A5, A6, A8 | **learn_cosmo-activities-web** | Sort module |
| A7 | **learn_cosmo-activities-web** | App-specific `--Colors-Learn-Practice-Interactive-Choice-Main-*` in `matching.css` and `sort.css` (duplicated). Not a DS semantic token. |
| D1, D2 | **learn_bespoke-design-system** | Horizontal Cards opacity; Split Panel divider |
| After every DS merge | **learn_cosmo-activities-web** | Submodule bump PR (`chore(ds): bump design-system for a11y D#`) |

---

## Bundling

Default: **one GitHub issue per finding, one PR per issue**.

Exceptions (same root-cause bar as ChatCPT A1/A2/A11):

| Bundle | Issues (file separately) | One PR | Root cause |
| --- | --- | --- | --- |
| **Sort widget** | A4, A5, A6 | `fix/a11y-sort-widget` | One `render()` / `makeChip` / category markup pass. Fixing roles without restoring focus (or the reverse) is wasted work. |
| **Choice tokens** | A7 only | `fix/a11y-choice-contrast` | Same CSS variables copied in Matching and Sort. One PR, both files. |

A2 and A3 both touch FIB but are **not** the same cause (keyboard widget vs stale `aria-label`). Separate PRs. A3 can land first.

A1 and A10 are related (don’t dump the page; do announce errors) but **not** one patch. A1 removes the bad live region; A10 adds a small status node afterward.

D2 name + 24px target are one component — **one issue, one PR**.

---

## Product decisions — ask before the matching PR

Do not invent copy or visual language. Defaults below are **recommendations to confirm**, not implementations.

| # | Decision | Needed for | Recommendation to confirm |
| --- | --- | --- | --- |
| P1 | A1: remove `aria-live` from `#activity-container` vs keep a quieter live region | Wave 1 | **Remove** it. Announce validate only via A10’s dedicated status node. |
| P2 | A2: adopt DS Dropdown vs keep an inline blank and port keyboard behavior | Wave 2 | **Keep the inline blank.** DS Dropdown is a chevron toggle, uses `<button role="option">` (same smell as A11), and would change FIB visuals. Port arrows / Enter / Escape / Tab-closes from DS `dropdown.js` (already covered by DS `dropdown-focus.spec.js`). |
| P3 | A7: retune app Learn-Practice pair vs promote into DS | Wave 3 | **Retune in app CSS** (Matching + Sort). Promote later only if Chat / other consumers need the same pair. |
| P4 | A9: iframe `title` strings | Wave 1 | Markdown → `Reference`; `/sim/` → `Simulation`; external URL → `Reference` (or host hostname). Authors cannot set this today. |
| P5 | A10: error wording + whether to announce | Wave 2 | Visible text **“This answer is incorrect.”** (or per-question). `aria-invalid` on the control. Short `role="status"` update. Hide decorative icons with `aria-hidden="true"`. |
| P6 | D1: keep a visual fade on side cards vs hide them from AT | Wave 3 (DS) | Fade **chrome** (border/scale) without dropping text below 4.5:1; or `aria-hidden` on fully off-center cards if they must stay dim. |
| P7 | English-only | All waves | **No i18n layer.** New strings stay English in source. |
| P8 | Editor / skip link / KaTeX / Sort “click or drag” copy | — | Still **out of this plan** (editor out of scope; skip link and KaTeX are moderate A12/A19; Sort copy is A14). |

Reply with anything you’d override. Unanswered items use the recommendation when you say go.

---

## Wave 0 — foundations (blocking, this repo)

Nothing in Waves 1–3 merges until this is on `main`.

**Issue:** `chore: a11y Wave 0 CI and characterization` (not an audit ID).

### 0a — Characterization tests (`node --test`)

DOM-ish / pure tests around the first paths Wave 1 will rewrite. No browser required for these:

1. **Live region** — assert today’s `index.html` has `aria-live="polite"` on `#activity-container` *or* (after A1) that it does **not**. Prefer a small HTML fixture or a snapshot of `index.html` so A1 updates the same test in that PR.
2. **Sort chip contract** — extract or duplicate the attributes `makeChip` / tray wrap would set: `button` must not also be `role="listitem"` with `aria-pressed` (locks A5). Optional: document current *broken* contract in a comment and flip the assertion in the Sort PR.
3. **FIB blank name** — given a filled blank, accessible name must include the value (locks A3). Can wait for A3’s PR if extracting `updateBlankDisplays` is too much for Wave 0; then Wave 0 only snapshots `index.html` + a comment in `fib.js`.

Prefer tests that fail when the first fix regresses, even if Wave 0 itself records the broken state in comments.

### 0b — PR CI

This repo only archives on **release**. Add `.github/workflows/pr.yml`:

1. `git submodule update --init`
2. `npm ci` in the app → `npm test`
3. `npm ci` in `a11y-audits/tools` → Playwright Chromium → **shrink-only axe**

Axe CI must **not** run all 69 audit states (~7 min). Run a **floor set**, both `colorScheme`s:

| Example | State |
| --- | --- |
| `fib-simple.md` | unanswered; dropdown open |
| `matching.md` | empty |
| `sort-into-boxes.md` | tray; one chip selected; one chip placed |
| `mcq.md` | unanswered |
| `matrix.md` | unanswered |
| `text-input-simple.md` | unanswered |
| `side-content-markdown-table.md` | split shell |

Commit `a11y-audits/tools/axe-baseline.json` from that set (today’s counts per rule). CI fails if a **new rule** appears or any rule’s **node count increases**. A fix PR that clears violations **updates the baseline in the same PR**.

Reuse `a11y-audits/tools` (keep Playwright out of the app `package.json` unless CI makes that painful). Add `npm run a11y:ci` in tools.

### Wave 0 DoD

- PR checks run on every pull request (`.github/workflows/pr.yml`: `unit` + `axe`)
- `npm test` green, including `test/a11y-characterization.test.js` (A1, A3, A5, A6, A9, A11 current contracts)
- Axe baseline committed (`a11y-audits/tools/axe-baseline.json`); CI is shrink-only (`npm run a11y:ci`)
- Characterization tests exist for the A1 path (and Sort/FIB if cheap)

---

## Waves 1–3 — sequence by dependency

```text
Wave 0 ──► Wave 1 (AT / names) ──► Wave 2 (keyboard / errors) ──► Wave 3 (contrast / target)
                │
                └── DS D1 & D2 in parallel after Wave 0
                         └── app submodule bump after each DS merge
```

App vs DS: **parallelize** after Wave 0. Do not parallelize A4/A5/A6 with each other (one Sort PR). Do not start A10 before A1. Do not start A2 until Wave 0 is in (FIB rewrite needs the axe floor).

### Wave 1 — AT usability (names, roles, live region)

| Order | ID | Branch | Notes |
| --- | --- | --- | --- |
| 1 | **A1** | `fix/a11y-live-region` | Confirm P1. Strip `aria-live` from `#activity-container`. Update Wave 0 snapshot. No status node yet. |
| 2 | **A5+A6+A4** | `fix/a11y-sort-widget` | See bundle. Tray: `listitem` wrapper **or** drop list; `aria-pressed` stays on the `button`. Category: labeled group/region, not `role="button"` wrapping buttons; empty-state placement control if needed. Restore focus by `data-item-index` after `render()`. Keyboard place (Enter/Space) must still work. |
| 3 | **A3** | `fix/a11y-fib-blank-name` | Tiny. When filled, remove `aria-label` or include the value. Independent of A2. |
| 4 | **A9** | `fix/a11y-iframe-title` | Confirm P4. Set `title` on `.activity-content-iframe`. |
| 5 | **A11** | `fix/a11y-matching-listbox` | Drop `role="listbox"` / `role="option"` on native buttons. Labeled group of buttons. Keep disabled “used” choices. |

**DS (parallel, after Wave 0):**

| ID | Branch (DS repo) | Then app |
| --- | --- | --- |
| **D2** | `fix/a11y-split-divider` | Bump submodule. Name + ≥24×24 hit area; keep arrow keys. |
| **D1** | `fix/a11y-cards-opacity` | Can wait for Wave 3 visually; **may start in Wave 1** so Matching contrast isn’t blocked. Confirm P6. Bump submodule. |

### Wave 2 — keyboard and errors

| Order | ID | Branch | Notes |
| --- | --- | --- | --- |
| 1 | **A2** | `fix/a11y-fib-listbox` | Confirm P2. Named listbox; `aria-controls`; arrows; Enter/Space commit; Escape close; Tab closes (match DS dropdown tests). Axe `aria-input-field-name` leaves the baseline. |
| 2 | **A10** | `fix/a11y-validate-status` | Confirm P5. After A1. MCQ, Text Input, Matrix, Sort (misplaced chips already have `aria-invalid` — add visible text + status). Decorative icons `aria-hidden`. |

### Wave 3 — contrast and leftover target size

| Order | ID | Branch | Notes |
| --- | --- | --- | --- |
| 1 | **A7** | `fix/a11y-choice-contrast` | Confirm P3. Dark only. Retune Learn-Practice choice background/label in `matching.css` **and** `sort.css`. Measure painted text ≥4.5:1. Label `theme:dark-only`. |
| 2 | **A8** | `fix/a11y-sort-instructions-contrast` | Light. Don’t use `Body-Lighter` at `body-xxsmall`. Label `theme:light-only`. |
| — | **D1** | (if not already merged) | Inactive Matching cards. |

If D2’s 24px shipped in Wave 1, Wave 3 does not reopen it.

---

## GitHub mechanics

**Milestone:** `a11y-wcag-22-aa` (Activities, Aug 2026)

**Labels** (create if missing):

| Label | Use |
| --- | --- |
| `a11y` | All of these issues |
| `sev:critical` / `sev:serious` | A5 critical; rest serious |
| `wcag:perceivable` | A7, A8, D1, D2 (1.4.x / 2.5.8) |
| `wcag:operable` | A2, A4, D2 |
| `wcag:understandable` | A10 |
| `wcag:robust` | A1, A3, A5, A6, A9, A11 |
| `theme:dark-only` | A7 |
| `theme:light-only` | A8 |
| `needs-manual-verify` | A1, A2, A4, A10, D1 (AT / keyboard) |
| `repo:design-system` | D1, D2 |

**Commits:** Conventional, **no issue numbers in the subject**.  
Examples: `fix(a11y): Stop announcing the whole activity as a live region`  
PR body links the audit ID and uses `Closes #N` (one keyword per issue: `Closes #12, closes #15`).

**PRs:** Ready for review when DoD is met, unless you ask for draft. After merge: `git checkout main && git pull`, sync open branches, point the issue map at **Closed (PR #N)**.

---

## Issue body template

```markdown
## Finding
Audit **A# / D#** — one-line from the audit index.

## Where
`path:lines`

## Current
What happens today (AT / keyboard / contrast). Point at evidence PNG or report.json state if useful.

## Expected
WCAG 2.2 AA behavior in one short paragraph.

## How verified
- [ ] Light and dark (or the theme label)
- [ ] Keyboard walk of this flow
- [ ] `npm test` + axe baseline shrinks or stays equal
- [ ] Manual: …

## Suggested approach
Direction from the audit, not a patch. Product decision P# if any.

## Acceptance criteria
- [ ] …
- [ ] No new user-facing copy unless this issue is the copy (English in source)

## Audit
https://github.com/CodeSignal/learn_cosmo-activities-web/blob/main/a11y-audits/8-13-26/audit.md
```

File enough context that the implementer need not re-read the whole audit. Paste **Where / Current / Expected / Direction** from the matching audit section.

---

## Per-issue acceptance (critical / serious)

| ID | Acceptance (short) |
| --- | --- |
| A1 | `#activity-container` has no `aria-live`. Loading an activity does not dump the page to a live region. |
| A2 | Keyboard-only user can open a blank, move through choices, commit, and dismiss with Escape; Tab does not leave an open unnamed menu. Axe `aria-input-field-name` gone on `.fib-dropdown`. |
| A3 | Filled blank’s accessible name includes the chosen value; empty blank still has a placeholder name. |
| A4 | After select/place/return, focus stays on a chip or category, not `body`. |
| A5 | No `aria-pressed` on `role="listitem"`. Axe `aria-allowed-attr` gone on Sort chips. |
| A6 | No interactive nested in `role="button"` category. Axe `nested-interactive` gone on Sort. |
| A7 | Matching choice buttons, matched area, and Sort chips ≥4.5:1 in **dark** (axe + sampler). |
| A8 | Instructions line ≥4.5:1 in **light**. |
| A9 | Every `.activity-content-iframe` has a non-empty `title`. |
| A10 | Incorrect validate: `aria-invalid` and visible text on MCQ / Text Input / Matrix (and Sort misplaced); status region or equivalent for 4.1.3; icons `aria-hidden`. |
| A11 | Matching choices are not `role="option"` on `<button>` inside `role="listbox"`. Still keyboard-clickable. |
| D1 | Inactive Horizontal Card text ≥4.5:1 in both themes (or off-center cards not exposed to AT). Matching empty/focused states clear those axe nodes. |
| D2 | Divider accessible name; pointer target ≥24×24; keyboard resize unchanged. |

---

## Issue map

Fill issue/PR numbers when filing. Never write “this PR”.

| Audit | Issue | Wave | PR | Status |
| --- | --- | --- | --- | --- |
| Wave 0 CI | #21 | 0 | #20 | Closed (PR #20) |
| A1 | #22 | 1 | #35 | Closed (PR #35) |
| A4 | #23 | 1 (bundle Sort) | #36 | Closed (PR #36) |
| A5 | #24 | 1 (bundle Sort) | #36 | Closed (PR #36) |
| A6 | #25 | 1 (bundle Sort) | #36 | Closed (PR #36) |
| A3 | #26 | 1 | #37 | Closed (PR #37) |
| A9 | #27 | 1 | #38 | Closed (PR #38) |
| A11 | #28 | 1 | #39 | Closed (PR #39) |
| D2 | [DS #28](https://github.com/CodeSignal/learn_bespoke-design-system/issues/28) | 1 ∥ | | Open |
| D1 | [DS #29](https://github.com/CodeSignal/learn_bespoke-design-system/issues/29) | 1 ∥ / 3 | | Open |
| DS bump D2 | #29 | after D2 | | Blocked |
| DS bump D1 | #30 | after D1 | | Blocked |
| A2 | #31 | 2 | #40 | Closed (PR #40) |
| A10 | #32 | 2 | | Open |
| A7 | #33 | 3 | | Open |
| A8 | #34 | 3 | | Open |

---

## Definition of done (this plan)

- Every ID above is Fixed, Mitigated (recorded product decision), or Won’t fix (recorded).
- Shrink-only axe baseline matches the post-fix floor for the CI scenario set.
- Issue map points at real PR numbers.
- Moderate/minor (A12–A20, D3) **not** started until this list is on `main`, then a Phase 4 companion plan.

---

## Next step

P1–P7 confirmed as the recommended defaults. Wave 0 is on `main` (PR #20). A1 is on `main` (PR #35). Sort bundle is on `main` (PR #36). A3 is on `main` (PR #37). A9 is on `main` (PR #38). A11 is on `main` (PR #39). A2 is on `main` (PR #40). Wave 2 continues with A10 (`fix/a11y-validate-status`, #32).
