// @ts-check
import * as M from '../model.js';
import { add, angleOf, fromAngle, nextBondAngle, sub } from '../geometry.js';
import { builder } from '../templates.js';
import { atomsOf } from './check.js';
import { series as namingSeries } from '../naming/generate.js';
import { sameMolecule, toGraph } from '../naming/graph.js';
import { nameOf } from '../naming/namer.js';
import { fr } from '../i18n/fr.js';

/**
 * Mechanism exercises (SPEC, Exercices de mécanisme): HX added to an alkene, in two steps through the
 * most substituted carbocation (Markovnikov). The alkenes come from the nomenclature generator, already
 * drawn and named; those whose H could go either way, or whose carbocation would rearrange, are left out.
 * An item is the whole mechanism with parts taken away, as its style says.
 * @typedef {import('./check.js').Mechanism} Mechanism
 * @typedef {'arrows' | 'structures' | 'complete' | 'product'} Style
 * @typedef {{style: Style, alkene: string, x: string, product: string, cation: 'primary' | 'secondary' | 'tertiary',
 *   given: M.Doc, answer: Mechanism, steps: number[]}} Item
 *   given: the drawing the student starts from; steps: the steps whose arrows are asked
 */

export const LEVELS = ['progressive', 'arrows', 'structures', 'complete', 'product'];
const PROGRESSIVE = /** @type {Style[]} */ (['arrows', 'arrows', 'arrows', 'structures', 'structures', 'structures', 'complete', 'complete', 'product', 'product']);
const HALIDES = ['Br', 'Cl', 'Br', 'I'];
const L = 40;
const GAP = 30; // between a molecule and a + or a reaction arrow
const ARROW = 70;

/** The carbon atoms bonded to an atom. @param {M.Doc} d @param {string} id */
const carbons = (d, id) => M.neighbors(d, id).filter((n) => M.findAtom(d, n)?.element === 'C');

/**
 * What HX does to an alkene, or null when the textbook would not decide: the carbon that takes the H
 * (the one with more H, Markovnikov), the one that becomes C⁺, where X goes on it. Left out: two C=C or a
 * C≡C, a tie between two different carbons, a secondary carbocation next to a carbon with three carbons or
 * more (it would rearrange by a hydride or methyl shift), more than 8 carbons, X on top of another atom.
 * @param {M.Doc} d
 */
function addition(d) {
  const pis = d.bonds.filter((b) => b.order === 2);
  if (pis.length !== 1 || d.bonds.some((b) => b.order === 3) || d.atoms.filter((a) => a.element === 'C').length > 8) return null;
  const [p, q] = [pis[0].a, pis[0].b].map((id) => /** @type {M.Atom} */ (M.findAtom(d, id)));
  const [h, c] = M.hydrogenCount(d, p) >= M.hydrogenCount(d, q) ? [p, q] : [q, p];
  const at = (/** @type {M.Atom} */ a) => add(a, fromAngle(nextBondAngle(M.neighbors(d, a.id).map((n) => angleOf(sub(/** @type {M.Atom} */ (M.findAtom(d, n)), a)))), L));
  if (M.hydrogenCount(d, p) === M.hydrogenCount(d, q)) {
    // A tie is decided only when both ways give the same product (but-2-ène, cyclohexène).
    const product = (/** @type {M.Atom} */ onX) => { const e = structuredClone(d); M.setBondOrder(e, pis[0].id, 1); M.addBond(e, onX.id, M.addAtom(e, { element: 'Br', ...at(onX) }).id); return toGraph(e); };
    if (!sameMolecule(product(p), product(q))) return null;
  }
  const n = carbons(d, c.id).length;
  if (n === 2 && carbons(d, c.id).some((id) => id !== h.id && carbons(d, id).length >= 3)) return null;
  const x = at(c);
  if (d.atoms.some((a) => Math.hypot(a.x - x.x, a.y - x.y) < 0.75 * L)) return null;
  return { pi: pis[0], h, c, x, cation: /** @type {Item['cation']} */ (['primary', 'primary', 'secondary', 'tertiary'][n]) };
}

/**
 * Draws the whole mechanism left to right: alkene + H–X, → carbocation + X⁻, → product, with its three
 * curved arrows (π to the H, forming the C–H bond on the carbon with more H; H–X to X; X⁻ to C⁺). Without
 * the carbocation (short), only the reactants → the product.
 * @param {M.Doc} d the alkene @param {NonNullable<ReturnType<typeof addition>>} a @param {string} x @param {boolean} short
 * @returns {Mechanism}
 */
function draw(d, a, x, short) {
  const b = builder();
  const xs = d.atoms.map((t) => t.x), ys = d.atoms.map((t) => t.y);
  const [minX, maxX, midY] = [Math.min(...xs), Math.max(...xs), (Math.min(...ys) + Math.max(...ys)) / 2];
  /** The alkene with its left edge at left; single bonds and C⁺ in the carbocation, single bonds in the product. @param {number} left @param {0 | 1 | 2} state */
  const copy = (left, state) => {
    const ids = new Map(d.atoms.map((t) => [t.id, b.atom(t.element, M.r2(t.x - minX + left), M.r2(t.y - midY), state === 1 && t.id === a.c.id ? 1 : 0)]));
    const bonds = new Map(d.bonds.map((bd) => [bd.id, b.bond(/** @type {{id: string}} */ (ids.get(bd.a)), /** @type {{id: string}} */ (ids.get(bd.b)), state ? 1 : bd.order)]));
    return { atom: (/** @type {string} */ id) => /** @type {{id: string}} */ (ids.get(id)).id, bonds };
  };
  const step = (/** @type {number} */ left, label = '') => { b.step(left, left + ARROW, label); return left + ARROW + GAP; };
  // Reactants: the alkene + H–X.
  const alkene = copy(0, 0);
  let left = maxX - minX + GAP;
  b.plus(left);
  const h = b.atom('H', M.r2(left + GAP), 0);
  const hal = b.atom(x, M.r2(left + GAP + L), 0, 0, 3);
  const hx = b.bond(h, hal);
  // Over the arrows, as in the textbook (figure 7.6): the carbocation forms slowly, then reacts fast.
  left = step(left + 2 * GAP + L, short ? '' : fr.mechanism.slow);
  /** @type {[string, string] | null} */
  let ch = null; // the C–H bond the π arrow forms
  if (!short) {
    // The carbocation + X⁻.
    const cation = copy(left, 1);
    left += maxX - minX + GAP;
    b.plus(left);
    const ion = b.atom(x, M.r2(left + GAP), 0, -1, 4);
    left = step(left + 2 * GAP, fr.mechanism.fast);
    b.arrow({ bond: /** @type {string} */ (alkene.bonds.get(a.pi.id)) }, { atom: h.id });
    b.arrow({ bond: hx }, { atom: hal.id });
    b.arrow({ mark: ion.lp[3] }, { atom: cation.atom(a.c.id) });
    ch = [alkene.atom(a.h.id), h.id];
  }
  // The product, moved right when X sticks out on the left.
  const shift = Math.max(0, minX - a.x.x);
  const product = copy(left + shift, 2);
  b.bond({ id: product.atom(a.c.id) }, b.atom(x, M.r2(a.x.x - minX + left + shift), M.r2(a.x.y - midY), 0, 3));
  const doc = b.done();
  // H–X polarised, δ+ on the H that the π bond attacks; below, as in the textbook (figure 7.6), clear of the
  // arrow curling above from H–X to X. The check does not ask for them.
  M.addMark(doc, h.id, 'partial', { value: 'δ+', angle: 225 });
  M.addMark(doc, hal.id, 'partial', { value: 'δ−', angle: 315 });
  const roles = Object.fromEntries(doc.curvedArrows.map((c, i) => [c.id, ['pi', 'leaving', 'attack'][i]]));
  return { doc, roles, forms: ch ? { [doc.curvedArrows[0].id]: ch } : {} };
}

/**
 * The mechanism with states taken away (their atoms and their + signs, the room kept between the reaction
 * arrows) and only the curved arrows of the steps kept.
 * @param {M.Doc} doc @param {number[]} states @param {number[]} keep
 */
function hide(doc, states, keep) {
  const d = structuredClone(doc);
  const { arrows, states: atoms } = M.regions(d);
  const stateOf = (/** @type {string} */ id) => atoms.findIndex((s) => s.includes(id));
  // An arrow belongs to the step after the state its electrons are in.
  d.curvedArrows = d.curvedArrows.filter((c) => keep.includes(stateOf(atomsOf(d, c.from)[0]) + 1));
  for (const k of states) {
    for (const id of atoms[k]) M.removeAtom(d, id);
    const lo = k ? Math.max(arrows[k - 1].x1, arrows[k - 1].x2) : -Infinity, hi = k < arrows.length ? Math.min(arrows[k].x1, arrows[k].x2) : Infinity;
    d.texts = d.texts.filter((t) => t.x < lo || t.x > hi);
  }
  return d;
}

/**
 * A series of HX additions in one style, or going from arrows to whole mechanisms; the same seed gives
 * everyone the same series.
 * @param {string} level one of LEVELS @param {number} seed @param {number} [count] @returns {{level: string, seed: number, items: Item[]}}
 */
export function series(level, seed, count = 10) {
  /** @type {Item[]} */
  const items = [];
  const seen = new Set();
  for (let chunk = 0; items.length < count; chunk++) {
    if (chunk > 50) throw new Error(`mechanism: no ${level} after ${chunk} chunks`);
    for (const { doc: d, name } of namingSeries('alkenes', seed * 53 + chunk, 10).items) {
      const a = items.length < count && !seen.has(name) ? addition(d) : null;
      if (!a) continue;
      seen.add(name);
      const i = items.length;
      const style = level === 'progressive' ? PROGRESSIVE[i % PROGRESSIVE.length] : /** @type {Style} */ (level);
      const x = HALIDES[(seed + i) % HALIDES.length];
      const answer = draw(d, a, x, style === 'product');
      // What each style takes away: the curved arrows, the states after the reactants, or the product.
      const [states, keep] = /** @type {[number[], number[]]} */ ({ arrows: [[], []], structures: [[1, 2], [1]], complete: [[1, 2], []], product: [[1], []] }[style]);
      const given = hide(answer.doc, states, keep);
      const product = nameOf(toGraph(answer.doc, M.regions(answer.doc).states.at(-1))).name;
      items.push({ style, alkene: name, x, product, cation: a.cation, given, answer, steps: style === 'arrows' || style === 'complete' ? [1, 2] : [] });
    }
  }
  return { level, seed, items };
}
