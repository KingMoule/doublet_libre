import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { attachGroup } from '../src/groups.js';
import { fromSmiles, toGraph, sameMolecule } from '../src/naming/graph.js';

const H = 40 * Math.cos(Math.PI / 6);
// 3-methylhexane on the paper: a zigzag of six carbons, a methyl up from the third.
const CHAIN = [[0, 0], [H, 20], [2 * H, 0], [3 * H, 20], [4 * H, 0], [5 * H, 20]];
const METHYL_HEXANE = { points: [...CHAIN, [2 * H, -40]], bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6]] };

/**
 * Draws a skeleton in a document, moved, turned and maybe mirrored.
 * @param {{points: number[][], bonds: number[][], elements?: Record<number, string>}} s
 */
function draw({ points, bonds, elements = {} }, { dx = 0, dy = 0, deg = 0, mirror = false } = {}) {
  const d = M.emptyDoc();
  const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
  const ids = points.map(([x, y], i) => {
    if (mirror) x = -x;
    return M.addAtom(d, { element: elements[i] ?? 'C', x: x * c - y * s + dx, y: x * s + y * c + dy }).id;
  });
  for (const [i, j, order = 1] of bonds) M.addBond(d, ids[i], ids[j], /** @type {1|2|3} */ (order));
  return { d, ids };
}

test('a molecule is the same graph however it is drawn: turned, mirrored, moved, or written another way', () => {
  const plain = toGraph(draw(METHYL_HEXANE).d);
  assert.ok(sameMolecule(plain, toGraph(draw(METHYL_HEXANE, { deg: 73, mirror: true, dx: 300, dy: -120 }).d)));
  assert.ok(sameMolecule(plain, fromSmiles('CCC(C)CCC')));
  assert.ok(sameMolecule(plain, fromSmiles('CCCC(C)CC')));
});

test('isomers are different molecules', () => {
  const methyl2 = { points: [...CHAIN, [H, 60]], bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 6]] };
  assert.ok(!sameMolecule(toGraph(draw(methyl2).d), fromSmiles('CCC(C)CCC')));
  assert.ok(!sameMolecule(fromSmiles('CCCC'), fromSmiles('CC(C)C')));
  assert.ok(!sameMolecule(fromSmiles('C=CCCC'), fromSmiles('CC=CCC')));
  assert.ok(!sameMolecule(fromSmiles('CC(O)CC'), fromSmiles('CCCCO')));
});

test('explicit hydrogens, lone pairs and wedges do not count', () => {
  // Butan-2-ol, its OH drawn with an explicit H, two lone pairs and a wedge.
  const { d, ids } = draw({ points: [...CHAIN.slice(0, 4), [H, 60], [H, 100]], bonds: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5]], elements: { 4: 'O', 5: 'H' } });
  M.addMark(d, ids[4], 'lonePair');
  M.addMark(d, ids[4], 'lonePair');
  M.setStereo(d, d.bonds[3].id, 'wedge');
  assert.ok(sameMolecule(toGraph(d), fromSmiles('CC(O)CC')));
});

test('a stray atom makes another molecule', () => {
  const { d } = draw(METHYL_HEXANE);
  M.addAtom(d, { x: 400, y: 0 });
  assert.ok(!sameMolecule(toGraph(d), fromSmiles('CCC(C)CCC')));
});

test('both Kekulé forms of a benzene ring are the same molecule, drawn or written', () => {
  // o-Xylene: double bond between the two substituted carbons, or single.
  assert.ok(sameMolecule(fromSmiles('CC1=C(C)C=CC=C1'), fromSmiles('CC1=CC=CC=C1C')));
  assert.ok(sameMolecule(fromSmiles('CC1=C(C)C=CC=C1'), fromSmiles('Cc1ccccc1C')));
  assert.ok(!sameMolecule(fromSmiles('Cc1ccccc1C'), fromSmiles('Cc1cccc(C)c1')));
  const d = M.emptyDoc();
  M.addRing(d, [30, 90, 150, 210, 270, 330].map((a) => ({ x: 40 * Math.cos((a * Math.PI) / 180), y: 40 * Math.sin((a * Math.PI) / 180) })), true);
  assert.ok(sameMolecule(toGraph(d), fromSmiles('c1ccccc1')));
});

test('a nitro group drawn with its charges (Groupe tool) is the same as written without', () => {
  const d = M.emptyDoc();
  const ring = M.addRing(d, [30, 90, 150, 210, 270, 330].map((a) => ({ x: 40 * Math.cos((a * Math.PI) / 180), y: 40 * Math.sin((a * Math.PI) / 180) })), true);
  attachGroup(d, ring[0], 'NO2', 30);
  assert.ok(sameMolecule(toGraph(d), fromSmiles('c1ccccc1N(=O)=O')));
});

test('SMILES subset: branches, multiple bonds, halogens, ring closures', () => {
  const g = fromSmiles('BrCC(=O)C#N');
  assert.deepEqual(g.atoms.map((a) => a.el), ['Br', 'C', 'C', 'O', 'C', 'N']);
  assert.deepEqual(g.bonds.map((b) => b.order), [1, 1, 2, 1, 3]);
  const ring = fromSmiles('ClC1CCCCC1');
  assert.equal(ring.bonds.length, 7);
  assert.throws(() => fromSmiles('C[N+]'), /\[/);
});

test('the graph keeps the document atom of each of its atoms', () => {
  const { d, ids } = draw(METHYL_HEXANE);
  assert.deepEqual(toGraph(d).ids, ids);
});
