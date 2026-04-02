#!/usr/bin/env node

const fs = require('fs');

const USAGE = `
Usage:
  node content-url.js <file> get
  node content-url.js <file> set <new-url>

get prints the bare URL (without [openInNewTab] or [contentWidth: ...]).

set replaces only the URL and keeps existing [openInNewTab] and [contentWidth: ...] on the line.

Examples:
  node content-url.js data/question.md get
  node content-url.js data/question.md set https://docs.google.com/spreadsheets/d/NEW_ID/
`;

/**
 * @param {string} line
 * @returns {{ url: string, openInNewTab: boolean, contentWidth: string | null }}
 */
function parseContentUrlLine(line) {
  const trimmed = line.trim();
  const openInNewTab = /\[openInNewTab\]/i.test(trimmed);
  let contentWidth = null;
  const cwMatch = trimmed.match(/\[contentWidth:\s*([^\]]+)\]/i);
  if (cwMatch) {
    contentWidth = cwMatch[1].trim();
  }
  const url = trimmed
    .replace(/\s*\[openInNewTab\]\s*/gi, ' ')
    .replace(/\s*\[contentWidth:\s*[^\]]+\]\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { url, openInNewTab, contentWidth };
}

/**
 * @param {string} newUrl
 * @param {{ openInNewTab: boolean, contentWidth: string | null }} options
 */
function formatContentUrlLine(newUrl, options) {
  let line = String(newUrl).trim();
  if (options.openInNewTab) {
    line += ' [openInNewTab]';
  }
  if (options.contentWidth != null && options.contentWidth !== '') {
    line += ` [contentWidth: ${options.contentWidth}]`;
  }
  return line;
}

/**
 * Index of the first non-empty line after __Content__, or -1.
 * @param {string[]} lines
 */
function findContentValueLineIndex(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (!/^__Content__\s*$/.test(lines[i])) continue;
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (line.trim() === '') continue;
      if (/^__[^_]+__\s*$/.test(line)) return -1;
      return j;
    }
    return -1;
  }
  return -1;
}

function extractContentUrl(markdown) {
  const lines = markdown.split('\n');
  const idx = findContentValueLineIndex(lines);
  if (idx < 0) return null;
  const { url } = parseContentUrlLine(lines[idx]);
  return url || null;
}

function updateContentUrl(markdown, newUrl) {
  const lines = markdown.split('\n');
  const idx = findContentValueLineIndex(lines);
  if (idx < 0) {
    throw new Error('Could not find Content section or URL line in the markdown');
  }
  const parsed = parseContentUrlLine(lines[idx]);
  lines[idx] = formatContentUrlLine(newUrl, {
    openInNewTab: parsed.openInNewTab,
    contentWidth: parsed.contentWidth
  });
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(USAGE);
    process.exit(1);
  }

  const [filePath, command, newUrl] = args;

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const markdown = fs.readFileSync(filePath, 'utf-8');

  switch (command) {
    case 'get': {
      const url = extractContentUrl(markdown);
      if (url) {
        console.log(url);
      } else {
        console.error('Error: Could not find Content URL');
        process.exit(1);
      }
      break;
    }

    case 'set':
      if (!newUrl) {
        console.error('Error: New URL is required for set command');
        console.log(USAGE);
        process.exit(1);
      }
      try {
        const updatedMarkdown = updateContentUrl(markdown, newUrl);
        fs.writeFileSync(filePath, updatedMarkdown, 'utf-8');
        console.log(`Content URL updated to: ${newUrl}`);
      } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
      break;

    default:
      console.error(`Error: Unknown command '${command}'`);
      console.log(USAGE);
      process.exit(1);
  }
}

main();
