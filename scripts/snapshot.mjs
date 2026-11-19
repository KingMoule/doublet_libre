// Picture of a document, drawn by render.js with the app's own styles.
// Usage: node scripts/snapshot.mjs <doc.json> <out.png>
// Needs Edge or Chrome; set BROWSER to its path if it is not found.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { renderDoc, docBounds } from '../src/render.js';

const [docPath, outPath] = process.argv.slice(2);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(docPath, 'utf8'));
const { markup, layout } = renderDoc(doc);
const b = docBounds(doc, layout) ?? { l: 0, r: 100, t: 0, b: 100 };
const pad = 20;
const w = b.r - b.l + 2 * pad;
const height = Math.round(((b.b - b.t + 2 * pad) * 1000) / w);
const style = readFileSync(path.join(root, 'index.html'), 'utf8').match(/<style>[\s\S]*?<\/style>/)?.[0] ?? '';
const html = path.resolve(outPath.replace(/\.png$/i, '') + '.html');
writeFileSync(html, `<!doctype html><meta charset="utf-8">${style}<body style="margin:0;padding:0;background:#fff">`
  + `<svg id="canvas" xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="${b.l - pad} ${b.t - pad} ${w} ${b.b - b.t + 2 * pad}">`
  + `<g id="content">${markup}</g></svg></body>`);

const browser = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));
if (!browser) {
  console.log(`No browser found; open ${html} instead.`);
} else {
  execFileSync(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=1000,${height}`,
    `--screenshot=${path.resolve(outPath)}`, pathToFileURL(html).href], { stdio: 'ignore' });
  console.log(path.resolve(outPath));
}
