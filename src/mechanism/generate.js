// @ts-check
import * as M from '../model.js';
import { add, angleOf, fromAngle, nextBondAngle, sub } from '../geometry.js';
import { builder } from '../templates.js';
import { atomsOf } from './check.js';
import { series as namingSeries } from '../naming/generate.js';
import { toGraph } from '../naming/graph.js';
import { addition as sides } from './reactions.js';
import { nameOf } from '../naming/namer.js';
import { fr } from '../i18n/fr.js';

/**
 * Mechanism exercises (SPEC, Exercices de mécanisme): electrophilic additions to an alkene through the most
 * substituted carbocation (Markovnikov): HX in two steps, acid hydration in three. The alkenes come from the
 * nomenclature generator, already drawn and named; those whose H could go either way, or whose carbocation
 * would rearrange, are left out. An item is the whole mechanism with parts taken away, as its style says.
 * @typedef {import('./check.js').Mechanism} Mechanism
 * @typedef {'hx' | 'hydration'} Reaction
 * @typedef {'arrows' | 'structures' | 'complete' | 'product'} Style
 * @typedef {{reaction: Reaction, style: Style, alkene: string, reagent: string, x: string, product: string,
 *   cation: 'primary' | 'secondary' | 'tertiary', given: M.Doc, answer: Mechanism, steps: number[]}} Item
 *   reagent: as the title writes it (HBr, H₂O (H₂SO₄)); x: the halogen of HX; given: the drawing the student
 *   starts from; steps: the steps whose arrows are asked
 */

export const REACTIONS = /** @type {Reaction[]} */ (['hx', 'hydration']);
export const STYLES = ['progressive', 'arrows', 'structures', 'complete', 'product'];
/** A level is a reaction and a style: hx-progressive, hydration-arrows… */
export const LEVELS = REACTIONS.flatMap((r) => STYLES.map((s) => `${r}-${s}`));
const PROGRESSIVE = /** @type {Style[]} */ (['arrows', 'arrows', 'arrows', 'structures', 'structures', 'structures', 'complete', 'complete', 'product', 'product']);
const HALIDES = ['Br', 'Cl', 'Br', 'I'];
const L = 40;
const GAP = 30; // between a molecule and a + or a reaction arrow
const ARROW = 70;

/** One more bond out of a point, in the free direction among the given ones. @param {{x: number, y: number}} p @param {{x: number, y: number}[]} others */
const beyond = (p, others) => add(p, fromAngle(nextBondAngle(others.map((o) => angleOf(sub(o, p)))), L));

/**
 * What an electrophile does to an alkene (reactions.js), or null when the textbook would not decide, with where
 * the group goes on the carbon that becomes C⁺ (x) and, for an oxonium, where its two H go (hs, null without
 * room). Also left out: a group on top of another atom.
 * @param {M.Doc} d @param {Reaction} reaction
 */
function addition(d, reaction) {
  const a = sides(d, reaction);
  if (!a) return null;
  const free = (/** @type {{x: number, y: number}} */ pt) => d.atoms.every((t) => Math.hypot(t.x - pt.x, t.y - pt.y) >= 0.75 * L);
  const x = beyond(a.c, M.neighbors(d, a.c.id).map((n) => /** @type {M.Atom} */ (M.findAtom(d, n))));
  if (!free(x)) return null;
  const h1 = beyond(x, [a.c]), h2 = beyond(x, [a.c, h1]);
  return { ...a, x, hs: free(h1) && free(h2) ? [h1, h2] : null };
}
/** @typedef {NonNullable<ReturnType<typeof addition>>} Addition */

/**
 * Draws a mechanism left to right: copies of the alkene, the small species beside them, reaction arrows between.
 * @param {M.Doc} d the alkene @param {Addition} a
 */
function pen(d, a) {
  const b = builder();
  const ys = d.atoms.map((t) => t.y), xs = d.atoms.map((t) => t.x);
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
  // The double bond faces the reagents on its right, as in the textbook: an alkene whose C=C is on its left is
  // drawn mirrored, the same molecule, so that no arrow goes around it.
  const mirror = (a.h.x + a.c.x) / 2 < (Math.min(...xs) + Math.max(...xs)) / 2 ? -1 : 1;
  /** @param {{x: number, y: number}} p */
  const turn = (p) => ({ x: mirror * p.x, y: p.y });
  let left = 0;
  /** @type {M.ReactionArrow['kind'][]} */
  const kinds = [];
  /** @param {number} x @param {number} [y] */
  const put = (x, y = 0) => /** @type {[number, number]} */ ([M.r2(x), M.r2(y)]);
  return {
    b,
    /**
     * The alkene at the current place: as it is, as the carbocation, or single-bonded with a group on that carbon
     * (X; the OH of an alcohol; the O⁺ of an oxonium with its two H drawn).
     * @param {{cation?: boolean, group?: {el: string, charge: number, pairs: number, hs?: boolean}}} [o]
     */
    alkene({ cation = false, group } = {}) {
      const at = turn(a.x), hs = group?.hs && a.hs ? a.hs.map(turn) : [];
      const pts = [...d.atoms.map(turn), ...(group ? [at, ...hs] : [])];
      const shift = left - Math.min(...pts.map((p) => p.x));
      /** @param {{x: number, y: number}} p */
      const place = (p) => put(p.x + shift, p.y - midY);
      const ids = new Map(d.atoms.map((t) => [t.id, b.atom(t.element, ...place(turn(t)), cation && t.id === a.c.id ? 1 : 0)]));
      const bonds = new Map(d.bonds.map((bd) => [bd.id, b.bond(/** @type {{id: string}} */ (ids.get(bd.a)), /** @type {{id: string}} */ (ids.get(bd.b)), cation || group ? 1 : bd.order)]));
      const atom = (/** @type {string} */ id) => /** @type {{id: string}} */ (ids.get(id));
      /** @type {{g: {id: string}, hs: {h: {id: string}, bond: string, x: number}[]} | null} */
      let on = null;
      if (group) {
        const g = b.atom(group.el, ...place(at), group.charge, group.pairs);
        b.bond(atom(a.c.id), g);
        on = { g, hs: hs.map((p) => { const h = b.atom('H', ...place(p)); return { h, bond: b.bond(h, g), x: p.x + shift }; }) };
      }
      left = Math.max(...pts.map((p) => p.x)) + shift;
      return { atom: (/** @type {string} */ id) => atom(id).id, bonds, on };
    },
    plus() { left += GAP; b.plus(left); left += GAP; },
    /** H–X with its three lone pairs. @param {string} x */
    hx(x) { const h = b.atom('H', ...put(left)); const hal = b.atom(x, ...put(left + L), 0, 3); left += L; return { h, x: hal, bond: b.bond(h, hal) }; },
    /** X⁻ with its four lone pairs. @param {string} x */
    halide(x) { return b.atom(x, ...put(left), -1, 4); },
    /** H₃O⁺ as the textbook draws it, H–O⁺(H)–H with a lone pair; the H on the left faces the alkene. */
    hydronium() {
      const h = b.atom('H', ...put(left));
      const o = b.atom('O', ...put(left + L), 1, 1);
      for (const [x, y] of [[left + 2 * L, 0], [left + L, L]]) b.bond(b.atom('H', ...put(x, y)), o);
      left += 2 * L;
      return { h, o, bond: b.bond(h, o) };
    },
    /** H₂O, its H implicit, with its two lone pairs; its label H₂O reaches left of the O, so it stands a little further. */
    water() { left += 12; return b.atom('O', ...put(left), 0, 2); },
    /** A reaction arrow, with what is written over it. @param {string} [above] @param {M.ReactionArrow['kind']} [kind] */
    step(above = '', kind = 'forward') { left += GAP; b.step(left, left + ARROW, above); kinds.push(kind); left += ARROW + GAP; },
    done() { const doc = b.done(); doc.reactionArrows.forEach((r, i) => { r.kind = kinds[i]; }); return doc; },
  };
}

/**
 * HX: alkene + H–X, → carbocation + X⁻, → haloalkane, with its three curved arrows (π to the H, forming the
 * C–H bond on the carbon with more H; H–X to X; X⁻ to C⁺) and « Étape lente », « Étape rapide » over the
 * reaction arrows (figure 7.6). Short: the reactants → the product.
 * @param {M.Doc} d @param {Addition} a @param {string} x @param {boolean} short @returns {Mechanism}
 */
function drawHX(d, a, x, short) {
  const p = pen(d, a);
  const alkene = p.alkene();
  p.plus();
  const hx = p.hx(x);
  p.step(short ? '' : fr.mechanism.slow);
  if (!short) {
    const cation = p.alkene({ cation: true });
    p.plus();
    const ion = p.halide(x);
    p.step(fr.mechanism.fast);
    p.b.arrow({ bond: /** @type {string} */ (alkene.bonds.get(a.pi.id)) }, { atom: hx.h.id });
    p.b.arrow({ bond: hx.bond }, { atom: hx.x.id });
    p.b.arrow({ mark: ion.lp[3] }, { atom: cation.atom(a.c.id) });
  }
  p.alkene({ group: { el: x, charge: 0, pairs: 3 } });
  const doc = p.done();
  // H–X polarised, δ+ on the H that the π bond attacks; below, as in the textbook (figure 7.6), clear of the
  // arrow curling above from H–X to X. The check does not ask for them.
  M.addMark(doc, hx.h.id, 'partial', { value: 'δ+', angle: 225 });
  M.addMark(doc, hx.x.id, 'partial', { value: 'δ−', angle: 315 });
  return mechanism(doc, ['pi', 'leaving', 'attack'], short ? null : [alkene.atom(a.h.id), hx.h.id]);
}

/**
 * Acid hydration as the textbook draws it (figure 7.14): alkene + H₃O⁺, → carbocation + H₂O, → oxonium + H₂O
 * (the solvent, a base), ⇌ alcohol + H₃O⁺; five curved arrows (π to an H of H₃O⁺ and H–O to O; H₂O to C⁺;
 * the base to an H of the oxonium and O–H to O⁺). Short: alkene + H₂O, H₂SO₄ over the arrow, → alcohol (figure 7.13).
 * @param {M.Doc} d @param {Addition} a @param {boolean} short @returns {Mechanism}
 */
function drawHydration(d, a, short) {
  const p = pen(d, a);
  const alkene = p.alkene();
  p.plus();
  if (short) {
    p.water();
    p.step(fr.mechanism.acid);
  } else {
    const acid = p.hydronium();
    p.step();
    const cation = p.alkene({ cation: true });
    p.plus();
    const water = p.water();
    p.step();
    const oxonium = p.alkene({ group: { el: 'O', charge: 1, pairs: 1, hs: true } });
    p.plus();
    const base = p.water();
    p.step('', 'equilibrium');
    // The H the base takes: the one facing it.
    const [far] = [...(oxonium.on?.hs ?? [])].sort((u, v) => v.x - u.x);
    p.b.arrow({ bond: /** @type {string} */ (alkene.bonds.get(a.pi.id)) }, { atom: acid.h.id });
    p.b.arrow({ bond: acid.bond }, { atom: acid.o.id });
    p.b.arrow({ mark: water.lp[0] }, { atom: cation.atom(a.c.id) });
    p.b.arrow({ mark: base.lp[0] }, { atom: far.h.id });
    p.b.arrow({ bond: far.bond }, { atom: /** @type {{id: string}} */ (oxonium.on?.g).id });
    p.alkene({ group: { el: 'O', charge: 0, pairs: 2 } });
    p.plus();
    p.hydronium();
    return mechanism(p.done(), ['pi', 'leaving', 'attack', 'base', 'leaving'], [alkene.atom(a.h.id), acid.h.id]);
  }
  p.alkene({ group: { el: 'O', charge: 0, pairs: 2 } });
  return mechanism(p.done(), [], null);
}

/** The drawing with its arrows' roles, and the C–H bond the π arrow forms. @param {M.Doc} doc @param {string[]} roles @param {[string, string] | null} ch */
const mechanism = (doc, roles, ch) => ({
  doc, roles: Object.fromEntries(doc.curvedArrows.map((c, i) => [c.id, roles[i]])), forms: ch ? { [doc.curvedArrows[0].id]: ch } : {},
});

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
 * A series of a reaction in one style, or going from arrows to whole mechanisms; the same seed gives everyone
 * the same series.
 * @param {string} level one of LEVELS @param {number} seed @param {number} [count] @returns {{level: string, seed: number, items: Item[]}}
 */
export function series(level, seed, count = 10) {
  const [reaction, chosen] = /** @type {[Reaction, string]} */ (level.split('-'));
  /** @type {Item[]} */
  const items = [];
  const seen = new Set();
  for (let chunk = 0; items.length < count; chunk++) {
    if (chunk > 50) throw new Error(`mechanism: no ${level} after ${chunk} chunks`);
    for (const { doc: d, name } of namingSeries('alkenes', seed * 53 + chunk, 10).items) {
      const a = items.length < count && !seen.has(name) ? addition(d, reaction) : null;
      // An oxonium needs room for its two H.
      if (!a || (reaction === 'hydration' && !a.hs)) continue;
      seen.add(name);
      const i = items.length;
      const style = chosen === 'progressive' ? PROGRESSIVE[i % PROGRESSIVE.length] : /** @type {Style} */ (chosen);
      const x = reaction === 'hx' ? HALIDES[(seed + i) % HALIDES.length] : '';
      const answer = reaction === 'hx' ? drawHX(d, a, x, style === 'product') : drawHydration(d, a, style === 'product');
      const n = answer.doc.reactionArrows.length;
      const later = [...Array(n).keys()].map((k) => k + 1);
      // What each style takes away: the curved arrows, the states after the reactants, or the product.
      const [states, keep] = /** @type {[number[], number[]]} */ ({ arrows: [[], []], structures: [later, [1]], complete: [later, []], product: [[1], []] }[style]);
      const given = hide(answer.doc, states, keep);
      const last = M.regions(answer.doc).states[n];
      const organic = M.component(answer.doc, /** @type {string} */ (last.find((id) => M.findAtom(answer.doc, id)?.element === 'C')));
      const product = nameOf(toGraph(answer.doc, organic)).name;
      const reagent = reaction === 'hx' ? `H${x}` : fr.mechanism.water;
      items.push({ reaction, style, alkene: name, reagent, x, product, cation: a.cation, given, answer, steps: style === 'arrows' || style === 'complete' ? later : [] });
    }
  }
  return { level, seed, items };
}
