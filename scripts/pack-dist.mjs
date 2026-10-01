#!/usr/bin/env node
/**
 * Builds a runnable release tree into dist/ and archives it as dist.tar.gz.
 *
 * The tarball is a single-file server bundle (marked + ws inlined) plus the
 * static files the server serves. No node_modules. Extract and `node server.js`.
 *
 * Usage:
 *   node scripts/pack-dist.mjs
 */

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const TAR = path.join(ROOT, 'dist.tar.gz');

function copy(src, dest, filter) {
  fs.cpSync(src, dest, { recursive: true, filter });
}

function bytes(file) {
  return fs.statSync(file).size;
}

function formatSize(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function distSize(rel) {
  const full = path.join(DIST, rel);
  if (!fs.existsSync(full)) return 0;
  const st = fs.statSync(full);
  if (!st.isDirectory()) return st.size;
  let total = 0;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    total += distSize(child);
  }
  return total;
}

function shouldCopyDesignSystem(src) {
  const rel = path.relative(path.join(ROOT, 'public/design-system'), src);
  if (!rel || rel.startsWith('..')) return true;
  const parts = rel.split(path.sep);
  if (parts.includes('.git')) return false;
  if (parts.includes('tests')) return false;
  if (parts.includes('.github')) return false;
  const base = parts[parts.length - 1];
  if (
    base === 'test.html' ||
    base === 'test-server.js' ||
    base === 'playwright.config.mjs' ||
    base === 'agents.md' ||
    base === 'llms.txt' ||
    base === 'package-lock.json'
  ) {
    return false;
  }
  return true;
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

await esbuild.build({
  absWorkingDir: ROOT,
  entryPoints: ['server.js'],
  bundle: true,
  outfile: 'dist/server.js',
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  minify: true,
  logLevel: 'warning',
});

copy(path.join(ROOT, 'public'), path.join(DIST, 'public'), (src) => {
  const rel = path.relative(path.join(ROOT, 'public'), src);
  if (rel === 'design-system' || rel.startsWith(`design-system${path.sep}`)) {
    return shouldCopyDesignSystem(src);
  }
  return true;
});

copy(path.join(ROOT, 'data'), path.join(DIST, 'data'), (src) => {
  const base = path.basename(src);
  // Runtime answer/report/score are produced by the app; don't ship local leftovers.
  if (base === 'answer.md' || base === 'report.md' || base === 'score.json') {
    return false;
  }
  return true;
});

copy(path.join(ROOT, 'LICENSE'), path.join(DIST, 'LICENSE'));

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
fs.writeFileSync(
  path.join(DIST, 'package.json'),
  `${JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      private: true,
      main: 'server.js',
      scripts: {
        start: 'node server.js',
      },
    },
    null,
    2,
  )}\n`,
);

for (const rel of ['server.js', 'public/index.html', 'public/app.js', 'data/question.md']) {
  if (!fs.existsSync(path.join(DIST, rel))) throw new Error(`missing ${rel} in dist/`);
}

const smokePort = 34567;
const child = spawn(process.execPath, [path.join(DIST, 'server.js')], {
  cwd: DIST,
  env: { ...process.env, PORT: String(smokePort) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
child.stderr.on('data', (chunk) => {
  stderr += chunk;
});

try {
  const deadline = Date.now() + 10000;
  let healthy = false;
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(`server exited early (${child.exitCode}): ${stderr || 'no stderr'}`);
    }
    try {
      const res = await fetch(`http://127.0.0.1:${smokePort}/api/activity`);
      if (res.ok) {
        healthy = true;
        break;
      }
    } catch {
      // still starting
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!healthy) throw new Error(`smoke check failed: ${stderr || 'server did not become ready'}`);
} finally {
  child.kill('SIGTERM');
  await new Promise((resolve) => {
    child.once('exit', resolve);
    setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 2000);
  });
}

if (fs.existsSync(TAR)) fs.unlinkSync(TAR);
execFileSync('tar', ['-czf', TAR, '-C', DIST, '.'], { cwd: ROOT });

const entries = ['server.js', 'public', 'data'];
console.log('Packed dist/ (no node_modules):');
for (const rel of entries) {
  console.log(`  ${rel.padEnd(24)} ${formatSize(distSize(rel))}`);
}
console.log(`  ${'dist.tar.gz'.padEnd(24)} ${formatSize(bytes(TAR))}`);
