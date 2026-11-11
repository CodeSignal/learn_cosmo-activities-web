const { renderMarkdown } = require('./render-markdown');

function looksLikeHtml(source) {
  return /^\s*(?:<\/?[a-zA-Z][\w-]*(?:[\s>/]|$)|<!--|<!DOCTYPE)/i.test(source);
}

function renderContentBody(source) {
  if (!source || typeof source !== 'string') return '';
  const trimmed = source.trim();
  return looksLikeHtml(trimmed) ? trimmed : renderMarkdown(trimmed);
}

const KATEX_HEAD = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">`;

const KATEX_SCRIPTS = `  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      if (window.renderMathInElement) {
        renderMathInElement(document.body, {
          delimiters: [
            {left: '$$', right: '$$', display: false},
            {left: '\\\\[', right: '\\\\]', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\\\(', right: '\\\\)', display: false}
          ],
          ignoredClasses: ['no-math'],
          throwOnError: false
        });
      }
    });
  </script>`;

const LEGACY_HEAD = `  ${KATEX_HEAD}
  <style>
    body {
      margin: 0;
      padding: 1.5rem;
    }
    .markdown-content {
      max-width: 100%;
    }
  </style>`;

const DESIGN_SYSTEM_HEAD = `  <meta name="color-scheme" content="light dark" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/design-system/colors/colors.css" />
  <link rel="stylesheet" href="/design-system/typography/typography.css" />
  <link rel="stylesheet" href="/design-system/spacing/spacing.css" />
  <link rel="stylesheet" href="/design-system/components/table/table.css" />
  ${KATEX_HEAD}
  <style>
    /* typography.css declares JetBrains Mono without font-display, so code
       text is invisible until the font arrives. Load the same file under its
       own name with font-display: swap, so a fallback shows meanwhile. The
       code-* classes use var(--code-family) alone, so it names the fallback. */
    @font-face {
      font-family: 'JetBrains Mono Swap';
      src: url('/design-system/fonts/JetBrainsMono-Medium-Italic.woff2') format('woff2');
      font-weight: 500;
      font-style: italic;
      font-display: swap;
    }
    :root {
      --code-family: "JetBrains Mono Swap", monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 1.5rem;
      background-color: var(--Colors-Backgrounds-Main-Default);
      color: var(--Colors-Text-Body-Default);
      font-family: var(--body-family), sans-serif;
    }
    .markdown-content {
      max-width: 100%;
    }
    .markdown-content h1,
    .markdown-content h2,
    .markdown-content h3,
    .markdown-content h4,
    .markdown-content h5,
    .markdown-content h6 {
      font-family: var(--heading-family);
      font-style: normal;
      font-weight: 500;
      color: var(--Colors-Text-Body-Strong);
      -webkit-font-smoothing: antialiased;
      margin: 0 0 var(--UI-Spacing-spacing-ms);
    }
    .markdown-content h1 {
      font-size: var(--Fonts-Headlines-sm);
      line-height: 120%;
      letter-spacing: -0.24px;
    }
    .markdown-content h2 {
      font-size: var(--Fonts-Headlines-xsm);
      line-height: 120%;
      letter-spacing: -0.22px;
    }
    .markdown-content h3 {
      font-size: var(--Fonts-Headlines-xxsm);
      line-height: 120%;
      letter-spacing: -0.22px;
    }
    .markdown-content h4,
    .markdown-content h5,
    .markdown-content h6 {
      font-size: var(--Fonts-Headlines-xxxsm);
      line-height: 120%;
      letter-spacing: -0.16px;
    }
    .markdown-content p,
    .markdown-content ul,
    .markdown-content ol {
      margin: 0 0 var(--UI-Spacing-spacing-ms);
    }
    .markdown-content ul,
    .markdown-content ol {
      margin-left: 1.25em;
    }
    .markdown-content li {
      margin-top: 0.5em;
    }
    .markdown-content strong {
      font-weight: 500;
      color: var(--Colors-Text-Body-Strong);
    }
    .markdown-content pre {
      margin: 0 0 var(--UI-Spacing-spacing-ml);
      padding: var(--UI-Spacing-spacing-mxs) var(--UI-Spacing-spacing-ms);
      background: var(--Colors-Backgrounds-Main-Light);
      color: var(--Colors-Text-Body-Default);
      font-family: var(--code-family), monospace;
      font-size: var(--Fonts-Body-Default-xs);
      font-weight: 500;
      line-height: 140%;
      white-space: pre-wrap;
      border-radius: var(--UI-Radius-radius-s);
    }
    .markdown-content code {
      font-family: var(--code-family), monospace;
    }
    .markdown-content .table-scroll {
      width: 100%;
      max-width: 100%;
    }
    .markdown-content .table {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      table-layout: fixed;
    }
    .markdown-content .table th,
    .markdown-content .table td {
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
      vertical-align: top;
    }
    .markdown-content .table code {
      white-space: pre-wrap;
    }
    .markdown-content table:not(.table) {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 var(--UI-Spacing-spacing-ml);
      font-family: var(--body-family), sans-serif;
    }
    .markdown-content table:not(.table) th,
    .markdown-content table:not(.table) td {
      border: 1.5px solid var(--Colors-Stroke-Default);
      padding: var(--UI-Spacing-spacing-xs) var(--UI-Spacing-spacing-mxs);
      text-align: left;
      vertical-align: top;
      white-space: normal;
    }
    .markdown-content table:not(.table) th {
      background: var(--Colors-Backgrounds-Main-Light);
      font-size: var(--Fonts-Body-Default-xs);
      font-weight: 600;
      line-height: 140%;
      color: var(--Colors-Text-Body-Strong);
    }
    .markdown-content table:not(.table) td {
      font-size: var(--Fonts-Body-Default-sm);
      font-weight: 400;
      line-height: 135%;
      letter-spacing: -0.15px;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: var(--Colors-Backgrounds-Main-Default);
        color: var(--Colors-Text-Body-Default);
      }
    }
  </style>`;

function renderContentDocument(source, options = {}) {
  const html = renderContentBody(source);
  const designSystem = options.designSystem === true;
  const extraHead = designSystem ? DESIGN_SYSTEM_HEAD : LEGACY_HEAD;
  const bodyClass = designSystem ? 'body-medium markdown-content' : 'markdown-content';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Content</title>
${extraHead}
</head>
<body>
  <div class="${bodyClass}">${html}</div>
${KATEX_SCRIPTS}
</body>
</html>`;
}

module.exports = { looksLikeHtml, renderContentBody, renderContentDocument };
