import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportSVG, docFromText, setPngDpi, crc32 } from '../src/io.js';
import { serialize } from '../src/model.js';
import { sampleSN2 } from '../src/sample.js';

test('a saved file and an exported SVG both reopen without loss', () => {
  const doc = sampleSN2();
  assert.deepEqual(docFromText(serialize(doc)), doc);
  assert.deepEqual(docFromText(exportSVG(doc)), doc);
});

test('the exported SVG stands alone: own styles, no click areas, sized in points', () => {
  const svg = exportSVG(sampleSN2());
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="[\d.]+pt" height="[\d.]+pt" viewBox="/);
  assert.match(svg, /<style>[^<]*\.ea\{/);
  assert.doesNotMatch(svg, /class="hit"/);
  assert.doesNotMatch(svg, /var\(--/);
});

test('a file that is not a Doublet document is refused', () => {
  assert.throws(() => docFromText('<svg xmlns="http://www.w3.org/2000/svg"></svg>'));
  assert.throws(() => docFromText('{"hello": 1}'));
});

test('CRC-32 matches the PNG specification', () => {
  assert.equal(crc32(new TextEncoder().encode('IEND')), 0xae426082);
});

test('a PNG gets a pHYs chunk right after IHDR, so Word sizes it at 300 dpi', () => {
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // signature
    0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0x1f, 0x15, 0xc4, 0x89, // IHDR
    0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82, // IEND
  ]);
  const out = setPngDpi(png, 300);
  const v = new DataView(out.buffer);
  assert.equal(out.length, png.length + 21);
  assert.equal(new TextDecoder().decode(out.subarray(37, 41)), 'pHYs');
  assert.equal(v.getUint32(41), 11811, '300 dpi in pixels per metre');
  assert.equal(v.getUint32(45), 11811);
  assert.equal(out[49], 1, 'unit: metre');
  assert.equal(v.getUint32(50), crc32(out.subarray(37, 50)));
  assert.deepEqual(out.subarray(54), png.subarray(33), 'the rest is unchanged');
});
