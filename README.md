# Cosmo Activities Web

An interactive web-based learning platform that supports multiple types of educational activities. Intended to bring mobile activities to the web experience. Built with vanilla JavaScript and Node.js, this platform provides engaging ways to practice and assess knowledge through different interactive formats.

## Features

### Activity Types

- **🎯 Swipe Left or Right**: Tinder-style interface for categorizing statements or concepts
- **📝 Fill in the Blanks**: Interactive forms for completing educational content
- **📦 Sort into Boxes**: Drag-and-drop interface for organizing items into categories
- **▦ Matrix**: Table of row labels with one radio choice per row across defined columns (see `data/examples/matrix.md` and `matrix.md`)

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd learn_cosmo-activities-web
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### Examples mode (developer workflow)

To quickly try every file under `data/examples/` without manually copying each one into `data/question.md`, start the server with **`--examples`** (or use **`npm run examples`**):

```bash
npm run examples
# equivalent: node server.js --examples
```

Then open **http://localhost:3000/**. You get a split layout: a searchable list of example markdown files on the left, and the main activity app in an **iframe** on the right (loaded from **`/play`**). When you pick an example, the server copies that file to **`data/question.md`** and the iframe reloads so **`/api/activity`** reflects the new content.

This mode is intended for local development and QA only. The same static assets and activity APIs apply as in normal mode; only the root route and the extra example APIs are added (see **API Endpoints** below).

### Edit mode (authoring)

`--edit <file>` serves a form-based question editor at **http://localhost:3000/** instead of the learner activity. Changes auto-save back to that file.

```bash
node server.js --edit data/question.md
```

If the file does not exist yet, the editor asks which activity type to create. It can author **Text Input**, **Multiple Choice**, **Matrix**, **Fill in the Blanks**, and **Matching**. Sort Into Boxes and Swipe Left or Right are not in the editor; write those by hand (see `data/examples/`).

#### Split assessment files

By default the editor writes one combined markdown file, with answers inline (`__Correct Answers__`, `- B - Correct`, `[[blank:answer]]`, and so on). That is the practice format.

Pass `--answer-key <file>` to write the assessment split used by `generate-score.js`:

```bash
node server.js --edit path/to/question.md --answer-key path/to/question-answer-key.md
```

On save, answers are stripped from the question file and written to the answer-key file as an `__Answer Key__` list. On load, the editor merges the two files so you still edit answers in the same form. The `assessment-*.md` / `assessment-*-answer-key.md` pairs under `data/examples/` show the split format.

#### Copy markdown

`--copy-markdown` adds a button that copies the editor's combined markdown (answers inline) to the clipboard:

```bash
node server.js --edit data/question.md --copy-markdown
```

### Assessment scoring groups

`generate-score.js` gives each question (each row of a Matrix) 1 point on its own. To score some of them all or nothing, list them in a `__Scoring Groups__` section of the answer-key file:

```markdown
__Answer Key__

- Question 1: B
- Question 2: C
- Question 3: A
- Question 4: B

__Scoring Groups__

- Questions 1-3
```

- Each list item is one group. It works for **Text Input**, **Multiple Choice**, and **Matrix**. Name members by position in question.md: `Question N` for Text Input and Multiple Choice, `Row N` for Matrix. Write a range (`Questions 1-3`, `Rows 1-5`), a comma-separated list (`Question 2, Question 5`), or both.
- A group is worth 1 point per member, as the same questions would be ungrouped, and earns them only when every member is correct. Above, a wrong answer to question 2 scores 0 / 3 for questions 1-3 instead of 2 / 3. Question 4 is scored on its own.
- `validate-later` questions and questions without an answer-key entry are skipped, inside a group as outside one. A group with nothing left to score is left out of the score.
- `score.json` has one breakout per group, titled as written (`Questions 1-3`). In `report.md`, the summary adds the points and each group's result, and each member names its group.
- A question can be in one group only. A group that names a question the task does not have, or a group in another activity type, fails grading with an error that names the group.
- The section stays in the answer-key file, so the browser never receives it. Practice mode does not use it. The editor (`--edit` with `--answer-key`) has no field for it and keeps it when it saves.

See `data/examples/assessment-mcq-scoring-groups.md` and `data/examples/assessment-matrix-scoring-group.md`.

### Text Input: numeric tolerance

A `numeric`, `numeric-with-units`, or `numeric-with-currency` answer is correct when it is within `threshold` of the key, inclusive. The default is `0.01`. `threshold` takes two forms:

- A number is the largest difference accepted: `threshold=0.5` with key 10 accepts 9.5 to 10.5. `threshold=0` needs an exact match (after `precision` rounding for `numeric`).
- A percentage is a share of the key: `threshold=20%` with key 50 accepts 40 to 60, and with key -50 accepts -60 to -40. With key 0, only 0 is correct. A percentage that does not parse (`threshold=abc%`) matches no answer, like a threshold that is not a number.

```markdown
- Question 1: 20000000 [kind: numeric] [options: precision=0,threshold=20%]
```

In an assessment, question.md keeps each answer's `[kind: …] [options: …]`, and the browser receives them. A number threshold set as a share of the key gives the key away (`threshold=10` for 20% of 50). A percentage does not. See `data/examples/assessment-text-input-estimates.md`.

### Text Input: repeatable entries

A `validate-later` Text Input question can let the learner add as many entries as they need (for example, one defect report per entry):

```markdown
__Correct Answers__

- [kind: validate-later] [options: multiLine=true,repeatable=true,itemLabel=Defect]
```

- `repeatable=true` shows an **Add** button and a **Remove** button per entry.
- `itemLabel` names the entries ("Defect 1", "Defect 2", ...). It defaults to `Entry` and cannot contain `,` `=` `[` or `]`.
- All entries are saved as one answer, `Defect 1:\n<text>\n\nDefect 2:\n<text>`, so reports and graders see every entry under the question's **Candidate's Answer**. Empty entries are dropped.

See `data/examples/text-input-repeatable.md`.

### Side content & split-screen layout

Any activity can render **side content** in a split layout by adding a `__Content__` section. The activity UI appears on the right and the side content on the left, with a draggable divider between them. `__Content__` accepts three forms:

| Form | First line of `__Content__` | Use case |
|------|------------------------------|----------|
| **External URL** | `https://example.com/docs` | Embed external documentation, datasets, web tools, etc. |
| **Inline markdown or HTML** | Any markdown or HTML block (no URL on the first line) | Reference tables, formulas, hints, glossaries — rendered inline. |
| **Site-relative URL** | `/sim/` (or any path starting with `/`) | Embed a simulation hosted by this server (split-screen mode — see below). |

A block that starts with an HTML tag is passed through as HTML; everything else is rendered as markdown. Existing markdown/HTML side content keeps the legacy iframe document (no design-system fonts or element styles) unless you opt in.

Add `[designSystem]` to wrap that pane in the activity design system (Work Sans, Founders Grotesk, JetBrains Mono, color/spacing tokens, and table styles). Then use typography classes (`heading-small`, `body-medium`, `code-medium`), table classes (`table`, `table-scroll`), or CSS variables (`var(--Colors-Text-Body-Default)`, `var(--body-family)`) instead of loading extra fonts or hard-coding colors.

Optional modifiers on the same line / block:

- `[designSystem]` — apply the design system to markdown or HTML side content (off by default so legacy content is unchanged).
- `[contentWidth: 50%]` or `[contentWidth: 320px]` — initial width of the left pane (defaults to 40%).
- `[openInNewTab]` — adds a toolbar button to open the URL in a new tab (URL forms only).

Examples are in `data/examples/`:

- `mcq-with-url-content.md`, `text-input-with-url-content.md` — external URL
- `text-input-with-markdown-content.md`, `side-content-markdown-table.md` — inline markdown
- `assessment-mcq-agent-harness.md` — markdown side content with `[designSystem]`

#### Split-screen mode with an external simulation

A site-relative URL form (`/sim/...`) lets you embed a simulation-as-content that runs as a **separate process** alongside the activity server. The activity server reverse-proxies the simulation under **`/sim/`** so the iframe can load it with a relative URL

Enable the proxy by setting **`SIM_ORIGIN`** to the simulation's HTTP origin and starting the activity server normally:

```bash
# 1. Start your simulation on a different port (example: 3001)
PORT=3001 ./run-your-sim.sh &

# 2. Start the activity server with the proxy enabled
SIM_ORIGIN=http://127.0.0.1:3001 npm start
```

In your activity's `__Content__` section, reference the simulation with a site-relative path under the mount point:

```markdown
__Type__

Multiple Choice

__Content__

/sim/ [contentWidth: 50%]

__Practice Question__

...
```

The iframe loads from `https://<preview-host>/sim/`, which the activity server forwards to `SIM_ORIGIN`. Static assets and APIs the simulation requests at root paths (`/assets/*`, `/configs/*`, `/api/logs`) are forwarded too — these defaults match common simulation layouts but can be overridden.

##### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SIM_ORIGIN` | _(unset — proxy disabled)_ | HTTP(S) origin of the simulation backend, e.g. `http://127.0.0.1:3001`. When unset, the activity server behaves exactly as before (no proxy). |
| `SIM_ROOT_PROXY_PATHS` | `/assets/,/configs/,/api/logs` | Comma-separated list of root-absolute paths the simulation expects to serve directly. Override when integrating a simulation that uses a different layout. Avoid listing paths that collide with the activity server's own routes (`/api/activity`, `/api/results`, `/design-system/*`, etc.). |

The proxy supports HTTP and HTTPS upstreams (transport is chosen automatically from `SIM_ORIGIN`'s scheme) and forwards query strings, request methods, and bodies.

##### Standalone use is unaffected

`SIM_ORIGIN` is opt-in. If it is not set, the activity server serves only its own routes and no requests are forwarded — the runtime behaves identically to previous versions.

## Project Structure

```
learn_cosmo-activities-web/
├── data/                     # Activity content and results
│   ├── question.md          # Current activity definition
│   ├── answer.md            # Stored activity results
│   └── examples/            # Example activity formats
│       ├── fill-in-the-blanks.md
│       ├── matrix.md
│       ├── sort-into-boxes.md
│       └── swipe-left-right.md
├── public/                  # Frontend assets
│   ├── index.html          # Main HTML file
│   ├── examples-mode.html  # Examples picker shell (served at / when using --examples)
│   ├── editor.html         # Question editor (served at / when using --edit)
│   ├── app.js              # Main application logic
│   ├── styles.css          # Application styles
│   └── modules/            # Activity-specific modules
│       ├── fib.js          # Fill-in-the-blanks functionality
│       ├── sort.js         # Sort-into-boxes functionality
│       └── swipe.js        # Swipe functionality
├── server.js               # Node.js server
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## Creating Activities

Activities are defined using Markdown files with a specific format. Place your activity definition in `data/question.md`.

### Math (LaTeX)

Write math as `$$...$$`. It renders inline with the surrounding text, using [KaTeX](https://katex.org/). To show a literal dollar sign, write `\$`, both inside and outside math:

```markdown
The price is \$12, so the total is $$\$12 \times 0.75$$.
```

Math renders in question text, MCQ options, Fill in the Blanks prompts and content, Matching card text and answer choices, Sort Into Boxes questions, items, and categories, `__Heading__`, and markdown `__Content__`. Fill in the Blanks answer choices, Matrix row and column labels, and question names are plain text.

Older content may use `$...$` or `\(...\)` for inline math, or `\[...\]` for display math. These still render, but new content should use `$$...$$`. See the `*-latex.md` files in `data/examples/`; the `*--legacy.md` files use the older delimiters.

## API Endpoints

- `GET /api/activity` - Retrieves the current activity from `data/question.md`
- `POST /api/results` - Saves activity results to `data/answer.md`

When the server is started with **`--edit`**:

- `GET /api/editor/load` - Returns `{ "markdown": "...", "filePath": "...", "questionType": "Text Input", "copyMarkdownEnabled": false }` for the file passed to `--edit`. If `--answer-key` is set and that file exists, answers are merged into `markdown` so the editor can show them.
- `POST /api/editor/save` - Body: `{ "markdown": "..." }`. Writes the file passed to `--edit`. If `--answer-key` is set, splits the markdown and writes both files.

When the server is started with **`--examples`**:

- `GET /api/examples/list` - Returns `{ "examples": [ "file.md", ... ] }` (sorted basenames of `data/examples/*.md`)
- `POST /api/examples/select` - Body: `{ "filename": "mcq.md" }`. Copies that file from `data/examples/` to `data/question.md` (basename must match a safe pattern). Response: `{ "success": true, "filename": "..." }` or an error object.

When **`SIM_ORIGIN`** is set (split-screen mode):

- `ANY /sim/*` - Reverse-proxied to `SIM_ORIGIN` with the `/sim` prefix stripped (e.g. `/sim/foo?x=1` → `SIM_ORIGIN/foo?x=1`).
- `ANY <path>` where `<path>` matches `SIM_ROOT_PROXY_PATHS` - Reverse-proxied to `SIM_ORIGIN` unchanged. Used for simulation static assets and APIs that live at root paths.

## Development

The application uses vanilla JavaScript with ES6 modules. The server automatically serves files from the `public` directory and provides API endpoints for activity management.

### Release package

`npm run pack` builds a runnable tree into `dist/` and archives it as `dist.tar.gz`: a single-file server bundle (`marked` + `ws` inlined — no `node_modules`), the standalone `generate-score.js` scorer, and the static files the server serves. The release workflow runs the same command and attaches `dist.tar.gz` to the GitHub release. Extract, set `data/question.md`, and run `node server.js`. For assessment scoring, run `node generate-score.js` with the question, answer, and answer-key paths.

### Key Components

- **app.js**: Main application orchestrator
- **modules/swipe.js**: Handles swipe-based interactions
- **modules/fib.js**: Manages fill-in-the-blank activities
- **modules/sort.js**: Implements sorting functionality
- **server.js**: Express-like HTTP server with markdown parsing

## Dependencies

- **marked**: Markdown parsing library for activity content
