// @ts-check
import { renderDoc, docBounds } from './render.js';
import { parseDoc, serialize } from './model.js';

/**
 * Files: the native JSON document, a standalone SVG that carries that document (so a figure
 * pasted elsewhere can be reopened), and the 300 dpi mark of an exported PNG.
 * @typedef {import('./model.js').Doc} Doc
 */

/** Physical size of one drawing unit: labels come out at 9 pt, bonds at 24 pt. */
export const POINTS_PER_UNIT = 0.6;

/** Light-theme colours and fonts, without CSS variables, so the SVG needs nothing else. */
const EXPORT_CSS = [
  '.bd line{stroke:#17212B;stroke-width:1.6;stroke-linecap:round}',
  '.hash line{stroke:#17212B;stroke-width:1.2}.wedge{fill:#17212B}',
  '.lbl{font-family:Arial,Helvetica,sans-serif;font-size:15px;fill:#17212B}',
  '.pc,.chgt,.cond{font-family:Arial,Helvetica,sans-serif;font-size:12px;fill:#17212B;text-anchor:middle}',
  '.txt{font-family:Arial,Helvetica,sans-serif;fill:#17212B;text-anchor:middle}',
  '.lp circle{fill:#17212B}',
  '.rx line,.rx polyline{stroke:#17212B;stroke-width:1.4;fill:none}.rxh{fill:#17212B}',
  '.ea{fill:none;stroke:#C2304A;stroke-width:1.5;stroke-linecap:round}.eh{fill:#C2304A}',
  '.gw{fill:none;stroke:#17212B;stroke-width:1.3;stroke-linejoin:round;stroke-linecap:round}',
].join('');

/** @param {string} s */
const escXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** @param {string} s */
const unescXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
/** @param {number} v */
const r2 = (v) => String(Math.round(v * 100) / 100);

/** @param {Doc} doc @param {number} [pad] */
export function exportSVG(doc, pad = 12) {
  const { markup, layout } = renderDoc(doc, { plain: true });
  const b = docBounds(doc, layout) ?? { l: 0, r: 0, t: 0, b: 0 };
  const w = b.r - b.l + 2 * pad;
  const h = b.b - b.t + 2 * pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(w * POINTS_PER_UNIT)}pt" height="${r2(h * POINTS_PER_UNIT)}pt" `
    + `viewBox="${r2(b.l - pad)} ${r2(b.t - pad)} ${r2(w)} ${r2(h)}">`
    + `<metadata id="doublet">${escXml(serialize(doc))}</metadata><style>${EXPORT_CSS}</style>${markup}</svg>`;
}

/** A document from a saved .doublet.json or from an SVG exported by the app. @param {string} text @returns {Doc} */
export function docFromText(text) {
  const t = text.trim();
  if (!t.startsWith('<')) return parseDoc(t);
  const m = t.match(/<metadata id="doublet">([\s\S]*?)<\/metadata>/);
  if (!m) throw new Error('not an SVG exported by Doublet libre');
  return parseDoc(unescXml(m[1]));
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** @param {Uint8Array} bytes */
export function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Adds a pHYs chunk after IHDR so office software knows the resolution and sizes the image right.
 * @param {Uint8Array} png @param {number} dpi
 */
export function setPngDpi(png, dpi) {
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const v = new DataView(chunk.buffer);
  v.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  v.setUint32(8, ppm);
  v.setUint32(12, ppm);
  chunk[16] = 1; // unit: metre
  v.setUint32(17, crc32(chunk.subarray(4, 17)));
  const out = new Uint8Array(png.length + 21);
  out.set(png.subarray(0, 33));
  out.set(chunk, 33);
  out.set(png.subarray(33), 54);
  return out;
}
