// Checks, on tablet and short screens, that every tool's option window and every top-bar menu
// stays inside the screen without hiding its button, that every tool stays reachable,
// and that every help text fits in the two lines of the status bar.
// Usage: node scripts/edges.mjs   (needs Edge or Chrome, see browser.mjs; exits 1 on a problem)
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserPath } from './browser.mjs';

const SIZES = [[1280, 800], [1100, 500], [1024, 768], [768, 1024], [812, 375], [375, 812]];
const APP_PORT = 8766;
const DEBUG_PORT = 9333;

/** Runs in the page: returns the problems found at the current size. */
const CHECK = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const inScreen = (r) => r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const problems = [];
  for (const b of document.querySelectorAll('.tool')) {
    b.scrollIntoView({ block: 'nearest' });
    const r = b.getBoundingClientRect(), rail = document.querySelector('.tools').getBoundingClientRect();
    if (!inScreen(r) || r.top < rail.top - 1 || r.bottom > rail.bottom + 1) problems.push('outil ' + b.dataset.tool + ' inaccessible');
    b.click();
    await wait(20);
    const f = document.querySelector('#flyout');
    if (f.hidden) continue;
    const fr = f.getBoundingClientRect();
    if (!inScreen(fr)) problems.push('fenêtre de ' + b.dataset.tool + ' hors écran');
    if (overlaps(fr, b.getBoundingClientRect())) problems.push('fenêtre de ' + b.dataset.tool + ' sur son bouton');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }
  for (const d of document.querySelectorAll('.top details')) {
    d.open = true;
    await wait(20);
    const m = d.querySelector(':scope > div').getBoundingClientRect();
    if (!inScreen(m)) problems.push('menu ' + d.id + ' hors écran');
    if (overlaps(m, d.querySelector('summary').getBoundingClientRect())) problems.push('menu ' + d.id + ' sur son bouton');
    d.open = false;
  }
  // On a wide screen the help line keeps two lines of room: every help text must fit in them.
  if (innerWidth > 760) {
    const { fr } = await import('/src/i18n/fr.js');
    const el = document.querySelector('#status');
    const texts = { ...fr.status, ...fr.status.hover, ...fr.files, opened: fr.files.opened('mecanisme.doublet.json') };
    for (const [key, text] of Object.entries(texts)) {
      if (typeof text !== 'string') continue;
      el.textContent = text;
      if (el.scrollHeight > el.clientHeight + 1) problems.push('aide ' + key + ' sur plus de deux lignes');
    }
  }
  return problems;
})()`;

if (!browserPath) {
  console.log('No browser found: set BROWSER to the path of Edge or Chrome.');
  process.exit(1);
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = spawn(process.execPath, [path.join(root, 'scripts/serve.mjs'), String(APP_PORT)]);
await new Promise((ok) => server.stdout.once('data', ok));
// One reused profile folder: Windows keeps it locked a while after the browser closes.
const profile = path.join(tmpdir(), 'doublet-edges');
// On CI's Linux machines Chrome's sandbox cannot start; it only loads our own local page there.
const sandbox = process.env.CI ? ['--no-sandbox'] : [];
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', ...sandbox, `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let browserLog = '';
browser.stderr.on('data', (d) => { browserLog += d; });

let failed = false;
try {
  const cdp = await connect('page');
  for (const [width, height] of SIZES) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await cdp('Page.navigate', { url: `http://localhost:${APP_PORT}/` });
    await waitFor(cdp, `!!document.querySelector('#flyout')`);
    const { result } = await cdp('Runtime.evaluate', { expression: CHECK, awaitPromise: true, returnByValue: true });
    const problems = /** @type {string[]} */ (result.value);
    failed ||= problems.length > 0;
    console.log(`${width} × ${height} : ${problems.length ? problems.join(' ; ') : 'ok'}`);
  }
} finally {
  server.kill();
  // The launched process may already have handed over to the real browser: close that one,
  // and wait until it is gone so that the next run starts clean.
  const top = await connect('browser').catch(() => null);
  top?.('Browser.close').catch(() => {});
  for (let i = 0; i < 50 && await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then(() => true, () => false); i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
}
process.exit(failed ? 1 : 0);

/**
 * Opens the Chrome DevTools Protocol on the browser's page or on the browser itself;
 * returns a function sending one command.
 * @param {'page' | 'browser'} level
 */
async function connect(level) {
  /** @type {string | undefined} */ let url;
  for (let i = 0; i < 200 && !url; i++) {
    await new Promise((r) => setTimeout(r, 100));
    url = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/${level === 'page' ? 'list' : 'version'}`).then((r) => r.json())
      .then((j) => (level === 'page' ? j.find((/** @type {any} */ t) => t.type === 'page') : j)?.webSocketDebuggerUrl).catch(() => undefined);
  }
  if (!url) throw new Error(`The browser did not start: ${browserPath}\n${browserLog}`);
  const ws = new WebSocket(url);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
  /** @type {Map<number, (msg: any) => void>} */ const pending = new Map();
  ws.onmessage = (e) => { const msg = JSON.parse(String(e.data)); pending.get(msg.id)?.(msg); pending.delete(msg.id); };
  let id = 0;
  /** @param {string} method @param {object} [params] @returns {Promise<any>} */
  return (method, params = {}) => new Promise((ok, ko) => {
    pending.set(++id, (msg) => (msg.error ? ko(new Error(msg.error.message)) : ok(msg.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
}

/** @param {(method: string, params?: object) => Promise<any>} cdp @param {string} expression */
async function waitFor(cdp, expression) {
  for (let i = 0; i < 50; i++) {
    const { result } = await cdp('Runtime.evaluate', { expression, returnByValue: true }).catch(() => ({ result: {} }));
    if (result.value) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('The app did not load.');
}
