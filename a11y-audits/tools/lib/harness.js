import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(__dirname, '../../..');
export const BASE = process.env.A11Y_BASE_URL || 'http://127.0.0.1:3000';
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/examples/list`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(400);
  }
  throw new Error(`Examples server did not respond at ${BASE}`);
}

function killProcessTree(child) {
  if (!child.pid) return;
  try {
    // SIGTERM on the npm pid does not always reach concurrently's grandchildren
    // (Linux CI). Kill the process group we created with detached: true.
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
}

async function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(timeoutMs)
  ]);
}

async function stopChild(child) {
  killProcessTree(child);
  await waitForExit(child, 4000);
  if (child.exitCode === null && child.signalCode === null) {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      try {
        child.kill('SIGKILL');
      } catch {
        /* already gone */
      }
    }
    await waitForExit(child, 2000);
  }
  child.stdout?.destroy();
  child.stderr?.destroy();
}

export async function ensureServer() {
  try {
    const res = await fetch(`${BASE}/api/examples/list`);
    if (res.ok) {
      console.log('Reusing existing examples server at', BASE);
      return async () => {};
    }
  } catch {
    /* start our own */
  }
  console.log('Starting npm run examples…');
  const child = spawn('npm', ['run', 'examples'], {
    cwd: REPO_ROOT,
    env: { ...process.env, SIM_ORIGIN: process.env.SIM_ORIGIN || 'http://127.0.0.1:8080' },
    stdio: 'pipe',
    detached: true
  });
  child.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  await waitForServer();
  return () => stopChild(child);
}

export async function selectExample(filename) {
  const res = await fetch(`${BASE}/api/examples/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  });
  if (!res.ok) {
    throw new Error(`Failed to select ${filename}: ${res.status} ${await res.text()}`);
  }
}

export async function openPlay(page) {
  await page.goto(`${BASE}/play`, { waitUntil: 'load' });
  await page.waitForSelector('#activity-container > *', { timeout: 15000 });
  await sleep(400);
}

export async function runAxe(page) {
  const builder = new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .exclude('.activity-content-iframe')
    .exclude('iframe');
  const results = await builder.analyze();
  const slim = (nodes) =>
    nodes.slice(0, 8).map((n) => ({
      html: n.html?.slice(0, 180),
      target: n.target
    }));
  return {
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      tags: v.tags,
      help: v.help,
      helpUrl: v.helpUrl,
      nodeCount: v.nodes.length,
      nodes: slim(v.nodes)
    })),
    incomplete: results.incomplete.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodeCount: v.nodes.length,
      nodes: slim(v.nodes)
    })),
    passes: results.passes.length
  };
}
