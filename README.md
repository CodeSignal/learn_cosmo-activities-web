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
