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

### Side content & split-screen layout

Any activity can render **side content** in a split layout by adding a `__Content__` section. The activity UI appears on the right and the side content on the left, with a draggable divider between them. `__Content__` accepts three forms:

| Form | First line of `__Content__` | Use case |
|------|------------------------------|----------|
| **External URL** | `https://example.com/docs` | Embed external documentation, datasets, web tools, etc. |
| **Inline markdown** | Any markdown block (no URL on the first line) | Reference tables, formulas, hints, glossaries — rendered inline. |
| **Site-relative URL** | `/sim/` (or any path starting with `/`) | Embed a simulation hosted by this server (split-screen mode — see below). |

Optional modifiers on the same line / block:

- `[contentWidth: 50%]` or `[contentWidth: 320px]` — initial width of the left pane (defaults to 40%).
- `[openInNewTab]` — adds a toolbar button to open the URL in a new tab (URL forms only).

Examples are in `data/examples/`:

- `mcq-with-url-content.md`, `text-input-with-url-content.md` — external URL
- `text-input-with-markdown-content.md`, `side-content-markdown-table.md` — inline markdown

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

## API Endpoints

- `GET /api/activity` - Retrieves the current activity from `data/question.md`
- `POST /api/results` - Saves activity results to `data/answer.md`

When the server is started with **`--examples`**:

- `GET /api/examples/list` - Returns `{ "examples": [ "file.md", ... ] }` (sorted basenames of `data/examples/*.md`)
- `POST /api/examples/select` - Body: `{ "filename": "mcq.md" }`. Copies that file from `data/examples/` to `data/question.md` (basename must match a safe pattern). Response: `{ "success": true, "filename": "..." }` or an error object.

When **`SIM_ORIGIN`** is set (split-screen mode):

- `ANY /sim/*` - Reverse-proxied to `SIM_ORIGIN` with the `/sim` prefix stripped (e.g. `/sim/foo?x=1` → `SIM_ORIGIN/foo?x=1`).
- `ANY <path>` where `<path>` matches `SIM_ROOT_PROXY_PATHS` - Reverse-proxied to `SIM_ORIGIN` unchanged. Used for simulation static assets and APIs that live at root paths.

## Development

The application uses vanilla JavaScript with ES6 modules. The server automatically serves files from the `public` directory and provides API endpoints for activity management.

### Key Components

- **app.js**: Main application orchestrator
- **modules/swipe.js**: Handles swipe-based interactions
- **modules/fib.js**: Manages fill-in-the-blank activities
- **modules/sort.js**: Implements sorting functionality
- **server.js**: Express-like HTTP server with markdown parsing

## Dependencies

- **marked**: Markdown parsing library for activity content
