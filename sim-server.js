/**
 * Minimal "Hello World" simulation server used as a test harness for split-screen mode.
 * Started automatically by server.js when --examples flag is used.
 * Can also be run standalone: node sim-server.js [port]
 */

const http = require('http');

const PORT = parseInt(process.env.SIM_PORT || process.argv[2] || '8080', 10);

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hello World Simulation</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      gap: 2rem;
    }

    .badge {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      background: #1e3a5f;
      color: #60a5fa;
      border: 1px solid #2563eb44;
    }

    h1 {
      font-size: clamp(1.8rem, 5vw, 3rem);
      font-weight: 800;
      background: linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-align: center;
      line-height: 1.1;
    }

    p {
      color: #94a3b8;
      font-size: 1rem;
      text-align: center;
      max-width: 360px;
      line-height: 1.6;
    }

    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.5rem;
      width: 100%;
      max-width: 360px;
    }

    .card-title {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 1rem;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #1e293b;
      font-size: 0.875rem;
    }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { color: #94a3b8; }
    .stat-value { font-weight: 600; color: #e2e8f0; font-family: monospace; }
    .stat-value.ok { color: #4ade80; }

    .pulse {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 0 0 #4ade8080;
      animation: pulse 2s infinite;
      margin-right: 6px;
      vertical-align: middle;
    }
    @keyframes pulse {
      0%   { box-shadow: 0 0 0 0 #4ade8080; }
      70%  { box-shadow: 0 0 0 8px #4ade8000; }
      100% { box-shadow: 0 0 0 0 #4ade8000; }
    }

    #clock { font-family: monospace; color: #60a5fa; }
  </style>
</head>
<body>
  <span class="badge">&#9679; Simulation Running</span>

  <h1>Hello World<br/>Simulation</h1>

  <p>
    This is a dummy simulation served by <code>sim-server.js</code>.
    It proves split-screen reverse-proxy is working end-to-end.
  </p>

  <div class="card">
    <div class="card-title">Runtime info</div>
    <div class="stat-row">
      <span class="stat-label">Status</span>
      <span class="stat-value ok"><span class="pulse"></span>Online</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Port</span>
      <span class="stat-value">${PORT}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Proxied under</span>
      <span class="stat-value">/sim/</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Local time</span>
      <span class="stat-value" id="clock">—</span>
    </div>
  </div>

  <script>
    const clock = document.getElementById('clock');
    function tick() {
      clock.textContent = new Date().toLocaleTimeString();
    }
    tick();
    setInterval(tick, 1000);
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(HTML);
});

server.listen(PORT, '127.0.0.1', () => {
  // Signal to parent that we're ready (used by server.js spawn logic)
  process.stdout.write(`sim-server listening on http://127.0.0.1:${PORT}\n`);
});
