# Accessibility audit harness

Playwright + axe-core runner for Cosmo Activities Web. Kept out of the app build.

```bash
cd a11y-audits/tools
npm install
npm run audit          # full audit matrix → evidence/report.json
npm run a11y:ci        # Wave 0 floor set vs axe-baseline.json (shrink-only)
WRITE_BASELINE=1 npm run a11y:ci   # rewrite the baseline after a fix
```

Starts `npm run examples` if port 3000 is free, walks the scan matrix in light and dark, writes:

- `../8-13-26/evidence/*.png`
- `../8-13-26/evidence/report.json`

Axe tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`. Extra scripts cover contrast (computed styles + ancestor opacity), target size, nested interactives, landmarks, live regions, and a few widget keyboard checks.

`a11y:ci` walks a floor set (not the full 69-state audit) in light and dark, then compares rule node counts to `axe-baseline.json`. CI fails if a new rule appears or any count grows. After a fix that clears violations, rewrite the baseline in the same PR.

Pages must load with `waitUntil: 'load'`. `networkidle` hangs on the activity WebSocket. From the repo root, `npm run a11y:ci` delegates to this package.
