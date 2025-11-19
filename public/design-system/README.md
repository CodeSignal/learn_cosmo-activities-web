# CodeSignal Design System

This directory contains the core design tokens and reusable components for the application.

## Structure

The design system is organized into **Foundations** and **Components**.

### Foundations

Base definitions that drive the visual style.

- **[Colors](colors/README.md)**: Base scales and semantic color tokens.
- **[Typography](typography/README.md)**: Font families, sizes, and utility classes.
- **[Spacing](spacing/README.md)**: Spacing, sizing, and radius tokens.

### Components

Reusable UI elements built using the foundations.

- **[Button](components/button/README.md)**: Primary, secondary, and utility buttons.
- **[Dropdown](components/dropdown/README.md)**: Customizable dropdown menus.

## Usage

### Styles
Include the relevant CSS files in your HTML. For a full integration, you typically include:

```html
<!-- Fonts (Work Sans) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- Design System Styles -->
<link rel="stylesheet" href="/design-system/colors/colors.css">
<link rel="stylesheet" href="/design-system/spacing/spacing.css">
<link rel="stylesheet" href="/design-system/typography/typography.css">
```

**Note on Fonts:**
- **Work Sans**: Must be imported via Google Fonts (as shown above).
- **Founders Grotesk**: Included via `@font-face` in `typography.css`.
- **JetBrains Mono**: Included via `@font-face` in `typography.css`.

### Components
Components have their own CSS and JS files located within their respective directories. See individual component READMEs for implementation details.

## Test Bed

You can view and test the design system elements by opening the test harness:

`http://[your-server]/design-system/test.html`

This provides a sidebar navigation to explore colors, typography, and interactive component demos.

