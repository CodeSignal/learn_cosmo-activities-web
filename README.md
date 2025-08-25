# Cosmo Activities Web

An interactive web-based learning platform that supports multiple types of educational activities. Intended to bring mobile activities to the web experience. Built with vanilla JavaScript and Node.js, this platform provides engaging ways to practice and assess knowledge through different interactive formats.

## Features

### Activity Types

- **🎯 Swipe Left or Right**: Tinder-style interface for categorizing statements or concepts
- **📝 Fill in the Blanks**: Interactive forms for completing educational content
- **📦 Sort into Boxes**: Drag-and-drop interface for organizing items into categories

### Theme System

- **🌞 Light/Dark Mode**: Automatic system preference detection with server-side override capability
- **⚡ Real-time Updates**: WebSocket-powered instant theme switching across all connected clients
- **🎛️ Server Control**: Simple file-based theme configuration

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
├── theme                   # Theme configuration file
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## Creating Activities

Activities are defined using Markdown files with a specific format. Place your activity definition in `data/question.md`.

## Theme Configuration

The application supports real-time theme switching through a simple file-based configuration system.

### Theme Control

Create or edit the `theme` file in the project root to control the appearance:

```bash
# Force light mode
echo "light" > theme

# Force dark mode  
echo "dark" > theme

# Use system preference (default)
echo "system" > theme
```

### Supported Values

- **`system`** (default): Automatically respects the user's OS dark/light mode preference
- **`light`**: Forces light mode regardless of system settings
- **`dark`**: Forces dark mode regardless of system settings
- **Invalid/missing file**: Falls back to `system` mode

### Real-time Updates

Changes to the `theme` file are applied **instantly** to all connected browsers via WebSocket. No page refresh or server restart required!

### How It Works

1. **File Watching**: Server monitors the `theme` file for changes using `fs.watch()`
2. **WebSocket Broadcasting**: Theme updates are immediately sent to all connected clients
3. **CSS Application**: Frontend applies the new theme using CSS custom properties
4. **Fallback Handling**: Graceful degradation when file is missing or contains invalid values

## API Endpoints

- `GET /api/activity` - Retrieves the current activity from `data/question.md`
- `POST /api/results` - Saves activity results to `data/answer.md`
- `GET /theme` - Returns the current theme setting from the `theme` file
- `WebSocket /` - Real-time theme updates and other live features

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
- **ws**: WebSocket library for real-time communication

## Examples

### Testing Real-time Theme Changes

1. Start the server and open http://localhost:3000 in multiple browser tabs
2. In a terminal, try these commands to see instant theme changes:

```bash
# Switch to dark mode - all tabs update instantly!
echo "dark" > theme

# Switch to light mode
echo "light" > theme  

# Back to system preference
echo "system" > theme

# Test fallback behavior
rm theme  # Falls back to system mode
```

3. Watch the browser developer console to see WebSocket connection logs and theme update messages
