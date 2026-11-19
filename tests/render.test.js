import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { layout, renderDoc, docBounds, doubleBondSide, controlPoints, bendFromControl, defaultBend } from '../src/render.js';
import { sampleSN2 } from '../src/sample.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} should be close to ${b}`);
const count = (s, re) => (s.match(re) ?? []).length;

test('labels: carbons hidden, HO flipped when the bond leaves to the right (GR-2.1.6)', () => {
  const L = layout(sampleSN2());
  assert.equal(L.atoms.get('a3').label, null);
  assert.equal(L.atoms.get('a5').label.side, 'left', 'ethanol written HO–');
  assert.equal(L.atoms.get('a1').label.side, 'left', 'hydroxide written HO−');

  const d = M.emptyDoc();
  const o = M.addAtom(d, { element: 'O', x: 0, y: 0 });
  const c = M.addAtom(d, { x: 0, y: -40 });
  M.addBond(d, o.id, c.id);
  assert.equal(layout(d).atoms.get(o.id).label.side, 'right', 'bond going up: OH');

  const w = M.emptyDoc();
  M.addAtom(w, { element: 'O', x: 0, y: 0 });
  assert.equal(layout(w).atoms.get('a1').label.side, 'left', 'water written H2O');
});

test('lone pairs sit above, below, left or right of the symbol, away from bonds (GR-5.2)', () => {
  const L = layout(sampleSN2());
  const side = (c) => (Math.abs(c.x - 240) < 1 ? (c.y < 100 ? 'top' : 'bottom') : c.x > 240 ? 'right' : 'left');
  const br = ['m4', 'm5', 'm6'].map((id) => side(L.marks.get(id).center));
  assert.deepEqual(br.sort(), ['bottom', 'right', 'top'], 'bromine bonded on its left');
  const bromide = ['m11', 'm12', 'm13', 'm14'].map((id) => L.marks.get(id).center);
  assert.equal(new Set(bromide.map((c) => `${Math.round(c.x)},${Math.round(c.y)}`)).size, 4, 'four distinct spots');
});

test('a single electron is one dot on a free side of the symbol (GR-5.3)', () => {
  const d = M.emptyDoc();
  const o = M.addAtom(d, { element: 'O', x: 0, y: 0 });
  M.addBond(d, o.id, M.addAtom(d, { x: 34.64, y: 20 }).id);
  const r = M.addMark(d, o.id, 'radical');
  const L = layout(d);
  assert.equal(L.marks.get(r.id).dots.length, 1);
  assert.equal(L.atoms.get(o.id).label.h, 0, 'the radical uses the valence: no H on O•');
  const c = L.marks.get(r.id).center;
  assert.ok(Math.abs(c.x) < 1e-9 || Math.abs(c.y) < 1e-9, 'on an axis');
});

test('on a carbocation vertex the charge takes the largest free sector', () => {
  const d = M.emptyDoc();
  const c = M.addAtom(d, { x: 0, y: 0, charge: 1 });
  M.addBond(d, c.id, M.addAtom(d, { x: -40, y: 0 }).id);
  M.addBond(d, c.id, M.addAtom(d, { x: 20, y: 34.64 }).id);
  const p = layout(d).charges.get(c.id).center;
  assert.ok(p.y < 0 && p.x > 0, 'up and to the right, away from both bonds');
});

test('charges are written + and −, never circled', () => {
  const { markup } = renderDoc(sampleSN2());
  const charges = [...markup.matchAll(/<text class="chgt"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
  assert.deepEqual(charges, ['−', '−']);
  assert.doesNotMatch(markup, /class="chg"/);
});

test('a charge goes top right of the label (GR-5.1)', () => {
  const L = layout(sampleSN2());
  const label = L.atoms.get('a8').label;
  const c = L.charges.get('a8').center;
  assert.ok(c.x > label.box.r && c.y < label.box.t);
});

test('curved arrows follow when a molecule moves', () => {
  const d = sampleSN2();
  const before = layout(d).curved;
  M.moveObjects(d, M.component(d, 'a3'), 30, -20);
  const after = layout(d).curved;
  close(after.get('ca2').p3.x - before.get('ca2').p3.x, 30);
  close(after.get('ca2').p3.y - before.get('ca2').p3.y, -20);
  close(after.get('ca2').p0.x - before.get('ca2').p0.x, 30);
  close(after.get('ca1').raw0.x, before.get('ca1').raw0.x, 1e-9);
  close(after.get('ca1').raw3.x - before.get('ca1').raw3.x, 30);
});

test('an arrow to a forming bond ends exactly between the two atoms', () => {
  const d = sampleSN2();
  const ca = M.addCurvedArrow(d, { mark: 'm1' }, { between: ['a1', 'a3'] }, 2, defaultBend(d, { mark: 'm1' }, { between: ['a1', 'a3'] }));
  const g = layout(d).curved.get(ca.id);
  close(g.p3.x, 150);
  close(g.p3.y, 100);
});

test('a new arrow bulges away from its molecule', () => {
  const d = sampleSN2();
  const bend = defaultBend(d, { bond: 'b2' }, { atom: 'a4' });
  const [c1] = controlPoints({ x: 220, y: 100 }, { x: 240, y: 100 }, bend);
  assert.ok(c1.y < 100, 'C1 sits below the C–Br bond, so the arrow curves above it');
});

test('a short arrow, from a bond to one of its atoms, gets a tall arc instead of a flat one', () => {
  const d = sampleSN2();
  const [[t1, n1]] = defaultBend(d, { bond: 'b2' }, { atom: 'a4' });
  const [[, nLong]] = defaultBend(d, { mark: 'm1' }, { atom: 'a3' });
  assert.ok(Math.abs(n1) >= 1 && Math.abs(nLong) < 1, `short ${n1}, long ${nLong}`);
  assert.equal(t1, 0);
});

test('a control point dragged by hand survives the round trip through the arrow frame', () => {
  const raw0 = { x: 0, y: 0 };
  const raw3 = { x: 100, y: 20 };
  const [c1] = controlPoints(raw0, raw3, [[0.1, 0.3], [0.8, 0.5]]);
  const [t, n] = bendFromControl(raw0, raw3, c1);
  close(t, 0.1);
  close(n, 0.3);
});

test('double bonds: centred for a ketone C=O, offset toward the chain for propene (GR-1.10)', () => {
  const k = M.emptyDoc();
  const c = M.addAtom(k, { x: 0, y: 0 });
  const o = M.addAtom(k, { element: 'O', x: 0, y: -40 });
  M.addBond(k, c.id, M.addAtom(k, { x: -34.64, y: 20 }).id);
  M.addBond(k, c.id, M.addAtom(k, { x: 34.64, y: 20 }).id);
  assert.equal(doubleBondSide(k, M.addBond(k, c.id, o.id, 2)), 0);

  const p = M.emptyDoc();
  const c1 = M.addAtom(p, { x: 0, y: 0 });
  const c2 = M.addAtom(p, { x: 34.64, y: -20 });
  const c3 = M.addAtom(p, { x: 69.28, y: 0 });
  const dbl = M.addBond(p, c1.id, c2.id, 2);
  M.addBond(p, c2.id, c3.id);
  assert.equal(doubleBondSide(p, dbl), 1, 'second line on the side of the CH3');

  const t = M.emptyDoc();
  const t1 = M.addAtom(t, { x: 0, y: 0 });
  const t2 = M.addAtom(t, { x: 34.64, y: -20 });
  const t3 = M.addAtom(t, { x: 69.28, y: 0 });
  const t4 = M.addAtom(t, { x: 103.92, y: -20 });
  M.addBond(t, t1.id, t2.id);
  const trans = M.addBond(t, t2.id, t3.id, 2);
  M.addBond(t, t3.id, t4.id);
  assert.notEqual(doubleBondSide(t, trans), 0, 'trans-but-2-ene: offset, not centred');

  const e = M.emptyDoc();
  const e1 = M.addAtom(e, { x: 0, y: 0 });
  const e2 = M.addAtom(e, { x: 40, y: 0 });
  assert.equal(doubleBondSide(e, M.addBond(e, e1.id, e2.id, 2)), 0, 'ethene: centred');
});

test('the example renders every object, with H2O subscripted', () => {
  const { markup } = renderDoc(sampleSN2());
  assert.equal(count(markup, /data-kind="atom"/g), 8);
  assert.equal(count(markup, /data-kind="bond"/g), 4);
  assert.equal(count(markup, /<g class="lp">/g), 12);
  assert.equal(count(markup, /class="ea"/g), 2);
  assert.equal(count(markup, /data-kind="charge"/g), 2);
  assert.match(markup, /<tspan dy="3.6" font-size="8.4">2<\/tspan>/);
  assert.match(markup, />δ−</);
  assert.match(markup, />δ\+</);
});

test('a group selection highlights its atoms and the bonds between them', () => {
  const { markup } = renderDoc(sampleSN2(), { selection: { kind: 'group', id: 'group', ids: ['a2', 'a3'] } });
  assert.equal(count(markup, /class="obj is-sel" data-kind="atom"/g), 2);
  assert.equal(count(markup, /class="obj is-sel" data-kind="bond"/g), 1);
});

test('the marquee is drawn while selecting', () => {
  const { markup } = renderDoc(sampleSN2(), { marquee: { l: 0, t: 0, r: 10, b: 10 } });
  assert.match(markup, /class="marquee"/);
});

test('numbered steps stack: last line nearest the arrow above, first line nearest below', () => {
  const d = M.emptyDoc();
  M.addReactionArrow(d, { x1: 0, y1: 0, x2: 100, y2: 0, kind: 'forward', above: '1. NaOH\n2. H3O^+', below: 'THF\n0 °C' });
  const ys = [...renderDoc(d).markup.matchAll(/<text class="cond" x="[^"]+" y="([^"]+)">(.*?)<\/text>/g)]
    .map((m) => ({ y: Number(m[1]), text: m[2].replace(/<[^>]+>/g, '') }));
  const y = (t) => ys.find((l) => l.text.startsWith(t)).y;
  assert.equal(ys.length, 4);
  assert.ok(y('1.') < y('2.') && y('2.') < 0, 'steps read top to bottom above the arrow');
  assert.ok(0 < y('THF') && y('THF') < y('0 °C'), 'below the arrow, first line first');
});

test('each reaction arrow kind has its own shape', () => {
  const shape = (kind) => {
    const d = M.emptyDoc();
    M.addReactionArrow(d, { x1: 0, y1: 0, x2: 100, y2: 0, kind, above: '', below: '' });
    const m = renderDoc(d).markup;
    return { heads: count(m, /class="rxh"/g), lines: count(m, /<line x1/g), polyline: count(m, /<polyline/g) };
  };
  assert.deepEqual(shape('forward'), { heads: 1, lines: 1, polyline: 0 });
  assert.deepEqual(shape('equilibrium'), { heads: 2, lines: 2, polyline: 0 });
  assert.deepEqual(shape('resonance'), { heads: 2, lines: 1, polyline: 0 });
  assert.deepEqual(shape('retro'), { heads: 0, lines: 2, polyline: 1 });
  assert.deepEqual(shape('noReaction'), { heads: 1, lines: 3, polyline: 0 });
});

test('warned objects get an outline, never in an export', () => {
  const d = sampleSN2();
  assert.equal(count(renderDoc(d, { warnings: ['a3', 'a4', 'ca1', 'ra1'] }).markup, /class="warn"/g), 4);
  assert.equal(count(renderDoc(d, { plain: true }).markup, /class="warn"/g), 0);
});

test('selecting a curved arrow shows its two handles', () => {
  const { markup } = renderDoc(sampleSN2(), { selection: { kind: 'curved', id: 'ca1' } });
  assert.equal(count(markup, /data-kind="handle"/g), 2);
});

test('the bounds of a drawing take in the whole width of its texts, so an export does not cut them', () => {
  const d = M.emptyDoc();
  M.addText(d, { x: 0, y: 0, text: 'sortie d’eau', size: 12 });
  const b = /** @type {{l: number, r: number}} */ (docBounds(d, layout(d)));
  assert.ok(b.l < -25 && b.r > 25, `${b.l} … ${b.r}`);
});
