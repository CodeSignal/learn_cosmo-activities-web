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
