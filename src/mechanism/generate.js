// @ts-check
import * as M from '../model.js';
import { add, angleOf, fromAngle, nextBondAngle, sub } from '../geometry.js';
import { builder } from '../templates.js';
import { STYLE, textWidth } from '../render.js';
import { atomsOf, named, parts, sameSet } from './check.js';
import { series as namingSeries } from '../naming/generate.js';
import { toGraph } from '../naming/graph.js';
import { apex, outcome, addition as sides } from './reactions.js';
import { nameOf } from '../naming/namer.js';
import { fr } from '../i18n/fr.js';

/**
 * Mechanism exercises (SPEC, Exercices de mécanisme) on the alkenes of the textbook's chapter 7. Three
 * electrophilic additions have their mechanism drawn: HX in two steps and acid hydration in three, through the most
 * substituted carbocation (Markovnikov); X₂ in two, through the bridged ion. The other reactions are drawn as their global reaction, from the
 * table of reactions.js. The alkenes come from the nomenclature generator, already drawn and named; those the
 * textbook would not decide, and those of more than 8 carbons, are left out. An item is the whole mechanism or
 * reaction with parts taken away, as its style says.
 * @typedef {import('./check.js').Mechanism} Mechanism
 * @typedef {'hx' | 'hydration' | 'halogenation' | 'hydroboration' | 'hydrogenation' | 'dihydroxylation' | 'epoxidation' | 'ozonolysis' | 'cleavage'} Reaction
 * @typedef {'arrows' | 'structures' | 'complete' | 'product' | 'reagents' | 'substrate'} Style
 * @typedef {{reaction: Reaction, style: Style, alkene: string, reagent: string, x: string, product: string,
 *   cation: 'primary' | 'secondary' | 'tertiary', substrate: M.Doc, given: M.Doc, answer: Mechanism, steps: number[],
 *   choices?: {reaction: Reaction, text: string}[]}} Item
 *   reagent: as the title writes it (HBr, H₂O (H₂SO₄), 1) O₃ 2) Zn, H₃O⁺); x: the halogen of HX; substrate: the
 *   alkene as the nomenclature drew it; given: the drawing the student starts from; steps: the steps whose arrows are asked; choices: the conditions to
 *   choose from (Réactifs)
 */

export const REACTIONS = /** @type {Reaction[]} */ (['hx', 'hydration', 'halogenation', 'hydroboration', 'hydrogenation', 'dihydroxylation', 'epoxidation', 'ozonolysis', 'cleavage']);
/** The reactions whose mechanism is learnt; the others go without one. */
const MECHANISMS = ['hx', 'hydration', 'halogenation'];
export const STYLES = ['progressive', 'arrows', 'structures', 'complete', 'product', 'reagents', 'substrate'];
/** The styles of a reaction: those of a mechanism, or the product, the conditions and the substrate of a global reaction. @param {string} reaction */
export const stylesOf = (reaction) => (MECHANISMS.includes(reaction) ? STYLES.slice(0, 5) : ['progressive', 'product', 'reagents', 'substrate']);
/** A level is a reaction and one of its styles: hx-progressive, hydration-arrows, ozonolysis-substrate… */
export const LEVELS = REACTIONS.flatMap((r) => stylesOf(r).map((s) => `${r}-${s}`));
const PROGRESSIVE = /** @type {Style[]} */ (['arrows', 'arrows', 'arrows', 'structures', 'structures', 'structures', 'complete', 'complete', 'product', 'product']);
const PLAIN_PROGRESSIVE = /** @type {Style[]} */ ([...Array(4).fill('product'), ...Array(3).fill('reagents'), ...Array(3).fill('substrate')]);
const HALIDES = ['Br', 'Cl', 'Br', 'I'];
const HALOGENS = ['Br', 'Cl']; // X₂ (figure 7.22): F₂ too violent, I₂ does not add
// The lone pairs of a neutral atom of a product, as a mechanism draws them.
const PAIRS = /** @type {Record<string, number>} */ ({ O: 2, F: 3, Cl: 3, Br: 3, I: 3 });
const L = 40;
const GAP = 30; // between a molecule and a + or a reaction arrow
const ARROW = 70;

/** One more bond out of a point, in the free direction among the given ones. @param {{x: number, y: number}} p @param {{x: number, y: number}[]} others */
const beyond = (p, others) => add(p, fromAngle(nextBondAngle(others.map((o) => angleOf(sub(o, p)))), L));

/**
 * What an electrophile does to an alkene (reactions.js), or null when the textbook would not decide, with where
 * the group goes on the carbon that becomes C⁺ (x), for an oxonium where its two H go (hs, null without room),
 * and where the bridge of a bromonium ion goes (top). Also left out: a group on top of another atom.
 * @param {M.Doc} d @param {Reaction} reaction
 */
function addition(d, reaction) {
  const a = sides(d, reaction);
  if (!a) return null;
  const free = (/** @type {{x: number, y: number}} */ pt) => d.atoms.every((t) => Math.hypot(t.x - pt.x, t.y - pt.y) >= 0.75 * L);
  const x = beyond(a.c, M.neighbors(d, a.c.id).map((n) => /** @type {M.Atom} */ (M.findAtom(d, n))));
  const top = apex(d, a.h, a.c);
  // A global reaction checks its own products (drawPlain).
  if (MECHANISMS.includes(reaction) && !free(x)) return null;
  if (reaction === 'halogenation' && !free(top)) return null;
  const h1 = beyond(x, [a.c]), h2 = beyond(x, [a.c, h1]);
  return { ...a, x, top, hs: free(h1) && free(h2) ? [h1, h2] : null };
}

/** Whether two atoms of a molecule stand on top of each other (closer than 3/4 of a bond). @param {M.Doc} out */
function crowded(out) {
  const of = new Map(parts(out, out.atoms.map((t) => t.id)).flatMap((m, k) => m.ids.map((id) => [id, k])));
  return out.atoms.some((p, i) => out.atoms.slice(i + 1).some((q) => of.get(p.id) === of.get(q.id) && Math.hypot(p.x - q.x, p.y - q.y) < 0.75 * L));
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
     * The alkene at the current place: as it is, as the carbocation, single-bonded with a group on that carbon
     * (X; the OH of an alcohol; the O⁺ of an oxonium with its two H drawn), or bridged by X⁺ (a bromonium ion).
     * @param {{cation?: boolean, group?: {el: string, charge: number, pairs: number, hs?: boolean}, bridge?: string}} [o]
     */
    alkene({ cation = false, group, bridge } = {}) {
      const at = turn(a.x), hs = group?.hs && a.hs ? a.hs.map(turn) : [], top = turn(a.top);
      const pts = [...d.atoms.map(turn), ...(group ? [at, ...hs] : []), ...(bridge ? [top] : [])];
      const shift = left - Math.min(...pts.map((p) => p.x));
      /** @param {{x: number, y: number}} p */
      const place = (p) => put(p.x + shift, p.y - midY);
      const ids = new Map(d.atoms.map((t) => [t.id, b.atom(t.element, ...place(turn(t)), cation && t.id === a.c.id ? 1 : 0)]));
      const bonds = new Map(d.bonds.map((bd) => [bd.id, b.bond(/** @type {{id: string}} */ (ids.get(bd.a)), /** @type {{id: string}} */ (ids.get(bd.b)), cation || group || bridge ? 1 : bd.order)]));
      const atom = (/** @type {string} */ id) => /** @type {{id: string}} */ (ids.get(id));
      /** @type {{g: {id: string}, hs: {h: {id: string}, bond: string, x: number}[]} | null} */
      let on = null;
      if (group) {
        const g = b.atom(group.el, ...place(at), group.charge, group.pairs);
        b.bond(atom(a.c.id), g);
        on = { g, hs: hs.map((p) => { const h = b.atom('H', ...place(p)); return { h, bond: b.bond(h, g), x: p.x + shift }; }) };
      }
      // The bridge: X⁺ with two lone pairs; the bond to the more substituted carbon is the one that opens.
      /** @type {{g: {id: string}, opens: string} | null} */
      let ring = null;
      if (bridge) {
        const g = b.atom(bridge, ...place(top), 1, 2);
        b.bond(atom(a.h.id), g);
        ring = { g, opens: b.bond(atom(a.c.id), g) };
      }
      left = Math.max(...pts.map((p) => p.x)) + shift;
      return { atom: (/** @type {string} */ id) => atom(id).id, bonds, on, ring };
    },
    plus() { left += GAP; b.plus(left); left += GAP; },
    /** H–X with its three lone pairs. @param {string} x */
    hx(x) { const h = b.atom('H', ...put(left)); const hal = b.atom(x, ...put(left + L), 0, 3); left += L; return { h, x: hal, bond: b.bond(h, hal) }; },
    /** X⁻ with its four lone pairs. @param {string} x */
    halide(x) { return b.atom(x, ...put(left), -1, 4); },
    /** X–X, each X with its three lone pairs; the nearer faces the alkene. @param {string} x */
    x2(x) { const near = b.atom(x, ...put(left), 0, 3); const far = b.atom(x, ...put(left + L), 0, 3); left += L; return { near, far, bond: b.bond(near, far) }; },
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
    /**
     * Any molecule of a drawing (the ids of its atoms) at the current place, turned as the alkene is: a product
     * drawn where reactions.js put it, with the lone pairs of its O and X as a mechanism draws them (pairs). A lone
     * O is H₂O, whose label reaches left.
     * @param {M.Doc} src @param {string[]} ids @param {boolean} [pairs]
     */
    molecule(src, ids, pairs = false) {
      const atoms = ids.map((id) => /** @type {M.Atom} */ (M.findAtom(src, id)));
      if (atoms.length === 1 && atoms[0].element === 'O') left += 12;
      const pts = atoms.map(turn);
      const shift = left - Math.min(...pts.map((p) => p.x));
      const made = new Map(atoms.map((t, i) => [t.id, b.atom(t.element, ...put(pts[i].x + shift, pts[i].y - midY), t.charge, pairs && !t.charge ? PAIRS[t.element] ?? 0 : 0)]));
      for (const bd of src.bonds) { const p = made.get(bd.a), q = made.get(bd.b); if (p && q) b.bond(p, q, bd.order); }
      left = Math.max(...pts.map((p) => p.x)) + shift;
    },
    /** A reaction arrow, long enough for what is written over and under it. @param {string} [above] @param {M.ReactionArrow['kind']} [kind] @param {string} [below] */
    step(above = '', kind = 'forward', below = '') {
      const long = Math.max(ARROW, ...[above, below].map((t) => textWidth(t, STYLE.small) + 16));
      left += GAP; b.step(left, left + long, above, below); kinds.push(kind); left += long + GAP;
    },
    turn,
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

/**
 * X₂ as the textbook draws it (figures 7.23 and 7.24): alkene + X–X, polarised by induction (δ+ on the nearer X),
 * → bromonium (or chloronium) ion + X⁻, → vicinal dihalide; five curved arrows (π to the nearer X; X–X to the
 * farther; a lone pair of the nearer X closing the bridge on the other carbon, either one; X⁻ opening it on the
 * more substituted carbon; that C–X⁺ bond to X⁺). Short: the reactants, CH₂Cl₂ over the arrow (figure 7.25), the
 * product. Null when the product would stand on itself.
 * @param {M.Doc} d @param {Addition} a @param {string} x @param {boolean} short @returns {Mechanism | null}
 */
function drawHalogen(d, a, x, short) {
  const out = /** @type {M.Doc} */ (outcome(d, 'halogenation', x));
  if (crowded(out)) return null;
  const p = pen(d, a);
  const alkene = p.alkene();
  p.plus();
  const x2 = p.x2(x);
  p.step(short ? fr.mechanism.conditions.halogenation[0][1] : '');
  if (!short) {
    const ion = p.alkene({ bridge: x });
    p.plus();
    const halide = p.halide(x);
    p.step();
    const ring = /** @type {{g: {id: string}, opens: string}} */ (ion.ring);
    p.b.arrow({ bond: /** @type {string} */ (alkene.bonds.get(a.pi.id)) }, { atom: x2.near.id });
    p.b.arrow({ bond: x2.bond }, { atom: x2.far.id });
    p.b.arrow({ mark: x2.near.lp[0] }, { atom: alkene.atom(a.c.id) });
    p.b.arrow({ mark: halide.lp[0] }, { atom: ion.atom(a.c.id) });
    p.b.arrow({ bond: ring.opens }, { atom: ring.g.id });
  }
  p.molecule(out, out.atoms.map((t) => t.id), true);
  const doc = p.done();
  // The dipole induced in X–X (figure 7.23), below as for H–X; drawn, not asked.
  M.addMark(doc, x2.near.id, 'partial', { value: 'δ+', angle: 225 });
  M.addMark(doc, x2.far.id, 'partial', { value: 'δ−', angle: 315 });
  if (short) return mechanism(doc, [], null);
  return mechanism(doc, ['pi', 'leaving', 'bridge', 'open', 'leaving'], null, { 2: [alkene.atom(a.h.id)] });
}

/**
 * A reaction whose mechanism the course leaves out, as its global reaction: the alkene, the conditions over and
 * under the arrow as the textbook writes them, the products that reactions.js makes, left to right with + between.
 * Null when two atoms of a product would stand on top of each other.
 * @param {M.Doc} d @param {Addition} a @param {Reaction} reaction @param {string[]} conditions over and under
 * @returns {Mechanism | null}
 */
function drawPlain(d, a, reaction, [above, below]) {
  const out = /** @type {M.Doc} */ (outcome(d, reaction));
  if (crowded(out)) return null;
  const molecules = parts(out, out.atoms.map((t) => t.id)).map((m) => m.ids);
  const p = pen(d, a);
  p.alkene();
  p.step(above, 'forward', below);
  const leftmost = (/** @type {string[]} */ ids) => Math.min(...ids.map((id) => p.turn(/** @type {M.Atom} */ (M.findAtom(out, id))).x));
  molecules.sort((u, v) => leftmost(u) - leftmost(v)).forEach((ids, k) => { if (k) p.plus(); p.molecule(out, ids); });
  return mechanism(p.done(), [], null);
}

/** Conditions over and under an arrow as a title writes them: « 1) BH₃ 2) H₂O₂, OH⁻ », « H₂, Pt ». @param {string[]} conditions */
const written = (conditions) => conditions.filter(Boolean).join(conditions[0].startsWith('1)') ? ' ' : ', ');

/**
 * The four conditions of a Réactifs item: the reaction's, and those of three other reactions of the table that give
 * something else on this alkene (never two ways to the same products); the right one in a place that changes with k.
 * @param {M.Doc} d @param {Reaction} reaction @param {string} text its conditions
 * @param {import('../naming/graph.js').Graph[]} products @param {number} k
 */
function choose(d, reaction, text, products, k) {
  const gives = (/** @type {string} */ r) => { const out = outcome(d, r); return out && parts(out, out.atoms.map((t) => t.id)).map((m) => m.g); };
  const others = REACTIONS.filter((r) => { const g = r !== reaction && gives(r); return !!g && !sameSet(g, products); });
  const start = k % others.length;
  const list = [...others.slice(start), ...others.slice(0, start)].slice(0, 3)
    .map((r) => ({ reaction: r, text: written(/** @type {Record<string, string[][]>} */ (fr.mechanism.conditions)[r][0]) }));
  list.splice(k % 4, 0, { reaction, text });
  return list;
}

/**
 * The drawing with its arrows' roles, the C–H bond the π arrow forms, and the other atoms an arrow may go to
 * (by the arrow's place).
 * @param {M.Doc} doc @param {string[]} roles @param {[string, string] | null} ch @param {Record<number, string[]>} [either]
 */
const mechanism = (doc, roles, ch, either = {}) => ({
  doc, roles: Object.fromEntries(doc.curvedArrows.map((c, i) => [c.id, roles[i]])), forms: ch ? { [doc.curvedArrows[0].id]: ch } : {},
  either: Object.fromEntries(Object.entries(either).map(([i, ids]) => [doc.curvedArrows[Number(i)].id, ids])),
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
  const plain = !MECHANISMS.includes(reaction);
  /** @type {Item[]} */
  const items = [];
  const seen = new Set();
  for (let chunk = 0; items.length < count; chunk++) {
    if (chunk > 50) throw new Error(`mechanism: no ${level} after ${chunk} chunks`);
    for (const { doc: d, name } of namingSeries('alkenes', seed * 53 + chunk, 10).items) {
      if (items.length >= count || seen.has(name) || d.atoms.filter((t) => t.element === 'C').length > 8) continue;
      const a = addition(d, reaction);
      // An oxonium needs room for its two H. X⁻ opens the bridge on the more substituted carbon: two carbons
      // with as many H, but different, would leave it to chance (as hydroboration's tie says).
      if (!a || (reaction === 'hydration' && !a.hs) || (reaction === 'halogenation' && !sides(d, 'hydroboration'))) continue;
      const i = items.length;
      const style = chosen !== 'progressive' ? /** @type {Style} */ (chosen) : plain ? PLAIN_PROGRESSIVE[i % 10] : PROGRESSIVE[i % 10];
      const x = reaction === 'hx' ? HALIDES[(seed + i) % HALIDES.length] : reaction === 'halogenation' ? HALOGENS[(seed + i) % 2] : '';
      const ways = /** @type {Record<string, string[][]>} */ (fr.mechanism.conditions)[reaction] ?? [];
      const conditions = ways[(seed + i) % (ways.length || 1)];
      const short = style === 'product';
      const answer = plain ? drawPlain(d, a, reaction, conditions) : reaction === 'hx' ? drawHX(d, a, x, short)
        : reaction === 'hydration' ? drawHydration(d, a, short) : drawHalogen(d, a, x, short);
      if (!answer) continue;
      seen.add(name);
      const n = answer.doc.reactionArrows.length;
      const later = [...Array(n).keys()].map((k) => k + 1);
      // What each style takes away: the curved arrows, the states after the reactants, the product or the alkene.
      const [states, keep] = /** @type {[number[], number[]]} */ ({ arrows: [[], []], structures: [later, [1]], complete: [later, []], product: [[1], []], reagents: [[], []], substrate: [[0], []] }[style]);
      const given = hide(answer.doc, states, keep);
      // Réactifs: the whole reaction, a « ? » over its arrow.
      if (style === 'reagents') Object.assign(given.reactionArrows[0], { above: '?', below: '' });
      const last = M.regions(answer.doc).states[n];
      // A mechanism names its organic product; a global reaction all its products, as the messages call them.
      const organic = M.component(answer.doc, /** @type {string} */ (last.find((id) => M.findAtom(answer.doc, id)?.element === 'C')));
      const product = plain ? named(answer.doc, last) : nameOf(toGraph(answer.doc, organic)).name;
      const reagent = plain ? written(conditions) : reaction === 'hx' ? `H${x}` : reaction === 'halogenation' ? `${x}₂` : fr.mechanism.water;
      const choices = style === 'reagents' ? choose(d, reaction, reagent, parts(answer.doc, last).map((m) => m.g), seed + i) : undefined;
      items.push({ reaction, style, alkene: name, reagent, x, product, cation: a.cation, substrate: d, given, answer, steps: style === 'arrows' || style === 'complete' ? later : [], choices });
    }
  }
  return { level, seed, items };
}
