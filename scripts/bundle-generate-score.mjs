#!/usr/bin/env node
/**
 * Bundles lib/generate-score.js into a standalone, zero-dependency script
 * at the project root. The output is checked in and can be copied anywhere.
 *
 * Usage:
 *   node scripts/bundle-generate-score.mjs
 *   # or: npm run build:scorer
 */

import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

await esbuild.build({
  absWorkingDir: ROOT,
  entryPoints: ['lib/generate-score.js'],
  bundle: true,
  outfile: 'generate-score.js',
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  banner: {
    js: [
      '#!/usr/bin/env node',
      '// AUTO-GENERATED — do not edit directly.',
      '// Source: lib/generate-score.js',
      '// Rebuild: npm run build:scorer',
      ''
    ].join('\n')
  },
  logLevel: 'info',
});

console.log('✓ generate-score.js bundled (standalone, no dependencies)');
