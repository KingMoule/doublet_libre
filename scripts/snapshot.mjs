// Picture of a document (.doublet.json, or an SVG exported by the app), as the app exports it.
// Usage: node scripts/snapshot.mjs <doc> <out.png>
// Needs Edge or Chrome; set BROWSER to its path if it is not found.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { exportSVG, docFromText } from '../src/io.js';
import { browserPath } from './browser.mjs';

const [docPath, outPath] = process.argv.slice(2);
const svg = exportSVG(docFromText(readFileSync(docPath, 'utf8')));
const [, , w, h] = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 1 1').split(' ').map(Number);
const height = Math.round((h * 1000) / w);
const html = path.resolve(outPath.replace(/\.png$/i, '') + '.html');
writeFileSync(html, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff">`
  + `${svg.replace(/width="[^"]+" height="[^"]+"/, `width="1000" height="${height}"`)}</body>`);

const browser = browserPath;
if (!browser) {
  console.log(`No browser found; open ${html} instead.`);
} else {
  execFileSync(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=1000,${height}`,
    `--screenshot=${path.resolve(outPath)}`, pathToFileURL(html).href], { stdio: 'ignore' });
  console.log(path.resolve(outPath));
}
