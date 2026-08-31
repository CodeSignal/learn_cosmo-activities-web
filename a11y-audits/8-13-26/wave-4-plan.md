# Phase 4 plan — moderate and minor

**Audit:** [audit.md](./audit.md)  
**Program:** [program-plan.md](./program-plan.md)  
**Critical / serious:** [resolution-plan.md](./resolution-plan.md) (A1–A11, D1–D2 on `main`)  
**Standard:** WCAG 2.2 AA  
**Status:** Product calls P8–P15 confirmed. Issues filed. A13 on `main` (PR #65). Executing Wave 4a A20.

In scope: **A12–A20, D3**, and leftover axe **A21**.  
Out of this plan: A1–A11, D1, D2. Do not reopen them. Do not retune A7 Learn-Practice choice tokens. Question editor stays out (internal-only).

---

## What is already on `main` (do not reopen)

| Audit | PR | Note |
| --- | --- | --- |
| Wave 0 | #20 | Characterization + shrink-only axe CI |
| A1 | #35 | `#activity-container` is not a live region |
| A4 / A5 / A6 | #36 | Sort roles, nesting, focus survival |
| A3 | #37 | Filled FIB blank name |
| A9 | #38 | Iframe `title` |
| A11 | #39 | Matching labeled group of buttons |
| A2 | #40 | FIB listbox keyboard |
| A10 | #41 | Validate status + “This answer is incorrect.” |
| A7 | #42 | Dark choice tokens in `matching.css` / `sort.css` |
| A8 | #44 | Sort **instructions** contrast (copy unchanged) |
| D2 | DS #30 → app #46 | Divider **name** + ≥24×24 hit target. Line color left for D3. |
| D1 | DS #31 → app #48 | Inactive cards: chrome fade (inset stroke), not `opacity`, not `aria-hidden`, not `scale()` |
| A17 | #60 | Drop Matrix `role="grid"` |
| A16 | #62 | Scroll indicator `aria-hidden` |
| A18 | #63 | MCQ fieldset named from question UI |
| A15 | #64 | Text Input Next button mounted |
| A13 | #65 | Toolbar inside `<main>` |
| D3 | DS #33 → app #61 | Divider line token (Neutral-800), ≥3:1 vs panes |

Unrelated merges on the same timeline: clipboard in iframes (#43), Sort heading font (#45). Not audit IDs.

---

## Re-verification (A12–A20, D3 still open)

Walked current `main` (`public/design-system` @ `da75b17`). None of these were fixed in passing.

| ID | Still true? | Evidence on `main` |
| --- | --- | --- |
| A12 | Yes | Only FIB mounts a real heading (`h2.fib-heading` “Fill in the blanks”). Matching, Sort, MCQ, Matrix, Text Input: heading rotor empty. Authored `heading` (when present) is a `div`, so it does not restore the rotor. |
| A13 | Yes | `#global-toolbar` is still appended to `document.body`. Landmarks are still `<main>` only. |
| A14 | Yes | Copy is still “Click or drag the items onto the cards above”. Keyboard place still works (A4/A6). A8’s characterization test **locks that string** until this issue changes it. |
| A15 | Yes | Text Input still builds `.text-input-next-button` and appends only the empty container. MCQ still does `appendChild(nextButton)`. |
| A16 | Yes | `.scroll-indicator` is still visible and has no `aria-hidden`. The bottom sentinel is already `aria-hidden`. |
| A17 | Yes | `<table class="matrix-table" role="grid">` remains. Cells are still native radios. |
| A18 | Yes | `fieldset.mcq-options` has no `legend`. Each input still has `aria-label="Option A: …"` beside a visible letter + text. Multi-question `div.mcq-legend` is still not associated with the fieldset. |
| A19 | Yes | `katex-render.js` still uses default auto-render. `.katex` roots stay `aria-hidden` with no MathML/text alternative. |
| A20 | Yes | `fib.css` has no `:focus` / `:focus-visible` on `.blank`. `toolbar.css` has none on `.global-toolbar-tool`. Matching’s designed two-tone ring is unchanged. |
| D3 | Yes | Split `::after` is still `background: #2b3b52` (horizontal and vertical). D2 named the separator and grew the hit box; do not reopen D2. |

---

## Leftover axe floor (proposed A21)

`a11y-audits/tools/axe-baseline.json`: **`color-contrast` 1**, only on `sort-chip-selected/light`.

**Diagnosis (code + prior CI, not a new full audit run):**

- Node: empty category placeholder `.categorization-dropzone.empty::before` (`content: "Drop items here"`).
- Token: `--Colors-Text-Body-Lighter` at 13px (`Fonts-Body-Default-xxs`). Same token A8 moved off the instructions line. This sibling was left.
- `sort-tray/light` paints the same `::before` and currently counts **0**. Axe is incomplete or compositing differs once a chip is `.active`. Do not treat “tray is clean” as proof the placeholder passes.
- This is visible instructional text, not a disabled control. 1.4.3 applies if painted contrast is under 4.5:1.
- Card fill is `--Colors-Learn-Practice-Card` → `Main-Top` (white in light). Body-Lighter on white is likely **above** 4.5:1; A8 failed at **4.46:1** on `Main-Default`. Measure **painted** `::before` vs the actual dropzone/card background before calling it a must-fix. Do not “fix” it inside A14 or any other Sort PR.

**ID:** **A21** (moderate, 1.4.3, light). Do not reopen A8.

P13 confirmed: **fix**. Measure painted contrast, then retune off `Body-Lighter` (same move as A8: `Body-Default` or `Light`). Placeholder copy “Drop items here” stays.

---

## Ownership (prefix ≠ repo)

| ID | Owning repo | Why |
| --- | --- | --- |
| A12, A13, A15, A16, A17, A18, A20 | **learn_cosmo-activities-web** | Shell / MCQ / Matrix / Text Input / FIB / toolbar |
| A14, A21 | **learn_cosmo-activities-web** | Sort copy vs Sort placeholder contrast. Different causes. |
| A19 | **learn_cosmo-activities-web** | KaTeX wrapper. Expose MathML; keep `aria-hidden` on the visual layer. |
| D3 | **learn_bespoke-design-system** | Split Panel `::after` color |
| After D3 merge | **learn_cosmo-activities-web** | Submodule bump (`chore(ds): bump design-system for a11y D3`) |

---

## Bundling

Default: **one GitHub issue per finding, one PR per issue**.

| Bundle | Issues (file separately) | One PR | Root cause |
| --- | --- | --- | --- |
| **A20** | A20 only | `fix/a11y-focus-visible` | Already one finding: FIB blanks **and** toolbar tools. Reuse the Matching / DS ring tokens on both. |
| **A21** | A21 only | `fix/a11y-sort-dropzone-contrast` | Same token family as A8, **different node**. A8 is closed. |

Do **not** bundle:

- A12 + A13 (shared skip-vs-landmarks *call*, two root causes: empty heading rotor vs toolbar outside landmarks).
- A14 + A21 (copy vs contrast).
- D3 + D2 (D2 already shipped name + 24px).
- A7 tokens into A21 or D3.

A15 is mount-or-delete, not a bundle with MCQ.

---

## Product decisions (confirmed)

P1–P7 already shipped in Waves 1–3. Phase 4 answers:

| # | Decision | Needed for | Confirmed |
| --- | --- | --- | --- |
| P8 | Editor still out of scope? | Scope | **Yes.** Internal-only; keep out of a11y work. |
| P9 | Skip link vs landmarks only? | A12, A13 | **Landmarks only.** No skip link. A13: move `#global-toolbar` into `<main>` (fixed positioning unchanged). No new `aria-label`. |
| P10 | A12 heading text | A12 | Promote authored `heading` (today a `div`) to a real heading when present. If none, use the existing type name: **Fill in the blanks**, **Matching**, **Matrix**, **Multiple Choice**, **Text Input**, **Sort into Boxes**. Match FIB’s `h2` pattern. A missing `h1` alone is not a WCAG fail. |
| P11 | A14 Sort instruction copy | A14 | **Click or drag the items onto the cards above, or select an item and press Enter on a card.** |
| P12 | A19 KaTeX policy | A19 | **Expose MathML.** Keep `aria-hidden` on the visual KaTeX layer. |
| P13 | Leftover Sort empty-dropzone contrast | A21 | **Fix.** Assign A21. Measure, then retune off `Body-Lighter`. Copy stays “Drop items here”. |
| P14 | A15: mount Next vs delete | A15 | **Mount it**, same as MCQ. Existing “Next” / `Go to next question`. |
| P15 | English-only | Any new string | **English in source.** No i18n layer in this program; internationalize later. |

---

## Sequence by dependency

```text
“go”
        │
        ├── Wave 4a (structure) ──► Wave 4b (headings, Sort copy, MathML, A21)
        │
        └── DS D3 in parallel
                 └── app submodule bump after DS merge
```

Do not parallelize two PRs that touch `sort.js` (A12 headings + A14 copy). A21 is `sort.css`; still land it after A14 so characterization tests in that file do not collide. A8’s characterization test asserts the current click-or-drag sentence; **A14 updates that assertion**.

### Wave 4a — AT / structure (no new user-facing copy)

Independent enough to file together and land in this order.

| Order | ID | Branch | Notes |
| --- | --- | --- | --- |
| 1 | **A17** | `fix/a11y-matrix-grid` | Remove `role="grid"`. Keep native table + radios + existing `aria-label="Matrix question"` / `scope` / sr-only labels. Tiny. |
| 2 | **A16** | `fix/a11y-scroll-indicator` | `aria-hidden="true"` on `.scroll-indicator`. Do not add “scroll for more”. |
| 3 | **A18** | `fix/a11y-mcq-fieldset` | Name the fieldset with `aria-labelledby` pointing at the existing question text (and `div.mcq-legend` when present). Drop redundant option `aria-label` so visible letter + text is the name (2.5.3). |
| 4 | **A15** | `fix/a11y-text-input-next` | `nextButtonContainer.appendChild(nextButton)` for non-last questions. Same “Next” control as MCQ. Do not copy MCQ’s `explainAnswer` gate. |
| 5 | **A13** | `fix/a11y-toolbar-landmark` | Move toolbar into `<main>`. No new accessible name. No skip link. |
| 6 | **A20** | `fix/a11y-focus-visible` | Designed ring on `.blank` and `.global-toolbar-tool`. Reuse Matching’s two-tone Neutral tokens (or DS `:focus-visible`). FIB/toolbar are not scripted-focus widgets; `:focus-visible` is appropriate (Matching keeps `:focus` on purpose). Retest inside the host iframe (`needs-manual-verify`). |

**DS (parallel, after plan approval):**

| ID | Branch (DS repo) | Then app |
| --- | --- | --- |
| **D3** | `fix/a11y-split-divider-color` | Bump submodule. Replace `#2b3b52` on `::after` with a semantic token. Measure **3:1** against both pane surfaces in light and dark. Focus/dragging already uses `--Colors-Base-Primary-700`; keep that. Do not change hit target, `aria-label`, or flex basis (D2). DS already declares `--Colors-Split-Panel-Divider-Line` (translucent blue) that `::after` ignores; use it only if it passes 3:1, otherwise a stroke/primary token that does. |

Hardcoded `#2b3b52` is close to `--Colors-Base-Neutral-1200` (`#2D3855`). Against dark `Main-Top` (`#1D2740`) that pair is likely under 3:1. Confirm with painted styles in the DS PR.

### Wave 4b — headings, copy, MathML, leftover contrast

Copy and policy are confirmed. Still sequence after 4a so the shell is landmark-complete first. A19 does not depend on Sort; it can overlap A12/A14/A21.

| Order | ID | Branch | Notes |
| --- | --- | --- | --- |
| 1 | **A12** | `fix/a11y-headings` | Authored heading becomes a real `h2` when present. Otherwise the type name (P10). FIB already has “Fill in the blanks”. |
| 2 | **A14** | `fix/a11y-sort-keyboard-copy` | Ship the P11 sentence. Keyboard path already exists. Flip the A8 characterization lock. |
| 3 | **A19** | `fix/a11y-katex-mathml` | KaTeX visual layer stays `aria-hidden`; expose MathML beside it. |
| 4 | **A21** | `fix/a11y-sort-dropzone-contrast` | Measure, then retune `::before` off `Body-Lighter`. Label `theme:light-only`. Rewrite axe baseline if `color-contrast` goes 1 → 0. |

---

## GitHub mechanics

**Milestone:** `a11y-wcag-22-aa` (already exists).

**Labels** (create `sev:moderate` / `sev:minor` if missing; others exist):

| Label | Use |
| --- | --- |
| `a11y` | All of these issues |
| `sev:moderate` | A12–A19, D3, A21 |
| `sev:minor` | A20 |
| `wcag:perceivable` | A12, A16, A19, D3, A21 |
| `wcag:operable` | A13, A14, A15, A20 |
| `wcag:robust` | A17, A18 |
| `theme:light-only` | A21 (if confirmed light-only) |
| `needs-manual-verify` | A12, A13, A14, A19, A20 (AT / host iframe) |
| `repo:design-system` | D3, DS bump D3 |

**Issue titles** (file when you say go):

| ID | Title |
| --- | --- |
| A12 | `[a11y][A12] Most activities have no headings` |
| A13 | `[a11y][A13] Toolbar sits outside landmarks` |
| A14 | `[a11y][A14] Sort copy omits the keyboard path` |
| A15 | `[a11y][A15] Text Input Next button is never mounted` |
| A16 | `[a11y][A16] Scroll indicator is visible to AT` |
| A17 | `[a11y][A17] Matrix role=grid without a grid keyboard model` |
| A18 | `[a11y][A18] MCQ fieldset has no name` |
| A19 | `[a11y][A19] KaTeX math has no accessible alternative` |
| A20 | `[a11y][A20] FIB blanks and toolbar tools have UA-only focus` |
| A21 | `[a11y][A21] Sort empty dropzone placeholder fails contrast` |
| D3 | `[a11y][D3] Split divider line is hardcoded #2b3b52` (DS repo) |
| DS bump D3 | `[a11y] Bump design-system after D3 (Split divider color)` |

**Commits:** Conventional, **no issue numbers in the subject**.  
Co-author agent commits: `Co-authored-by: Cursor <cursoragent@cursor.com>`.  
PR titles: `A11y | …`. Ready for review when DoD is met (not draft). Merge commits, not squash.

**Issue map rule:** never write “this PR”. Record the **previous** merged finding as Closed in the **next** consumer PR’s docs commit. After merge: `git checkout main && git pull`.  
The docs commit that **lands this plan** records **D1 Closed (PR #48)** and **DS bump D1 Closed (PR #48)**. Do not put #48 on A12–A20, A21, or D3 rows.

CodeRabbit often mis-attributes the previous-wave “Closed (PR #N)” docs row to the current PR. Skip those findings and reply on the thread if asked.

**Axe:** `PORT=3010 A11Y_BASE_URL=http://127.0.0.1:3010 npm run a11y:ci` (port 3000 is often a non-examples server). Restore `data/question.md`, `data/answer.md`, `data/report.md`, `data/score.json` before commits. `WRITE_BASELINE=1` in the same PR when counts shrink.

**Characterization:** add or flip a test in `test/a11y-characterization.test.js` per ID, including A19 MathML.

---

## Issue body template

Same as [resolution-plan.md](./resolution-plan.md). Paste Where / Current / Expected / Direction from the matching audit section. For A21, paste the leftover-axe diagnosis above. File enough context that the implementer need not re-read the whole audit.

---

## Per-issue acceptance

| ID | Acceptance (short) |
| --- | --- |
| A12 | Every in-scope activity exposes at least one `h2`. Authored heading wins; otherwise the P10 type name. FIB keeps “Fill in the blanks”. |
| A13 | Toolbar is inside `<main>`. No skip link. No new `aria-label`. |
| A14 | Instructions read: “Click or drag the items onto the cards above, or select an item and press Enter on a card.” Click, keyboard place, and drag still work. |
| A15 | Non-last Text Input questions mount a working Next button (same pattern as MCQ). |
| A16 | `.scroll-indicator` is `aria-hidden="true"` when present. No new “scroll for more” string. |
| A17 | Matrix table has no `role="grid"`. Native radios and names unchanged. |
| A18 | Fieldset has an accessible name from existing question UI. Option accessible name matches the visible letter + text (no stale `aria-label`). |
| A19 | Visual KaTeX stays `aria-hidden`. Equivalent MathML is exposed to AT. |
| A20 | `.blank` and `.global-toolbar-tool` show a designed focus indicator (not UA-only). Matching ring unchanged. Host-iframe retest noted. |
| A21 | Empty-dropzone placeholder ≥4.5:1 in light. Axe `color-contrast` shrinks if the node clears. |
| D3 | Divider line uses a semantic token; ≥3:1 vs both pane surfaces in both themes. D2 name and 24px hit target unchanged. |

---

## Issue map

Fill issue/PR numbers when filing. Never write “this PR”.

| Audit | Issue | Wave | PR | Status |
| --- | --- | --- | --- | --- |
| D1 | [DS #29](https://github.com/CodeSignal/learn_bespoke-design-system/issues/29) | 1 ∥ / 3 | #48 | Closed (PR #48) |
| DS bump D1 | #30 | after D1 | #48 | Closed (PR #48) |
| A12 | #49 | 4b | | Open |
| A13 | #50 | 4a | #65 | Closed (PR #65) |
| A14 | #51 | 4b | | Open |
| A15 | #52 | 4a | #64 | Closed (PR #64) |
| A16 | #53 | 4a | #62 | Closed (PR #62) |
| A17 | #54 | 4a | #60 | Closed (PR #60) |
| A18 | #55 | 4a | #63 | Closed (PR #63) |
| A19 | #56 | 4b | | Open |
| A20 | #57 | 4a | | Open |
| A21 | #58 | 4b | | Open |
| D3 | [DS #32](https://github.com/CodeSignal/learn_bespoke-design-system/issues/32) | 4 ∥ | #61 | Closed (PR #61) |
| DS bump D3 | #59 | after D3 | #61 | Closed (PR #61) |

Critical/serious rows stay in [resolution-plan.md](./resolution-plan.md). The docs commit that lands this file also sets D1 / bump D1 to Closed (PR #48) there.

---

## Definition of done (this plan)

- Every ID above is Fixed, Mitigated (recorded product decision), or Won’t fix (recorded).
- Shrink-only axe baseline matches the post-fix floor (`color-contrast` 0 after A21).
- Issue map points at real PR numbers.
- A1–A11 / D1 / D2 were not reopened. A7 choice tokens were not retuned.

---

## Next step

A13 is on `main` (PR #65). Next after A20: Wave 4b A12 (`fix/a11y-headings`, #49). Do not put #65 on the A20 row.
