# Accessibility audit harness

Playwright + axe-core runner for Cosmo Activities Web. Kept out of the app build.

```bash
cd a11y-audits/tools
npm install
npm run audit
```

Starts `npm run examples` if port 3000 is free, walks the scan matrix in light and dark, writes:

- `../8-13-26/evidence/*.png`
- `../8-13-26/evidence/report.json`

Axe tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`. Extra scripts cover contrast (computed styles + ancestor opacity), target size, nested interactives, landmarks, live regions, and a few widget keyboard checks.
