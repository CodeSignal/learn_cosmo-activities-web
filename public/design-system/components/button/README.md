# Button Component

A versatile button component matching the CodeSignal Design System.

## Usage

Import the CSS file in your HTML or CSS:

```html
<link rel="stylesheet" href="/design-system/components/button/button.css">
```

or

```css
@import url('/design-system/components/button/button.css');
```

## Classes

### Base Class
- `.button`: The base class required for all buttons.

### Variants
- `.button-primary`: Primary action button (Brand Blue).
- `.button-secondary`: Secondary action button (Outlined).
- `.button-tertiary`: Tertiary/Ghost button (Subtle background).
- `.button-danger`: Destructive action button (Red).
- `.button-success`: Positive action button (Green).

### Sizes
- `.button-xsmall`: Extra small size (32px height).
- `.button-small`: Small size (40px height).
- `.button-large`: Large size (60px height).
- Default size is Medium (48px height) if no size class is provided.

### States
The component supports standard pseudo-classes (`:hover`, `:focus`, `:active`, `:disabled`) and utility classes for manual state application:
- `.hover`
- `.focus`
- `.active`
- `.disabled`

## HTML Example

```html
<!-- Primary Button -->
<button class="button button-primary">Click Me</button>

<!-- Secondary Small Button -->
<button class="button button-secondary button-small">Cancel</button>

<!-- Disabled Danger Button -->
<button class="button button-danger" disabled>Delete</button>
```

## Dependencies

This component relies on variables from:
- `design-system/colors/colors.css`
- `design-system/spacing/spacing.css`
- `design-system/typography/typography.css`

