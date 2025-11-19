# Typography Design System

This directory contains the typography system definitions for the application.

## Usage

Import the CSS file in your HTML or CSS:

```html
<link rel="stylesheet" href="/design-system/typography/typography.css">
```

or

```css
@import url('/design-system/typography/typography.css');
```

## Font Families

The system uses two main font families:

- **Body & Labels**: `Work Sans` (Variable, sans-serif)
- **Headings & Elegant**: `Founders Grotesk` (sans-serif)
- **Code**: `JetBrains Mono` (monospace)

## CSS Classes

Use these utility classes to apply typography styles to your elements.

### Body Text
Standard body text styles using `Work Sans`.

- `.body-xxsmall` (13px)
- `.body-xsmall` (14px)
- `.body-small` (15px)
- `.body-medium` (16px)
- `.body-large` (17px)
- `.body-xlarge` (19px)
- `.body-xxlarge` (21px)
- `.body-xxxlarge` (24px)

### Body Elegant
Elegant body styles using `Founders Grotesk`.

- `.body-elegant-xxsmall` (22px)
- `.body-elegant-xsmall` (26px)
- `.body-elegant-small` (32px)
- `.body-elegant-medium` (38px)

### Headings
Heading styles using `Founders Grotesk` with medium weight (500).

- `.heading-xxxsmall` (16px)
- `.heading-xxsmall` (22px)
- `.heading-xsmall` (22px)
- `.heading-small` (24px)
- `.heading-medium` (32px)
- `.heading-large` (38px)
- `.heading-xlarge` (48px)
- `.heading-xxlarge` (64px)

### Labels
Uppercase labels using `Work Sans` with semi-bold weight (600).

- `.label-small` (10px)
- `.label-medium` (11px)
- `.label-large` (14px)

### Label Numbers
Numeric labels using `Work Sans` with medium weight (500).

- `.label-number-xsmall` (11px)
- `.label-number-small` (12px)
- `.label-number-medium` (14px)
- `.label-number-large` (15px)

## CSS Variables

While classes are preferred for consistency, you can access the raw values via CSS variables if needed for custom components.

Pattern: `--Fonts-[Category]-[Size]`

Examples:
- `--Fonts-Body-Default-md`
- `--Fonts-Headlines-xl`
- `--Fonts-Special-sm`

