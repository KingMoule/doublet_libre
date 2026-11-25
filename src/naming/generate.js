// @ts-check
import * as M from '../model.js';
import { add, angleOf, fromAngle, nextBondAngle, ringAt, ringOnAtom, sub, zigzag } from '../geometry.js';
import { fromSmiles, toGraph } from './graph.js';
import { NamingError, nameOf, wrongNames } from './namer.js';

/**
 * Molecules for the nomenclature exercises, one level per section of the textbook. A molecule is
 * drawn as it grows, with the app's own drawing: a zigzag at 120°, each branch in the free direction
 * of its atom, rings as regular polygons. One whose drawing overlaps, or that the namer cannot name
 * (out of scope, or not decided by the textbook), is drawn again. A seed gives everyone the same series.
 * @typedef {{dir: 'name' | 'draw', doc: M.Doc, name: string, naming: import('./namer.js').Naming,
 *   wrong: {name: string, rule: string}[], parentIds: string[]}} Item parentIds: the parent's atoms, in numbering order
 */

const L = 40;
export const LEVELS = ['alkanes', 'cycloalkanes', 'halogens', 'alkenes'];
// Branches written from their first atom (tableau 2.6); methyl and ethyl come up most often.
const ALKYLS = ['C', 'C', 'C', 'CC', 'CC', 'CCC', 'C(C)C', 'CCCC', 'CC(C)C', 'C(C)CC', 'C(C)(C)C'];
const HALOGENS = ['F', 'Cl', 'Br', 'I'];

/** Numbers from a seed (mulberry32), the same series for everyone. @param {number} seed */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** @typedef {() => number} Rand */
const int = (/** @type {Rand} */ r, /** @type {number} */ lo, /** @type {number} */ hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (/** @type {Rand} */ r, /** @type {any[]} */ xs) => xs[Math.floor(r() * xs.length)];

/** Directions of the bonds of an atom. @param {M.Doc} doc @param {string} id */
function bondAngles(doc, id) {
  const a = /** @type {M.Atom} */ (M.findAtom(doc, id));
  return doc.bonds.filter((b) => b.a === id || b.b === id).map((b) => angleOf(sub(/** @type {M.Atom} */ (M.findAtom(doc, b.a === id ? b.b : b.a)), a)));
}
/** Carbons that can take one more single bond: fewer than four, a double bond counting twice. @param {M.Doc} doc @param {string[]} ids */
const free = (doc, ids) => ids.filter((id) => doc.bonds.filter((b) => b.a === id || b.b === id).reduce((s, b) => s + b.order, 0) < 4);

/** Hangs a branch, written in SMILES from its first atom, from an atom: each atom in the free direction. @param {M.Doc} doc @param {string} at @param {string} smiles */
function attach(doc, at, smiles) {
  const t = fromSmiles(smiles);
  const place = (/** @type {number} */ i, /** @type {string} */ from) => {
    const p = add(/** @type {M.Atom} */ (M.findAtom(doc, from)), fromAngle(nextBondAngle(bondAngles(doc, from)), L));
    const atom = M.addAtom(doc, { element: t.atoms[i].el, ...p });
    M.addBond(doc, from, atom.id);
    for (const b of t.bonds) if (b.a === i) place(b.b, atom.id);
  };
  place(0, at);
}

/** Hangs a bare ring of n carbons from an atom. @param {M.Doc} doc @param {string} at @param {number} n */
function attachRing(doc, at, n) {
  const dir = nextBondAngle(bondAngles(doc, at));
  const root = M.addAtom(doc, add(/** @type {M.Atom} */ (M.findAtom(doc, at)), fromAngle(dir, L)));
  M.addBond(doc, at, root.id);
  M.addRing(doc, ringOnAtom(root, dir, n, L));
}

const chain = (/** @type {M.Doc} */ doc, /** @type {number} */ n) => M.addPath(doc, [{ x: 0, y: 0 }, ...zigzag({ x: 0, y: 0 }, 0, n - 1, L)]).ids;
const ring = (/** @type {M.Doc} */ doc, /** @type {number} */ n) => M.addRing(doc, ringAt({ x: 0, y: 0 }, n, L));

/** @type {Record<string, (r: Rand) => M.Doc>} */
const BUILD = {
  // 2.5.1: a chain of 4 to 8 carbons with 1 to 3 branches.
  alkanes: (r) => {
    const d = M.emptyDoc();
    const ids = chain(d, int(r, 4, 8));
    for (let k = int(r, 1, 3); k > 0; k--) attach(d, pick(r, free(d, ids.slice(1, -1))), pick(r, ALKYLS));
    return d;
  },
  // 2.5.2: a ring of 3 to 8 carbons with 1 to 3 branches, or a bare ring on a chain.
  cycloalkanes: (r) => {
    const d = M.emptyDoc();
    if (r() < 0.6) {
      const ids = ring(d, int(r, 3, 8));
      for (let k = int(r, 1, 3); k > 0; k--) attach(d, pick(r, free(d, ids)), pick(r, ALKYLS));
    } else {
      const n = int(r, 3, 6);
      const ids = chain(d, int(r, n + 1, 9));
      attachRing(d, pick(r, ids), n);
      if (r() < 0.5) attach(d, pick(r, free(d, ids.slice(1, -1))), 'C');
    }
    return d;
  },
  // 2.5.4: 1 or 2 double bonds, never side by side, in a chain of 2 to 8 carbons or a ring of 5 to 7, with up to 2 branches.
  alkenes: (r) => {
    const d = M.emptyDoc();
    const isRing = r() < 0.3;
    const ids = isRing ? ring(d, int(r, 5, 7)) : chain(d, int(r, 2, 8));
    const links = ids.slice(isRing ? 0 : 1).map((id, k) => M.bondBetween(d, ids[isRing ? (k + ids.length - 1) % ids.length : k], id));
    for (let k = int(r, 1, 2); k > 0; k--) {
      const b = pick(r, links.filter((x) => x && !d.bonds.some((y) => y.order === 2 && [y.a, y.b].some((a) => a === x.a || a === x.b))));
      if (b) M.setBondOrder(d, b.id, 2);
    }
    for (let k = int(r, 0, 2); k > 0; k--) attach(d, pick(r, free(d, ids)), pick(r, ALKYLS));
    return d;
  },
  // 2.5.3: 1 to 3 halogens on a chain or a ring, with up to 2 branches.
  halogens: (r) => {
    const d = M.emptyDoc();
    const ids = r() < 0.7 ? chain(d, int(r, 2, 7)) : ring(d, int(r, 3, 6));
    for (let k = int(r, 0, 2); k > 0; k--) attach(d, pick(r, free(d, ids)), pick(r, ALKYLS));
    for (let k = int(r, 1, 3); k > 0; k--) attach(d, pick(r, free(d, ids)), pick(r, HALOGENS));
    return d;
  },
};

/** No two atoms on top of each other, no crossing bonds. @param {M.Doc} doc */
function tidy(doc) {
  const at = (/** @type {string} */ id) => /** @type {M.Atom} */ (M.findAtom(doc, id));
  if (doc.atoms.some((p, i) => doc.atoms.slice(i + 1).some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 0.75 * L))) return false;
  const side = (/** @type {M.Atom} */ p, /** @type {M.Atom} */ q, /** @type {M.Atom} */ s) => Math.sign((q.x - p.x) * (s.y - p.y) - (q.y - p.y) * (s.x - p.x));
  return !doc.bonds.some((b, i) => doc.bonds.slice(i + 1).some((c) => {
    if ([b.a, b.b].some((x) => x === c.a || x === c.b)) return false;
    const [p, q, s, t] = [at(b.a), at(b.b), at(c.a), at(c.b)];
    return side(p, q, s) * side(p, q, t) < 0 && side(s, t, p) * side(s, t, q) < 0;
  }));
}

/**
 * A series of molecules of a level, to name and to draw in turn, all different.
 * @param {string} level one of LEVELS @param {number} seed @param {number} [count] @returns {{level: string, seed: number, items: Item[]}}
 */
export function series(level, seed, count = 10) {
  const r = random(seed);
  /** @type {Item[]} */
  const items = [];
  for (let tries = 0; items.length < count; tries++) {
    if (tries > 1000) throw new Error(`generate: no ${level} after ${tries} tries`);
    const doc = BUILD[level](r);
    if (!tidy(doc)) continue;
    const g = toGraph(doc);
    let naming;
    try { naming = nameOf(g); } catch (e) { if (e instanceof NamingError) continue; throw e; }
    // Ten carbons at most in the parent, as in the textbook's exercises; and no molecule twice.
    if (naming.parent.length > 10 || items.some((i) => i.name === naming.name)) continue;
    const parentIds = naming.parent.map((i) => /** @type {string[]} */ (g.ids)[i]);
    items.push({ dir: items.length % 2 ? 'draw' : 'name', doc, name: naming.name, naming, wrong: wrongNames(g), parentIds });
  }
  return { level, seed, items };
}
