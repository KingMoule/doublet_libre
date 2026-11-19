import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { checkDoc } from '../src/checks.js';
import { sampleSN2 } from '../src/sample.js';

const codes = (d) => checkDoc(d).map((w) => w.code);

test('the correct SN2 raises no warning', () => {
  assert.deepEqual(checkDoc(sampleSN2()), []);
});

test('a carbon with five bonds exceeds the octet', () => {
  const d = M.emptyDoc();
  const c = M.addAtom(d, { x: 0, y: 0 });
  for (let i = 0; i < 5; i++) M.addBond(d, c.id, M.addAtom(d, { x: 40 * Math.cos(i), y: 40 * Math.sin(i) }).id);
  const w = checkDoc(d);
  assert.deepEqual(w.map((x) => x.code), ['octet']);
  assert.deepEqual(w[0].ids, [c.id]);
  assert.equal(w[0].params.electrons, 10);
});

test('drawn lone pairs count too: O with two bonds and three pairs has 10 electrons', () => {
  const d = M.emptyDoc();
  const o = M.addAtom(d, { element: 'O', x: 0, y: 0 });
  M.addBond(d, o.id, M.addAtom(d, { x: -40, y: 0 }).id);
  M.addBond(d, o.id, M.addAtom(d, { x: 40, y: 0 }).id);
  for (let i = 0; i < 3; i++) M.addMark(d, o.id, 'lonePair');
  assert.deepEqual(codes(d), ['octet']);
});

test('halogens keep the octet too: HBr with four lone pairs is wrong', () => {
  const d = M.emptyDoc();
  const br = M.addAtom(d, { element: 'Br', x: 0, y: 0 });
  for (let i = 0; i < 4; i++) M.addMark(d, br.id, 'lonePair');
  assert.deepEqual(checkDoc(d).map((w) => [w.code, w.params.electrons]), [['octet', 10]]);
});

test('S and P may exceed the octet (GR-8.2)', () => {
  const d = M.emptyDoc();
  const s = M.addAtom(d, { element: 'S', x: 0, y: 0 });
  M.addBond(d, s.id, M.addAtom(d, { element: 'O', x: 0, y: -40 }).id, 2);
  M.addBond(d, s.id, M.addAtom(d, { element: 'O', x: 0, y: 40 }).id, 2);
  M.addBond(d, s.id, M.addAtom(d, { x: -40, y: 0 }).id);
  M.addBond(d, s.id, M.addAtom(d, { x: 40, y: 0 }).id);
  assert.deepEqual(codes(d), []);
});

test('an arrow leaving a positive atom or landing on a negative one is probably reversed', () => {
  const d = sampleSN2();
  d.curvedArrows = [{ id: 'ca1', from: { bond: 'b2' }, to: { atom: 'a1' }, electrons: 2, bend: M.DEFAULT_BEND }];
  assert.deepEqual(checkDoc(d).map((w) => [w.code, w.ids]), [['arrowDirection', ['ca1']]]);
});

test('formal and partial charges on the same molecule (GR-5.6)', () => {
  const d = sampleSN2();
  M.findAtom(d, 'a3').charge = 1;
  assert.ok(codes(d).includes('mixedCharges'));
});

test('the total charge must be the same on both sides of a reaction arrow', () => {
  const d = sampleSN2();
  M.findAtom(d, 'a8').charge = 0;
  const w = checkDoc(d).find((x) => x.code === 'charge');
  assert.deepEqual(w.ids, ['ra1']);
  assert.deepEqual(w.params, { left: -1, right: 0 });
});

test('↔ links only resonance forms: same atoms, same σ bonds', () => {
  const d = sampleSN2();
  d.reactionArrows[0].kind = 'resonance';
  assert.ok(codes(d).includes('resonance'), 'SN2 is a reaction, not resonance');

  const r = M.emptyDoc();
  for (const x0 of [0, 200]) {
    const o1 = M.addAtom(r, { element: 'O', x: x0, y: -30, charge: x0 ? -1 : 0 });
    const c = M.addAtom(r, { x: x0 + 20, y: 0 });
    const o2 = M.addAtom(r, { element: 'O', x: x0 + 40, y: -30, charge: x0 ? 0 : -1 });
    M.addBond(r, o1.id, c.id, x0 ? 1 : 2);
    M.addBond(r, c.id, o2.id, x0 ? 2 : 1);
    M.addBond(r, c.id, M.addAtom(r, { x: x0 + 20, y: 40 }).id);
  }
  M.addReactionArrow(r, { x1: 80, y1: 0, x2: 160, y2: 0, kind: 'resonance', above: '', below: '' });
  assert.deepEqual(codes(r), [], 'the two forms of acetate');
});
