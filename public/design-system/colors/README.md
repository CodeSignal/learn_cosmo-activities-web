# Colors Design System

This directory contains the color system definitions for the application.

## Usage

Import the CSS file in your HTML or CSS:

```html
<link rel="stylesheet" href="/design-system/colors/colors.css">
```

or

```css
@import url('/design-system/colors/colors.css');
```

## Variable Structure

The color system is divided into two layers:

### 1. Base Scales (Primitive Tokens)

These are the raw color values defined on numbered scales. **Avoid using these directly** in your components if a semantic alternative exists.

Pattern: `--Colors-Base-[Family]-[Scale]-[Step]`

Examples:
- `--Colors-Base-Primary-700`
- `--Colors-Base-Neutral-00`
- `--Colors-Base-Accent-Green-500`
- `--Colors-Base-Neutral-Alphas-1000-25` (Alpha variants)

Families:
- `Primary`: Main brand colors (Blue)
- `Neutral`: Grays, White, Black
- `Accent-Green`: Success states
- `Accent-Sky-Blue`: Info states
- `Accent-Yellow`: Warning states
- `Accent-Orange`: Warning states
- `Accent-Red`: Error/Danger states

### 2. Semantic Names (Contextual Tokens)

These variables map the base colors to specific usage contexts. **Prefer using these variables** to ensure consistency and support for theming (e.g., Dark Mode).

Categories:

- **Primary**: Brand colors
  - e.g., `--Colors-Primary-Default`, `--Colors-Primary-Medium`
- **Backgrounds**: Surface colors
  - e.g., `--Colors-Backgrounds-Main-Default`, `--Colors-Backgrounds-Main-Top`
- **Text**: Typography colors
  - e.g., `--Colors-Text-Body-Default`, `--Colors-Text-Body-Strong`
- **Icon**: Iconography colors
  - e.g., `--Colors-Icon-Default`, `--Colors-Icon-Primary`
- **Stroke**: Border and divider colors
  - e.g., `--Colors-Stroke-Default`, `--Colors-Stroke-Strong`
- **Alert**: Feedback colors (Success, Error, Warning, Info)
  - e.g., `--Colors-Alert-Success-Default`, `--Colors-Alert-Error-Medium`

## Dark Mode

The system automatically handles Dark Mode via the `@media (prefers-color-scheme: dark)` query. By using the **Semantic Names**, your components will automatically adapt to the user's system preference.

