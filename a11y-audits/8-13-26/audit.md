# WCAG 2.2 AA audit — Cosmo Activities Web

**Date:** 13 August 2026  
**Standard:** WCAG 2.2 Level AA  
**Harness:** `a11y-audits/tools/` (Playwright + `@axe-core/playwright` 4.13, tags `wcag2a`–`wcag22aa`)  
**Evidence:** `a11y-audits/8-13-26/evidence/` (`report.json` + per-state PNGs)  
**Status:** Findings only. No product patches. No GitHub issues.

Axe is a floor. Several findings below (live region, FIB keyboard, focus survival, unlabeled iframes) are from extra scripts and code review because axe was silent or incomplete.

---

## Scope

**In:** Learner runtime at `/play` for Fill in the blank, Matching, Matrix, MCQ, Sort into Boxes, Text input, plus the shared shell (toolbar, split panel, KaTeX, scroll indicator). Light and dark via Playwright `colorScheme` (`prefers-color-scheme`). Canonical examples plus complexity variants per the [program plan](./program-plan.md).

**Not covered**

- Swipe Left/Right, question editor, examples-picker chrome
- Contents of `__Content__` URL / `/sim/` iframes (shell around them was scanned)
- Unused design-system components (Modal, Numeric Slider, DS Dropdown)
- Host platform chrome around this app
- Screen-reader confirmation (VoiceOver / JAWS / NVDA)
- Forced-colors / Windows High Contrast as a certification pass
- Locales (English only)
- `fib-filled` in dark — harness reused persisted answers from the light run; light screenshot + DOM snapshot stand in

**Method**

1. `npm run examples` → `POST /api/examples/select` → open `/play` (not the picker iframe).
2. Walk 34 scenarios × 2 themes (69 records including one 375×667 spot-check). Screenshots + axe + injected checks (landmarks, live regions, tab stops, nested interactives, target size, computed-style contrast with ancestor opacity).
3. Widget extras: FIB open/keyboard, Matching focus ring, Sort focus survival, Split divider focus, validate via `POST /validate`.
4. Code review of `public/index.html`, `app.js`, each in-scope module, `activity-content-shell.js`, and DS Split Panel / Horizontal Cards.

**Axe rules that fired**

| Rule | Impact | States |
| --- | --- | --- |
| `aria-allowed-attr` | critical | Sort chip selected / focus-survival (both themes) |
| `color-contrast` | serious | Matching (all walked states), Sort (all walked states), split-sim dark |
| `aria-input-field-name` | serious | FIB dropdown open / keyboard-in-menu (both themes) |
| `nested-interactive` | serious | Sort after a chip is placed (light) |

---

## Index — application (A)

| ID | Sev | Finding | WCAG | Theme |
| --- | --- | --- | --- | --- |
| A1 | serious | `#activity-container` is a polite live region wrapping the whole activity | 4.1.3 | both |
| A2 | serious | FIB custom listbox: unnamed, options not keyboard-operable, Tab leaves the menu open, no Escape | 2.1.1, 4.1.2, 1.4.13 | both |
| A3 | serious | Filled FIB blank still named “blank N” (`aria-label` overrides the visible value) | 4.1.2, 1.3.1 | both |
| A4 | serious | Sort `render()` drops keyboard focus to `body` | 2.4.3 | both |
| A5 | critical | Sort tray chip is `button` + `role="listitem"` + `aria-pressed` (invalid ARIA) | 4.1.2 | both |
| A6 | serious | Sort places a real `button` chip inside a `role="button"` category card | 4.1.2 | both |
| A7 | serious | Matching/Sort “interactive choice” colors fail 4.5:1 in dark (choice buttons, matched area, chips) | 1.4.3 | dark |
| A8 | serious | Sort instructions “Click or drag…” are 4.46:1 in light | 1.4.3 | light |
| A9 | serious | Side-content `<iframe>` has no `title` / `aria-label` | 4.1.2, 2.4.1 | both |
| A10 | serious | Validate errors are visual only (icon/color); not `aria-invalid`, not named, not a status message | 3.3.1, 4.1.3, 1.3.3 | both |
| A11 | serious | Matching choices are `<button role="option">` in a `role="listbox"` | 4.1.2 | both |
| A12 | moderate | No `h1`; most activities have no headings at all | 1.3.1, 2.4.6 | both |
| A13 | moderate | Toolbar sits outside `<main>` with no `nav` / complementary landmark | 1.3.1, 2.4.1 | both |
| A14 | moderate | Sort copy omits the keyboard path that already exists | 2.5.7, 3.3.2 | both |
| A15 | moderate | Text Input builds a Next button but never mounts it | 2.4.3 | both |
| A16 | moderate | Scroll indicator is visible and not `aria-hidden` | 1.1.1, 4.1.2 | both |
| A17 | moderate | Matrix table uses `role="grid"` without a grid keyboard model | 4.1.2 | both |
| A18 | moderate | MCQ `fieldset` has no `legend`; option `aria-label` duplicates visible text | 1.3.1, 2.5.3 | both |
| A19 | moderate | KaTeX roots are `aria-hidden`; math has no accessible alternative | 1.1.1 | both |
| A20 | minor | FIB blanks and toolbar tools have no designed `:focus-visible` (UA outline only) | 2.4.7, 2.4.11 | both |

## Index — design system (D)

Prefix is **not** ownership. Confirm in the resolution plan.

| ID | Sev | Finding | WCAG | Theme |
| --- | --- | --- | --- | --- |
| D1 | serious | Horizontal Cards set inactive cards to `opacity: 0.5`, which drops description + “Best response” below 4.5:1 | 1.4.3 | both |
| D2 | serious | Split Panel divider is 4px wide, unnamed `role="separator"` | 2.5.8, 4.1.2 | both |
| D3 | moderate | Split divider line uses hardcoded `#2b3b52` instead of a semantic token | 1.4.11 | both |

---

## A1 — Whole activity is a polite live region

**Where:** `public/index.html:37`; every activity mounts by replacing children of `#activity-container` (`public/app.js`, each `init*`).

**What happens:** `<div id="activity-container" aria-live="polite">` wraps the entire activity. Load, example switch, and innerHTML swaps replace that subtree. A live region that rebuilds its contents re-announces (or dumps) the new tree. Axe reports no violation — the markup is valid.

**Evidence:** Extra check, all states: `liveRegions: [{ id: 'activity-container', live: 'polite', childCount: 1, htmlLength: … }]`. No other status/alert region exists.

**Impact:** Screen-reader users can hear the full activity (or a large chunk) on every render, including Sort’s per-placement `render()` if it ever targeted this node, and on first paint. Status that *should* be announced (validate errors, A10) is not.

**Direction:** Remove `aria-live` from the container. If validate/progress must be announced, add a dedicated `role="status"` that gets a short string, not the whole UI. Product call: live vs quiet.

---

## A2 — FIB custom listbox is not a keyboard widget

**Where:** `public/modules/fib.js:81–253` (blank as `role="button"` + `aria-haspopup="listbox"`; menu `role="listbox"` appended to `document.body`; options `role="option"` with `mousedown` only).

**What happens:** Enter/Space on a blank opens the menu. Options have `tabIndex: -1`. ArrowDown does nothing. Tab moves focus to the next blank while the menu stays open. There is no Escape handler (`closeMenu` listens to outside mousedown, resize, scroll). The listbox has no accessible name.

**Evidence:**

- Axe `aria-input-field-name` on `.fib-dropdown` — `fib-dropdown-open` and `fib-keyboard-in-menu`, both themes.
- `fibOptions`: every option `{ tabIndex: -1 }`.
- After ArrowDown + Tab: `active.name = "blank 2"`, `dropdownStillOpen: 1`.
- Screenshots: `fib-dropdown-open--light.png`, `fib-dropdown-open--dark.png`.

**Impact:** Keyboard users cannot choose a value without a pointer. 2.1.1 fail. Unnamed listbox is 4.1.2. Pointer-opened extra content that cannot be dismissed with Escape is 1.4.13.

**Direction:** Implement the listbox pattern (`aria-controls`, `aria-activedescendant` or roving tabindex, Arrow keys, Enter/Space to commit, Escape to close, name the listbox). Prefer the DS Dropdown if it already does this; do not keep a second widget. Do not guess — DS Dropdown is unused here today.

---

## A3 — Filled blank still announced as “blank N”

**Where:** Server stamp `server.js` (blank `aria-label="blank ${n}"`); `public/modules/fib.js:118–123` `updateBlankDisplays()` sets `textContent` but never updates or removes `aria-label`.

**What happens:** `aria-label` wins over visible text. After selecting “nonsense”, the control is still named “blank 1”.

**Evidence:** `fib-filled` light: `{ ariaLabel: 'blank 1', text: 'nonsense', empty: false }`.

**Impact:** Screen-reader users cannot hear which choice is in the blank. 4.1.2 / 1.3.1.

**Direction:** When filled, drop `aria-label` (visible text becomes the name) or set a name that includes the value, e.g. “blank 1, nonsense”. Restore a placeholder name when empty.

---

## A4 — Sort rebuild drops focus

**Where:** `public/modules/sort.js:265–268` `render()` clears category and tray DOM on every selection/placement.

**What happens:** Focusing chip 0 then activating chip 1 rebuilds both lists. `document.activeElement` is `body`.

**Evidence:** `sort-focus-survival` extras: `active.tag = "body"`. Both themes.

**Impact:** Keyboard users are thrown to the top of the page after each action. 2.4.3.

**Direction:** Preserve a focus key (`data-item-index`) across `render()` and restore focus; or mutate in place instead of wiping the tray/categories.

---

## A5 — Sort tray chip: invalid `role` + `aria-pressed`

**Where:** `public/modules/sort.js:95–111` (`<button>` + `aria-pressed` when selected); `257` then `role="listitem"` on tray chips.

**What happens:** The implicit button role is replaced by `listitem`. `aria-pressed` is not allowed on `listitem`. Axe `aria-allowed-attr`, impact **critical**.

**Evidence:** `sort-chip-selected` and `sort-focus-survival`, both themes. Node: `.categorization-chip.body-large.active`.

**Impact:** AT may ignore pressed state and button semantics. 4.1.2.

**Direction:** Keep `role="listitem"` on a wrapper, not the button; or drop `listitem` and name the tray another way. `aria-pressed` belongs on the button. Do not put both on one node.

---

## A6 — Nested interactives in Sort categories

**Where:** `public/modules/sort.js:178–185` category `tabindex="0" role="button"`; placed chips are `<button class="categorization-chip">` inside that card (`211`).

**What happens:** Axe `nested-interactive` after a chip is placed (`sort-keyboard-place`, `sort-validate`, light). Extra check: `outer: div.categorization-category role=button` / `inner: button.categorization-chip`.

**Impact:** Tab order and AT activation are ambiguous (activate category vs return chip to tray). 4.1.2.

**Direction:** Category is a drop/click target, not a button, when it contains buttons. Use a labeled group/region for the card; keep placement on the empty state or a dedicated control.

---

## A7 — Dark “interactive choice” text contrast

**Where:** App semantic aliases (duplicated):

- `public/modules/matching.css:14–16` and dark `30–32`
- `public/modules/sort.css:5–6` and dark `19–20`

`--Colors-Learn-Practice-Interactive-Choice-Main-Background` → `Accent-Sky-Blue-700`; `--…-Label` → `Neutral-00`.

**What happens:** Matching choice buttons, matched selection areas, and Sort chips fail 1.4.3 in dark. Light Sort chips were not flagged by axe (instructions were; see A8).

**Evidence:**

- Axe `color-contrast` on `.matching-choice-button` — matching states in **dark**, and `shell-split-sim/dark`.
- Axe on `.categorization-chip-label > p` — all Sort dark states.
- Sampler: matched “Tension” **1.68:1** dark; Sort chip text **2.89:1** dark.
- Screenshots: `matching-empty--dark.png`, `sort-tray--dark.png`.

**Impact:** Choice text is the primary interactive content. Dark-theme learners fail 1.4.3.

**Direction:** Retune the Learn-Practice choice pair (or stop overriding `.button-primary` with a failing pair). Measure painted text, not the token sheet. This is **app CSS**, not a DS semantic token, unless you promote the pair into the DS.

---

## A8 — Sort instructions contrast (light)

**Where:** `public/modules/sort.js:49` `.categorization-instructions-text.body-xxsmall`; color `var(--Colors-Text-Body-Lighter)` via sort styles / typography.

**What happens:** Axe `color-contrast` on that paragraph in every Sort **light** state. Sampler **4.46:1** (AA body text needs 4.5:1).

**Evidence:** `sort-tray--light.png`; axe node `.categorization-instructions-text`.

**Impact:** Instruction line is how mouse users learn the task; it is also the only mention of drag (see A14).

**Direction:** Use `Text-Body-Default` or `Light`, not `Lighter`, on this size.

---

## A9 — Untitled content iframes

**Where:** `public/utils/activity-content-shell.js:122–125` creates `.activity-content-iframe` with no `title` or `aria-label`.

**What happens:** Split markdown (blob URL), external URL, and `/sim/` iframes are unnamed.

**Evidence:** Extra check:

- `shell-split-markdown`: `title: null`, blob src
- `shell-split-url`: `https://example.com/documentation`, `title: null`
- `shell-split-sim`: `src: '/sim/'`, `title: null`

Axe did not flag these (often skips cross-origin / excluded iframes). Still 4.1.2 / 2.4.1.

**Impact:** Screen-reader users get “frame” with no purpose. Keyboard users cannot tell splitter vs frame.

**Direction:** Set `title` from content type (e.g. “Reference”, “Simulation”) or from authored markdown. Product call on the exact string.

---

## A10 — Validate feedback is not programmatic

**Where:**

- MCQ: `public/modules/mcq.js:370–384` unlabeled `.mcq-question-error-icon`; class `mcq-question-incorrect`; no `aria-invalid`
- Text input: `public/modules/text-input.js:588–603` same pattern
- Matrix: `public/modules/matrix.js:212–218` `matrix-row-incorrect` class only
- Sort: `aria-invalid` only on a misplaced **placed** chip (`sort.js:100`) — not a status message

**What happens:** After `POST /validate`, MCQ and Text Input show a decorative icon (`ariaHidden: null`, no label). `invalidEls` stayed `[]` for MCQ/text/matrix. No `role="status"` / `alert`. A1’s live region does not announce a short error string.

**Evidence:** `mcq-validate` / `text-validate` extra checks; screenshots `mcq-validate--light.png`, `text-validate--light.png`.

**Impact:** 3.3.1 identify errors, 4.1.3 status messages, 1.3.3 if the icon is the only non-color cue and it is not named.

**Direction:** `aria-invalid` on the relevant control(s); visible text error (“This answer is incorrect”); `aria-describedby` or a status region. Hide decorative icons with `aria-hidden="true"`. Product call on wording.

---

## A11 — Matching listbox / option-on-button

**Where:** `public/modules/matching.js:25` `#matching-choices role="listbox"`; `210–216` `<button role="option">`.

**What happens:** Native buttons with `role="option"` are not listbox children in the ARIA sense (options should not be buttons). `aria-label="Select Tension"` plus visible “Tension” can double-speak. Axe did not fire `nested-interactive` here.

**Evidence:** `matchingChoicesRole: "listbox"`; buttons `{ tag: 'button', role: 'option' }`. Disabled used choices correctly use `disabled` (1.4.3 exemption).

**Impact:** AT may announce both button and option; listbox keyboard expectations (aria-activedescendant) are unmet. Choices are still tabbable as buttons, so this is less blocking than A2.

**Direction:** Either real buttons in a labeled group (drop listbox/option), or a true listbox with non-button options and roving tabindex. Do not mix.

---

## A12 — Heading hierarchy

**Where:** `public/index.html` title “Activity”, no `h1`. FIB: `fib.js:14–17` `h2.fib-heading` “Fill in the blanks”. MCQ, Matrix, Text input, Matching, Sort: no `h1`–`h6` in the extra-check snapshot.

**Evidence:** `shell-no-side` headings `[{ tag: 'h2', text: 'Fill in the blanks' }]`. `mcq-unanswered` / `matrix-unanswered` headings `[]`.

**Impact:** AT heading-rotor is empty or starts at level 2. Moderate 1.3.1 / 2.4.6.

**Direction:** One `h1` per activity (visible or visually hidden) from the activity type or practice question. Do not skip to `h2`.

---

## A13 — Toolbar outside landmarks

**Where:** `public/components/toolbar.js:15–21` appends `#global-toolbar` to `document.body`. `index.html` only landmarks `<main>`.

**Evidence:** `toolbarInfo.inMain: false` on every state. Tab order: activity controls then Clear All (or Clear All first in Matrix, because radios are visually 0×0 and were filtered from our visible-tab list).

**Impact:** Landmark navigation misses Clear All / Open URL. Moderate. Related product call: skip link (plan item 2) vs landmarks-only.

**Direction:** Put the toolbar in `role="toolbar"` / `nav` with an accessible name, or inside `main`.

---

## A14 — Sort instructions omit keyboard

**Where:** `public/modules/sort.js:49` “Click or drag the items onto the cards above”. Keyboard path exists (`228–237` Enter/Space on category).

**Evidence:** Visible copy vs working `sort-keyboard-place` scenario (chip placed without drag).

**Impact:** 2.5.7 is met by the equivalent, but it is not discoverable (3.3.2). Moderate. Product call on copy.

**Direction:** Mention keyboard (select an item, then Enter on a category) or a short “How to sort” that covers click, keyboard, and drag.

---

## A15 — Text Input Next never enters the DOM

**Where:** `public/modules/text-input.js:547–580` creates `.text-input-next-button` and a container; only the **empty container** is appended (`580`). Contrast: MCQ does `nextButtonContainer.appendChild(nextButton)` (`mcq.js:292`).

**Evidence:** `text-advanced`: `nextButtonsInDom: 0`, `textInputNextContainers: 6`.

**Impact:** The intended “focus next question” control is missing for everyone, including keyboard users. Users can still Tab to the next field. Moderate functional + 2.4.3.

**Direction:** Append the button as MCQ does, or delete the dead code if Next is not desired.

---

## A16 — Scroll indicator in the accessibility tree

**Where:** `public/app.js:417–428` decorative chevron; `public/styles.css` `.scroll-indicator`. Sentinel is `aria-hidden`; the indicator is not.

**Evidence:** `shell-scroll-indicator`: `{ visible: true, ariaHidden: null, role: null }`.

**Impact:** AT may find an unlabeled graphic. Moderate 1.1.1.

**Direction:** `aria-hidden="true"` and `pointer-events: none` (already non-control). Do not add a live “scroll for more” unless product wants it.

---

## A17 — Matrix `role="grid"` without grid behavior

**Where:** `public/modules/matrix.js:51` `<table class="matrix-table" role="grid">`. Cells are native radios, not `gridcell` with arrow-key management.

**Evidence:** Landmark dump: `{ tag: 'table', role: 'grid', name: 'Matrix question' }`. Axe silent.

**Impact:** Superfluous `role="grid"` promises a widget keyboard model the table does not implement. Moderate 4.1.2.

**Direction:** Remove `role="grid"`; keep a native table + radio groups (already has `scope` and sr-only labels). That pattern is the accessible one.

---

## A18 — MCQ fieldset / name

**Where:** `public/modules/mcq.js:130–147` `fieldset.mcq-options` with no `legend`; each input `aria-label="Option A: …"` while the label already shows letter + text.

**Evidence:** DOM review; axe did not flag. Multi-question legend is a `div.mcq-legend`, not associated with the fieldset.

**Impact:** Duplicate accessible names; fieldset unnamed. Moderate 1.3.1 / 2.5.3.

**Direction:** `legend` = question text (or visually hidden). Drop redundant `aria-label` if the visible label is enough.

---

## A19 — KaTeX has no accessible math

**Where:** `public/utils/katex-render.js` default auto-render; KaTeX marks `.katex` `aria-hidden`.

**Evidence:** `fib-latex`: `katex: 19`, `katexAriaHidden: 19`. Same pattern on matching-latex.

**Impact:** Formulae are invisible to AT. Moderate 1.1.1 unless product accepts visual-only math. Product call (plan item 5).

**Direction:** Keep `aria-hidden` on the visual layer and expose MathML or a text alternative; or document as won’t-fix with a content rule for authors.

---

## A20 — FIB / toolbar focus styling is UA-only

**Where:** `public/modules/fib.css` — no `:focus` / `:focus-visible` on `.blank`. `public/components/toolbar.css` — none on `.global-toolbar-tool`. Matching already has a designed two-tone ring.

**Evidence:** Focus extras, FIB unanswered: outline `auto 3px` (light `rgb(45, 56, 85)`, dark `rgb(193, 199, 215)`), `boxShadow: none`. 2.4.7 likely **passes** via the UA ring. 2.4.11 / consistency with Matching is weaker.

**Impact:** Minor unless a host iframe suppresses UA outlines. Retest inside the CodeSignal host.

**Direction:** Reuse the Matching / DS `focus-visible` ring on blanks and toolbar tools.

---

## D1 — Horizontal Cards inactive opacity vs contrast

**Where:** `public/design-system/components/horizontal-cards/horizontal-cards.css:87–88`  
`.horizontal-cards-card:not(.horizontal-cards-card-active) { opacity: 0.5; }`

**What happens:** Matching card descriptions and inactive “Best response” controls fail 1.4.3 once opacity is composited. Axe nodes are `data-index="1"` (not the centered card) in light; dark also flags those plus choice buttons (A7).

**Evidence:** Sampler: inactive description **2.73:1** light / **3.13:1** dark; inactive “Best response” **1.95:1** light. Axe `color-contrast` on every Matching state.

**Impact:** Adjacent cards are still readable visually and are in the accessibility tree. 1.4.3 applies (they are not `disabled`).

**Direction:** Do not fade text below 4.5:1. Fade a chrome/overlay, reduce size, or `aria-hidden` off-screen cards if they must stay dim. DS change; Matching is the consumer. Budget an app submodule bump.

---

## D2 — Split Panel hit target and name

**Where:** `public/design-system/components/split-panel/split-panel.js:56–62` (`role="separator"`, valuemin/max, no `aria-label`); `split-panel.css:60–70` `flex: 0 0 4px` (margin `-2px` does not enlarge `getBoundingClientRect()`).

**What happens:** Extra check: `{ label: null, width: 4, height: 800, tabIndex: 0, valuenow: '35' }`. Keyboard arrows work (`handleKeyDown`). Target size 2.5.8 needs 24×24 CSS px (exception does not apply — not inline text).

**Evidence:** `shell-split-markdown` both themes; `targetSizes` lists the divider.

**Impact:** Pointer users with low accuracy cannot grab the splitter. Unnamed separator is “separator” with no purpose. Keyboard users can still resize.

**Direction:** Expand the hit area (padding/pseudo) to ≥24px without changing layout; `aria-label` e.g. “Resize reference panel”; keep valuetext if useful. DS PR + app bump.

---

## D3 — Split divider hardcoded color

**Where:** `public/design-system/components/split-panel/split-panel.css:81` `background: #2b3b52` on `::after`.

**What happens:** Not a semantic token; may fail 1.4.11 against some pane backgrounds. Focus state uses `--Colors-Base-Primary-700`.

**Impact:** Moderate non-text contrast / theming drift.

**Direction:** Use a stroke/primary token that is already AA in both themes (ChatCPT token work). Measure 3:1 against both pane surfaces.

---

## What we re-verified as OK (do not reopen)

- Matching selection-area **designed** two-tone `:focus` ring is present in dark (`box-shadow` two rings). PR-era 2.4.7 work holds.
- Sort keyboard placement (Enter/Space on category) works (`sort-keyboard-place`).
- Sort chips in light were not an axe text-contrast fail (instructions were).
- Toolbar tools are 40×40 and have `aria-label`.
- FIB empty blanks meet 24×24 (and are inline in a sentence — 2.5.8 exception anyway).
- Matrix sr-only radio labels are present (`Row: Column`).
- KaTeX visual layer is consistently `aria-hidden` (see A19 for the remaining gap).
- `html lang="en"` is set.
- Disabled Matching choices are exempt from 1.4.3.

---

## Prioritized remediation phases

Sequence by dependency (AT first), not only severity.

| Phase | IDs | Why first |
| --- | --- | --- |
| **0** | — | Characterization tests around `#activity-container` + one widget (FIB or Sort). PR CI: `npm test` + shrink-only axe baseline. This repo has **no PR CI** today. |
| **1 — AT / structure** | A1, A5, A6, A2 (ARIA), A3, A11, A9, A17, D2 (name) | Restore roles and names before restyling. |
| **2 — Keyboard** | A2 (keys/Escape), A4, A15 | FIB menu and Sort focus survival. |
| **3 — Contrast / target** | A7, A8, D1, D2 (24px), D3 | Dark choice tokens; faded cards; splitter. |
| **4 — Errors / copy / moderate** | A10, A12–A14, A16, A18–A20 | After the shell is AT-usable. |

DS items (D1–D3) can proceed in parallel in `learn_bespoke-design-system`, then a **submodule bump PR** here.

Do **not** implement until you approve a resolution plan for **critical + serious** (A1–A11, A5, D1–D2). Moderate/minor wait for Phase 4 of the program.

---

## Product decisions (still ask; do not guess)

Same list as the program plan, now tied to IDs:

1. Editor still out of scope?
2. Skip link vs A12/A13 landmarks only?
3. A1: remove live region vs dedicated status region?
4. A7: app token retune vs promoting a DS pair?
5. A19 KaTeX policy?
6. A14 Sort instruction copy?
7. A10 validate announcement wording?
8. English-only still OK?

---

## Retest checklist (both themes)

After fixes, at `/play` with the same examples:

- [ ] Axe `wcag2a`–`wcag22aa` on the scan matrix; baseline shrinks or stays equal
- [ ] FIB: Tab to blank, Enter, arrows through options, Enter commits, Escape closes, Tab does not leave a stray menu; filled blank name includes the value
- [ ] Matching: only centered selection in tab order; choice buttons ≥4.5:1 in dark; inactive cards do not fail 1.4.3 (or are hidden from AT)
- [ ] Sort: focus stays on a chip/category after place/select; no nested buttons; no `aria-pressed` on `listitem`; instructions contrast and copy
- [ ] Matrix: native table (no fake grid); validate announces/marks rows
- [ ] MCQ / Text Input: validate `aria-invalid` + text; Next mounted if required
- [ ] Split: iframe titled; divider named and ≥24×24; keyboard arrows still resize
- [ ] `#activity-container` is not a live region; a status node (if any) does not dump the page
- [ ] Keyboard-only pass of each canonical example
- [ ] VoiceOver (Safari) + one of NVDA/JAWS — still required; axe does not replace it
