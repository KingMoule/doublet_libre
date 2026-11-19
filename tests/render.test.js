import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { layout, renderDoc, doubleBondSide, controlPoints, bendFromControl } from '../src/render.js';
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

test('a charge goes top right of the label (GR-5.1)', () => {
  const L = layout(sampleSN2());
  const label = L.atoms.get('a8').label;
  const c = L.charges.get('a8').center;
  assert.ok(c.x > label.box.r && c.y < label.box.t);
});

test('curved arrows follow when a molecule moves', () => {
  const d = sampleSN2();
  const before = layout(d).curved;
  M.moveAtoms(d, M.component(d, 'a3'), 30, -20);
  const after = layout(d).curved;
  close(after.get('ca2').p3.x - before.get('ca2').p3.x, 30);
  close(after.get('ca2').p3.y - before.get('ca2').p3.y, -20);
  close(after.get('ca2').p0.x - before.get('ca2').p0.x, 30);
  close(after.get('ca1').raw0.x, before.get('ca1').raw0.x, 1e-9);
  close(after.get('ca1').raw3.x - before.get('ca1').raw3.x, 30);
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

test('selecting a curved arrow shows its two handles', () => {
  const { markup } = renderDoc(sampleSN2(), { selection: { kind: 'curved', id: 'ca1' } });
  assert.equal(count(markup, /data-kind="handle"/g), 2);
});
