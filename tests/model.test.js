import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { sampleSN2 } from '../src/sample.js';
import { ringAt, ringOnBond } from '../src/geometry.js';

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

// IUPAC ST-0.3: the narrow end of a wedge sits on the stereocentre, the bond's first atom.
test('a bond takes the kind chosen in the Bond tool, and the same wedge again turns it round', () => {
  const d = M.emptyDoc();
  const a = M.addAtom(d, { x: 0, y: 0 });
  const b = M.addAtom(d, { x: 40, y: 0 });
  const bond = M.addBond(d, a.id, b.id);
  M.setBondKind(d, bond.id, 'hash');
  assert.deepEqual([bond.order, bond.stereo, bond.a], [1, 'hash', a.id]);
  M.setBondKind(d, bond.id, 'hash');
  assert.deepEqual([bond.stereo, bond.a, bond.b], ['hash', b.id, a.id]);
  M.setBondKind(d, bond.id, 2);
  assert.deepEqual([bond.order, bond.stereo], [2, undefined]);
  M.setBondKind(d, bond.id, 'wedge');
  assert.deepEqual([bond.order, bond.stereo], [1, 'wedge']);
  M.setBondKind(d, bond.id, 1);
  assert.deepEqual([bond.order, bond.stereo], [1, undefined]);
});

/** No atom may carry two double bonds in a Kekulé structure. */
const doublesPerAtom = (d) => d.atoms.map((a) => M.bondsOf(d, a.id).filter((b) => b.order === 2).length);

test('a benzene ring alternates three double bonds', () => {
  const d = M.emptyDoc();
  M.addRing(d, ringAt({ x: 0, y: 0 }, 6, 40), true);
  assert.equal(d.atoms.length, 6);
  assert.equal(d.bonds.length, 6);
  assert.deepEqual(doublesPerAtom(d), [1, 1, 1, 1, 1, 1]);
});

test('a ring drawn on an existing bond reuses its atoms (naphthalene stays Kekulé)', () => {
  const d = M.emptyDoc();
  const first = M.addRing(d, ringAt({ x: 0, y: 0 }, 6, 40), true);
  const a = M.findAtom(d, first[0]);
  const b = M.findAtom(d, first[1]);
  M.addRing(d, ringOnBond(a, b, 6, 1), true);
  assert.equal(d.atoms.length, 10);
  assert.equal(d.bonds.length, 11);
  assert.ok(doublesPerAtom(d).every((n) => n <= 1));
  assert.equal(d.bonds.filter((x) => x.order === 2).length, 5);
});

test('the δ tool cycles δ+ → δ− → nothing on an atom', () => {
  const d = M.emptyDoc();
  const a = M.addAtom(d, { element: 'O', x: 0, y: 0 });
  const values = [];
  for (let i = 0; i < 3; i++) {
    M.cyclePartial(d, a.id);
    values.push(d.marks.find((m) => m.atom === a.id && m.kind === 'partial')?.value ?? null);
  }
  assert.deepEqual(values, ['δ+', 'δ−', null]);
});

test('dropping an arrow between two atoms targets the bond that forms', () => {
  const d = sampleSN2();
  assert.equal(M.formingPartner(d, 'a1', { x: 151, y: 101 }), 'a3', 'midpoint of HO⁻ and the carbon');
  assert.equal(M.formingPartner(d, 'a1', { x: 120, y: 160 }), null, 'nowhere near a midpoint');
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

test('a marquee takes atoms, texts and reaction arrows lying inside it', () => {
  const d = sampleSN2();
  const ids = M.idsInRect(d, { l: 90, t: 80, r: 380, b: 140 });
  assert.deepEqual(ids, ['a1', 'a2', 'a3', 'a4', 't1', 'ra1']);
});

test('moving a selection carries its texts and reaction arrows along', () => {
  const d = sampleSN2();
  M.moveObjects(d, new Set(['a1', 't1', 'ra1']), 10, 5);
  assert.deepEqual([d.atoms[0].x, d.atoms[0].y], [110, 105]);
  assert.deepEqual([d.texts[0].x, d.texts[0].y], [160, 105]);
  assert.deepEqual([d.reactionArrows[0].x1, d.reactionArrows[0].y2], [295, 105]);
  assert.equal(d.atoms[1].x, 180);
});

test('copying a molecule takes its bonds, marks and the curved arrows lying within it', () => {
  const d = sampleSN2();
  const part = M.extract(d, M.component(d, 'a3'));
  assert.deepEqual(part.atoms.map((a) => a.id), ['a2', 'a3', 'a4']);
  assert.deepEqual(part.bonds.map((b) => b.id), ['b1', 'b2']);
  assert.deepEqual(part.marks.map((m) => m.id), ['m4', 'm5', 'm6', 'm7', 'm8']);
  assert.deepEqual(part.curvedArrows.map((c) => c.id), ['ca2']); // ca1 starts on HO⁻, which is not copied
  assert.deepEqual(M.validateDoc(part), []);
});

test('pasting adds a moved copy with fresh ids and links rewired to the copy', () => {
  const d = sampleSN2();
  const part = M.extract(d, new Set(['a2', 'a3', 'a4', 't1', 'ra1']));
  const ids = M.paste(d, part, 10, 20);
  assert.deepEqual(ids, ['a9', 'a10', 'a11', 't3', 'ra2']);
  assert.deepEqual([M.findAtom(d, 'a9')?.x, M.findAtom(d, 'a9')?.y], [190, 154.64]);
  const bond = d.bonds.find((b) => b.id === 'b6');
  assert.deepEqual([bond?.a, bond?.b], ['a10', 'a11']);
  assert.deepEqual(d.curvedArrows.at(-1)?.from, { bond: 'b6' });
  assert.deepEqual(d.curvedArrows.at(-1)?.to, { atom: 'a11' });
  assert.equal(d.reactionArrows.at(-1)?.x1, 295);
  assert.deepEqual(M.validateDoc(d), []);
});

test('a text size is a whole number of points, from 10 to 48', () => {
  const d = M.emptyDoc();
  const t = M.addText(d, { x: 0, y: 0, text: '+' });
  M.setTextSize(d, t.id, 21.5);
  assert.equal(t.size, 22);
  M.setTextSize(d, t.id, 4);
  assert.equal(t.size, 10);
  M.setTextSize(d, t.id, 99);
  assert.equal(t.size, 48);
});

test('a file saved before the lab set-ups opens, with no pieces', () => {
  const old = JSON.parse(M.serialize(sampleSN2()));
  delete old.apparatus;
  assert.deepEqual(M.parseDoc(JSON.stringify(old)).apparatus, []);
});

test('pieces of glassware are selected, moved, copied and pasted like the other objects', () => {
  const d = M.emptyDoc();
  const g = M.addPiece(d, { kind: 'flask', x: 50, y: 50, angle: 0 });
  assert.equal(g.id, 'g1');
  assert.deepEqual(M.idsInRect(d, { l: 0, t: 0, r: 100, b: 100 }), ['g1']);
  M.moveObjects(d, new Set(['g1']), 10, 5);
  assert.deepEqual([g.x, g.y], [60, 55]);
  const ids = M.paste(d, M.extract(d, new Set(['g1'])), 40, 0);
  assert.deepEqual(ids, ['g2']);
  assert.deepEqual([d.apparatus[1].x, d.apparatus[1].kind], [100, 'flask']);
  M.removePiece(d, 'g1');
  assert.deepEqual(d.apparatus.map((x) => x.id), ['g2']);
});
