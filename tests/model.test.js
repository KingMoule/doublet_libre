import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { sampleSN2 } from '../src/sample.js';

test('the example document is valid', () => {
  assert.deepEqual(M.validateDoc(sampleSN2()), []);
});

test('ids are unique within each list and keep growing', () => {
  const d = M.emptyDoc();
  const a = M.addAtom(d, { x: 0, y: 0 });
  const b = M.addAtom(d, { x: 40, y: 0 });
  assert.deepEqual([a.id, b.id], ['a1', 'a2']);
  assert.equal(M.addBond(d, a.id, b.id).id, 'b1');
  assert.equal(M.addBond(d, b.id, a.id).id, 'b1', 'no duplicate bond');
  assert.throws(() => M.addBond(d, a.id, a.id));
});

test('a molecule is the set of connected atoms', () => {
  const d = sampleSN2();
  assert.deepEqual([...M.component(d, 'a2')].sort(), ['a2', 'a3', 'a4']);
  assert.deepEqual([...M.component(d, 'a1')], ['a1']);
});

test('implicit H come from the bonds: ethanol O has one, bromide none', () => {
  const d = sampleSN2();
  assert.equal(M.hydrogenCount(d, M.findAtom(d, 'a5')), 1);
  assert.equal(M.hydrogenCount(d, M.findAtom(d, 'a1')), 1);
  assert.equal(M.hydrogenCount(d, M.findAtom(d, 'a8')), 0);
});

test('removing an atom removes its bonds, marks and the arrows anchored to them', () => {
  const d = sampleSN2();
  M.removeAtom(d, 'a4');
  assert.ok(!d.bonds.some((b) => b.id === 'b2'));
  assert.ok(!d.marks.some((m) => m.atom === 'a4'));
  assert.deepEqual(d.curvedArrows.map((c) => c.id), ['ca1']);
  assert.deepEqual(M.validateDoc(d), []);
});

test('removing a lone pair removes the arrow that starts from it', () => {
  const d = sampleSN2();
  M.removeMark(d, 'm1');
  assert.deepEqual(d.curvedArrows.map((c) => c.id), ['ca2']);
});

test('removing a bond takes lone carbons with it, as in ChemDraw', () => {
  const d = M.emptyDoc();
  const a = M.addAtom(d, { x: 0, y: 0 });
  const o = M.addAtom(d, { element: 'O', x: 40, y: 0 });
  const bond = M.addBond(d, a.id, o.id);
  M.removeBond(d, bond.id);
  assert.deepEqual(d.atoms.map((x) => x.element), ['O']);
});

test('bond order cycles 1 → 2 → 3 → 1 and a multiple bond loses its wedge', () => {
  const d = M.emptyDoc();
  const a = M.addAtom(d, { x: 0, y: 0 });
  const b = M.addAtom(d, { x: 40, y: 0 });
  const bond = M.addBond(d, a.id, b.id);
  M.setStereo(d, bond.id, 'wedge');
  M.cycleBondOrder(d, bond.id);
  assert.equal(bond.order, 2);
  assert.equal(bond.stereo, undefined);
  M.cycleBondOrder(d, bond.id);
  M.cycleBondOrder(d, bond.id);
  assert.equal(bond.order, 1);
});

test('undo and redo restore the saved states', () => {
  const h = M.createHistory();
  const d = M.emptyDoc();
  M.record(h, d);
  M.addAtom(d, { x: 0, y: 0 });
  const before = M.undo(h, d);
  assert.equal(before.atoms.length, 0);
  const after = M.redo(h, before);
  assert.equal(after.atoms.length, 1);
  assert.equal(M.undo(M.createHistory(), d), null, 'nothing to undo');
});

test('a saved document reads back identical', () => {
  const d = sampleSN2();
  assert.deepEqual(M.parseDoc(M.serialize(d)), d);
});

test('validation catches dangling references', () => {
  const d = sampleSN2();
  d.bonds.push({ id: 'b99', a: 'a1', b: 'zz', order: 1 });
  d.curvedArrows.push({ id: 'ca9', from: { mark: 'nope' }, to: { atom: 'a1' }, electrons: 2, bend: M.DEFAULT_BEND });
  const errors = M.validateDoc(d).join(' | ');
  assert.match(errors, /b99 points to a missing atom/);
  assert.match(errors, /ca9 has a dangling anchor/);
  assert.throws(() => M.parseDoc(JSON.stringify(d)));
});
