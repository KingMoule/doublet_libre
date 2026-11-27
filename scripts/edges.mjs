// Checks, on tablet and short screens and in each mode, that every tool's option window and every top-bar menu
// stays inside the screen without hiding its button, that every tool and the zoom buttons stay reachable,
// that every help text fits in the one line of the status bar, that no selection's panel squashes a field,
// that the nomenclature exercise's answer field has room for a name, and that a mechanism exercise has its
// curved arrow and its Recommencer button.
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
  // Each mode: drawing a mechanism, a lab set-up, then the two exercises of the Exercice menu, each with its own tools.
  for (const mode of ['mécanisme', 'montage', 'mécanismes', 'nomenclature']) {
    if (mode === 'montage') document.querySelector('[data-mode="setup"]').click();
    if (mode === 'mécanismes') document.querySelector('[data-exercise="mechanism"]').click();
    if (mode === 'nomenclature') document.querySelector('[data-exercise="naming"]').click();
    // A mechanism to complete needs the curved arrow, and a way back to what was given.
    if (mode === 'mécanismes') {
      if (!document.querySelector('.tool[data-tool="curved"]:not([hidden])')) problems.push('flèche courbe absente des exercices de mécanisme');
      const again = document.querySelector('[data-ex="clear"]');
      again?.scrollIntoView({ block: 'nearest' });
      if (!again || !inScreen(again.getBoundingClientRect())) problems.push('bouton Recommencer inaccessible');
      // The product to draw: the canvas leaves room after the reaction arrow, not only what is given.
      const level = document.querySelector('#ex-level');
      level.value = 'hx-product';
      level.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(50);
      const canvas = document.querySelector('#canvas').getBoundingClientRect();
      const arrow = [...document.querySelectorAll('#canvas [data-kind="rxn"]')].at(-1).getBoundingClientRect();
      if (canvas.right - arrow.right < 80) problems.push('pas de place pour dessiner le produit');
    }
    for (const b of document.querySelectorAll('.tool:not([hidden])')) {
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
  }
  // The exercise opens on a molecule to name: its answer field has room for a whole name.
  const answer = document.querySelector('#ex-answer');
  if (!answer || answer.getBoundingClientRect().width < 140) problems.push('champ de réponse trop étroit');
  const zoom = document.querySelector('.zoom-bar');
  zoom.scrollIntoView({ block: 'nearest' });
  if (!inScreen(zoom.getBoundingClientRect())) problems.push('boutons de zoom hors écran');
  for (const d of document.querySelectorAll('.top details')) {
    // As a student would: its button in view first (on a phone the page scrolls), then open.
    d.querySelector('summary').scrollIntoView({ block: 'nearest' });
    d.open = true;
    await wait(20);
    const m = d.querySelector(':scope > div').getBoundingClientRect();
    if (!inScreen(m)) problems.push('menu ' + d.id + ' hors écran');
    if (overlaps(m, d.querySelector('summary').getBoundingClientRect())) problems.push('menu ' + d.id + ' sur son bouton');
    d.open = false;
  }
  // On a wide screen the help line is a single line: every help text must fit in it, the green dot included.
  if (innerWidth > 760) {
    const { fr } = await import('/src/i18n/fr.js');
    const el = document.querySelector('#status');
    const texts = { ...fr.status.hover, ...fr.files, opened: fr.files.opened('mecanisme.doublet.json') };
    el.classList.add('kept');
    for (const [key, text] of Object.entries(texts)) {
      if (typeof text !== 'string') continue;
      el.textContent = text;
      if (el.scrollWidth > el.clientWidth + 1) problems.push('aide ' + key + ' plus longue que sa ligne');
    }
  }
  // Select one object of each kind, in a mechanism and in a set-up: a long panel scrolls, it never squashes a field.
  for (const template of ['[data-template]', '[data-setup]']) {
    document.querySelector(template).click();
    document.querySelector('.tool[data-tool="select"]').click();
    await wait(20);
    // Every click redraws the canvas: find the object again each time.
    for (const kind of new Set([...document.querySelectorAll('#canvas .obj')].map((o) => o.dataset.kind))) {
      const o = document.querySelector('#canvas .obj[data-kind="' + kind + '"]');
      const r = o.getBoundingClientRect();
      const at = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, isPrimary: true };
      o.dispatchEvent(new PointerEvent('pointerdown', at));
      o.dispatchEvent(new PointerEvent('pointerup', at));
      await wait(20);
      for (const f of document.querySelectorAll('.panel :is(input, textarea)')) {
        if (f.clientHeight < f.scrollHeight - 1) problems.push('champ ' + f.id + ' écrasé (' + kind + ')');
      }
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
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
    const { result, exceptionDetails } = await cdp('Runtime.evaluate', { expression: CHECK, awaitPromise: true, returnByValue: true });
    // A check that throws in the page found nothing: that is a problem too, never an « ok ».
    const problems = /** @type {string[]} */ (exceptionDetails ? [`erreur dans la page : ${exceptionDetails.exception?.description?.split('\n')[0] ?? exceptionDetails.text}`] : result.value);
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
  // Up to a minute: on a busy CI machine Chrome has taken more than 20 s to start.
  for (let i = 0; i < 600 && !url; i++) {
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
