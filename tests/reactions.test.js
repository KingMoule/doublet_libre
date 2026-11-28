import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { fromSmiles, sameMolecule, toGraph } from '../src/naming/graph.js';
import { NamingError, nameOf } from '../src/naming/namer.js';
import { NET, addition, outcome } from '../src/mechanism/reactions.js';

/** A molecule written in SMILES as a drawing, its atoms one bond apart (where they are does not matter here). @param {string} smiles */
function alkene(smiles) {
  const g = fromSmiles(smiles);
  const d = M.emptyDoc();
  const ids = g.atoms.map((a, i) => M.addAtom(d, { element: a.el, x: 40 * i, y: 40 * (i % 2) }).id);
  for (const b of g.bonds) M.addBond(d, ids[b.a], ids[b.b], /** @type {1 | 2 | 3} */ (b.order));
  return d;
}
/** The molecules of a drawing, each as a graph. @param {M.Doc} d */
function molecules(d) {
  const seen = new Set(), out = [];
  for (const a of d.atoms) {
    if (seen.has(a.id)) continue;
    const ids = [...M.component(d, a.id)];
    ids.forEach((id) => seen.add(id));
    out.push(toGraph(d, ids));
  }
  return out;
}
/** What a reaction gives, the molecules by name ('' for one the namer leaves out: an acid, an oxirane, CO₂, H₂O). @param {string} smiles @param {string} reaction */
function names(smiles, reaction) {
  const d = outcome(alkene(smiles), reaction);
  if (!d) return null;
  return molecules(d).map((g) => { try { return nameOf(g).name; } catch (e) { if (e instanceof NamingError) return ''; throw e; } }).sort();
}
/** Whether a reaction gives exactly these molecules. @param {string} smiles @param {string} reaction @param {string[]} expected in SMILES */
function gives(smiles, reaction, expected) {
  const d = outcome(alkene(smiles), reaction);
  const left = d ? molecules(d) : [];
  return expected.length === left.length && expected.every((s) => { const i = left.findIndex((g) => sameMolecule(g, fromSmiles(s))); return i >= 0 && left.splice(i, 1).length; });
}

test('an addition puts its groups on the carbons of the C=C: Markovnikov or not (figures 7.6, 7.14, 7.15)', () => {
  // Figure 7.15 sets hydroboration-oxidation and acid hydration side by side on 2-méthylpropène.
  assert.deepEqual(names('C=C(C)C', 'hydration'), ['2-méthylpropan-2-ol']);
  assert.deepEqual(names('C=C(C)C', 'hydroboration'), ['2-méthylpropan-1-ol']);
  assert.deepEqual(names('C=C(C)C', 'hx'), ['2-bromo-2-méthylpropane']);
  assert.deepEqual(names('C=CC', 'hydrogenation'), ['propane']); // figure 7.19
  assert.deepEqual(names('C=CC', 'dihydroxylation'), ['propane-1,2-diol']); // figure 7.26, a vicinal diol
});

test('an epoxidation bridges the two carbons with an O (figure 7.32)', () => {
  assert.ok(gives('C=C', 'epoxidation', ['C1CO1']));
  assert.ok(gives('CC=C(C)C', 'epoxidation', ['CC1OC1(C)C']));
  // The namer leaves the cyclic ethers out (SPEC, Exercices de nomenclature): the product goes without a name.
  assert.deepEqual(names('C=C', 'epoxidation'), ['']);
});

test('an ozonolysis cuts the C=C and gives each carbon a C=O (figure 7.30, its two examples)', () => {
  assert.deepEqual(names('C=C1CCC1', 'ozonolysis'), ['cyclobutanone', 'méthanal']);
  assert.deepEqual(names('C1=CCCC1', 'ozonolysis'), ['pentanedial']); // a ring opens into one molecule
  assert.ok(gives('CC=C(C)C', 'ozonolysis', ['CC=O', 'CC(C)=O']));
});

test('KMnO₄ concentrated goes on to the acids, and a CH₂ to CO₂ and H₂O; a ketone stays (figure 7.28)', () => {
  assert.ok(gives('CC=C(C)C', 'cleavage', ['CC(=O)O', 'CC(C)=O']));
  assert.ok(gives('C=C1CCC1', 'cleavage', ['O=C1CCC1', 'O=C=O', 'O']));
  // CO₂ is drawn straight.
  const d = /** @type {M.Doc} */ (outcome(alkene('C=CC'), 'cleavage'));
  const co2 = /** @type {M.Atom} */ (d.atoms.find((a) => a.element === 'C' && M.neighbors(d, a.id).length === 2 && M.neighbors(d, a.id).every((n) => M.findAtom(d, n)?.element === 'O')));
  const [o1, o2] = M.neighbors(d, co2.id).map((n) => /** @type {M.Atom} */ (M.findAtom(d, n)));
  assert.ok(Math.abs(o1.x + o2.x - 2 * co2.x) < 1e-6 && Math.abs(o1.y - o2.y) < 1e-6);
});

test('a tie between two different carbons is decided only when both ways give the same product', () => {
  // Pent-2-ène: the H could go on C2 or C3, which gives two products when the groups differ.
  for (const r of ['hx', 'hydration', 'hydroboration']) assert.equal(names('CC=CCC', r), null, r);
  assert.deepEqual(names('CC=CCC', 'hydrogenation'), ['pentane']);
  assert.deepEqual(names('CC=CCC', 'dihydroxylation'), ['pentane-2,3-diol']);
  assert.deepEqual(names('CC=CCC', 'ozonolysis'), ['propanal', 'éthanal']);
  // But-2-ène and cyclohexène: both ways give the same.
  assert.deepEqual(names('CC=CC', 'hydroboration'), ['butan-2-ol']);
  assert.deepEqual(names('C1=CCCCC1', 'hx'), ['bromocyclohexane']);
});

test('only a carbocation rearranges: those alkenes are left out of HX and hydration, not of hydroboration', () => {
  // 3-Méthylbut-1-ène: the secondary C⁺ would take the H of its neighbour (a 1,2-hydride shift).
  assert.equal(names('C=CC(C)C', 'hx'), null);
  assert.equal(names('C=CC(C)C', 'hydration'), null);
  assert.deepEqual(names('C=CC(C)C', 'hydroboration'), ['3-méthylbutan-1-ol']);
});

test('the exercises leave out two C=C, a C≡C, more than 8 carbons', () => {
  for (const s of ['C=CC=CC', 'C=CCC#C', 'C=CCCCCCCC']) for (const r of Object.keys(NET)) assert.equal(addition(alkene(s), r), null, `${s} ${r}`);
  assert.equal(addition(alkene('C=CC'), 'hx')?.cation, 'secondary');
});
