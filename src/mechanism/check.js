// @ts-check
import * as M from '../model.js';
import { isomorphisms, sameMolecule, toGraph } from '../naming/graph.js';
import { NamingError, nameOf } from '../naming/namer.js';
import { fr } from '../i18n/fr.js';

/**
 * Checks a drawn mechanism against the expected one (SPEC, Exercices de mécanisme). Both are drawings:
 * states (reactants, intermediates, products) between reaction arrows, and curved arrows leaving the
 * electrons of a state. They are compared on graphs (atoms, bonds, charges), never on coordinates, as
 * the nomenclature drawings are; a lone pair counts only as where an arrow starts.
 * @typedef {import('../model.js').Doc} Doc
 * @typedef {import('../model.js').CurvedArrow} CurvedArrow
 * @typedef {import('../naming/graph.js').Graph} Graph
 * @typedef {{doc: Doc, roles: Record<string, string>, forms?: Record<string, [string, string]>, either?: Record<string, string[]>}} Mechanism
 *   roles: what each expected curved arrow does (pi, leaving, attack); forms: the bond an arrow drawn to an atom
 *   forms, where it matters (π drawn to the H, as in the textbooks, forms the C–H bond on the carbon with more H);
 *   either: other atoms an arrow may go to as well (the bridge of a bromonium ion closes on either carbon)
 * @typedef {{code: string, at: 'state' | 'step', step: number, role?: string, ids: string[], params: Record<string, string | number>}} Finding
 *   at, step: a species' state (0: the reactants) or an arrow's step (1: the first); ids: what to outline
 * @typedef {{kind: 'pair' | 'bond' | 'atom' | 'new', atoms: string[]}} End where an arrow starts or ends, in the expected
 *   drawing's atoms: a lone pair on an atom, a bond, an atom, or a bond being formed
 * @typedef {{from: End, to: End, also?: End[]}} Move also: other ends as right as `to`
 */

const HALOGENS = ['F', 'Cl', 'Br', 'I'];

/**
 * What is wrong with a drawn mechanism, state by state, each state before the arrows leaving it; nothing when it is right.
 * @param {Doc} doc @param {Mechanism} answer @param {number[]} [steps] the steps whose arrows are asked (all of them by default)
 * @returns {Finding[]}
 */
export function checkMechanism(doc, answer, steps) {
  const got = M.regions(doc), want = M.regions(answer.doc);
  const n = want.arrows.length;
  if (got.arrows.length !== n) return [{ code: 'steps', at: 'state', step: 0, ids: got.arrows.map((r) => r.id), params: { n } }];
  /** @type {Finding[]} */
  const out = [];
  for (let k = 0; k <= n; k++) {
    const { found, maps } = species(doc, got.states[k], answer.doc, want.states[k], k);
    out.push(...found);
    if (k < n && (!steps || steps.includes(k + 1))) out.push(...arrows(doc, got.states[k], answer, want.states[k], maps, k + 1));
  }
  return out;
}

/** The species an atom belongs to, by its name (HBr, Br⁻, H₂O, H₃O⁺, an alkene's). @param {Doc} doc @param {string} id */
const speciesOf = (doc, id) => label(toGraph(doc, M.component(doc, id)));

// ---------- species ----------

/** The molecules and ions of a state: its atoms grouped by bonds, each as a graph (H left out). @param {Doc} doc @param {string[]} ids */
export function parts(doc, ids) {
  const left = new Set(ids);
  /** @type {{ids: string[], g: Graph}[]} */
  const out = [];
  for (const id of ids) {
    if (!left.has(id)) continue;
    const group = [...M.component(doc, id)].filter((a) => left.has(a));
    group.forEach((a) => left.delete(a));
    const g = toGraph(doc, group);
    if (g.atoms.length) out.push({ ids: group, g });
  }
  return out;
}

/** Whether two lists of molecules are the same, whatever their order. @param {Graph[]} gs @param {Graph[]} hs */
export const sameSet = (gs, hs) => { const left = [...hs]; return gs.length === hs.length && gs.every((g) => { const i = left.findIndex((h) => sameMolecule(g, h)); return i >= 0 && left.splice(i, 1).length; }); };
const charge = (/** @type {Graph} */ g) => g.atoms.reduce((s, a) => s + a.charge, 0);
const formula = (/** @type {Graph} */ g) => `${g.atoms.map((a) => a.el).sort().join('')}${charge(g)}`;
const skeleton = (/** @type {Graph} */ g) => ({ ...g, atoms: g.atoms.map((a) => ({ ...a, charge: 0 })) });
/** @param {Generator<number[]>} gen @param {number} n */
const take = (gen, n) => { const out = []; for (const x of gen) { out.push(x); if (out.length >= n) break; } return out; };

/**
 * Pairs the drawn species of a state with the expected ones. What is left is told apart: the same atoms
 * with a charge elsewhere (the + on the wrong carbon) or missing, an isomer (the anti-Markovnikov product),
 * another species, a species missing or one too many. maps: for each pair, the matches of its atoms.
 * @param {Doc} doc @param {string[]} ids @param {Doc} ans @param {string[]} wantIds @param {number} k
 */
function species(doc, ids, ans, wantIds, k) {
  const drawn = parts(doc, ids);
  /** @type {{from: string[], to: string[], isos: number[][]}[]} */
  const maps = [];
  /** @type {Finding[]} */
  const found = [];
  const missing = parts(ans, wantIds).filter((e) => {
    const d = drawn.find((x) => sameMolecule(x.g, e.g));
    if (!d) return true;
    drawn.splice(drawn.indexOf(d), 1);
    maps.push({ from: /** @type {string[]} */ (d.g.ids), to: /** @type {string[]} */ (e.g.ids), isos: take(isomorphisms(d.g, e.g), 24) });
    return false;
  });
  for (const e of missing) {
    const d = drawn.find((x) => sameMolecule(skeleton(x.g), skeleton(e.g))) ?? drawn.find((x) => formula(x.g) === formula(e.g)) ?? drawn[0];
    if (!d) { found.push({ code: 'missingSpecies', at: 'state', step: k, ids: [], params: { name: label(e.g) } }); continue; }
    drawn.splice(drawn.indexOf(d), 1);
    const code = sameMolecule(skeleton(d.g), skeleton(e.g)) ? (charge(d.g) === charge(e.g) ? 'cationPosition' : 'charge')
      : formula(d.g) === formula(e.g) ? 'isomer' : 'otherSpecies';
    // What the expected species says: its charged atom (C+, O+, Br-) and the group a product carries (Br, O).
    const charged = e.g.atoms.find((a) => a.charge);
    const params = { name: label(d.g), charged: charged ? `${charged.el}${charged.charge > 0 ? '+' : '-'}` : '', group: e.g.atoms.find((a) => a.el !== 'C')?.el ?? '' };
    found.push({ code, at: 'state', step: k, ids: d.ids, params });
  }
  for (const d of drawn) found.push({ code: 'extraSpecies', at: 'state', step: k, ids: d.ids, params: {} });
  return { found, maps };
}

/** A lone halogen or oxygen by what it is with its H: HBr, Br⁻, H₂O, H₃O⁺, HO⁻. */
const ALONE = /** @type {Record<string, Record<number, string>>} */ ({
  O: { [-1]: 'HO⁻', 0: 'H₂O', 1: 'H₃O⁺' },
  ...Object.fromEntries(HALOGENS.map((x) => [x, { [-1]: `${x}⁻`, 0: `H${x}` }])),
});

/**
 * How a species is called in a message: HBr, Br⁻, H₂O, H₃O⁺, CO₂, or its name; what it is when the namer leaves it
 * out (an acid, an oxirane); nothing for the rest (a carbocation).
 * @param {Graph} g
 */
export function label(g) {
  if (g.atoms.length === 1) {
    const { el, charge: c } = g.atoms[0];
    return ALONE[el]?.[c] ?? `${el}${c < 0 ? '⁻' : c > 0 ? '⁺' : ''}`;
  }
  if (formula(g) === 'COO0') return 'CO₂';
  if (g.atoms.length === 2 && g.atoms[0].el === g.atoms[1].el && HALOGENS.includes(g.atoms[0].el) && !charge(g)) return `${g.atoms[0].el}₂`;
  try { return nameOf(g).name; } catch (e) { if (e instanceof NamingError) return fr.mechanism.kinds[/** @type {'acid'} */ (kind(g))] ?? ''; throw e; }
}

/**
 * The molecules of a drawing as a message names them, CO₂ and H₂O last: « un acide carboxylique + CO₂ + H₂O ».
 * @param {Doc} doc @param {string[]} [ids] the atoms to name, all by default
 */
export function named(doc, ids = doc.atoms.map((a) => a.id)) {
  const all = parts(doc, ids).map((p) => label(p.g)).filter(Boolean);
  const small = (/** @type {string} */ n) => n === 'CO₂' || n === 'H₂O';
  return [...all.filter((n) => !small(n)), ...all.filter(small)].join(' + ');
}

/**
 * What a molecule the namer leaves out is: an acid (a C with =O and an OH), an oxirane (an O bonded to two bonded C),
 * a bridged ion (Br⁺ in its place).
 * @param {Graph} g
 */
function kind(g) {
  const bonds = (/** @type {number} */ i) => g.bonds.filter((b) => b.a === i || b.b === i);
  const other = (/** @type {{a: number, b: number}} */ b, /** @type {number} */ i) => (b.a === i ? b.b : b.a);
  const isO = (/** @type {number} */ i) => g.atoms[i].el === 'O';
  if (g.atoms.some((a, i) => a.el === 'C' && bonds(i).some((b) => b.order === 2 && isO(other(b, i))) && bonds(i).some((b) => b.order === 1 && isO(other(b, i)) && bonds(other(b, i)).length === 1))) return 'acid';
  // An O, or a halogen with its + (a bromonium ion), bonded to two carbons bonded together: a ring of three.
  const ring = (/** @type {(a: {el: string, charge: number}) => boolean} */ f) => g.atoms.some((a, i) => {
    const cs = bonds(i).map((b) => other(b, i));
    return f(a) && cs.length === 2 && g.bonds.some((b) => [b.a, b.b].sort().join() === [...cs].sort().join());
  });
  if (ring((a) => a.el === 'O' && !a.charge)) return 'oxirane';
  if (ring((a) => HALOGENS.includes(a.el) && a.charge === 1)) return 'bridged';
  return '';
}

/**
 * A start drawn for products (the Substrat style): one alkene before the reaction arrow, which the reaction turns
 * into the products after it, whichever alkene it is. made: the reaction applied to a drawing, null when the
 * textbook would not decide (reactions.js outcome).
 * @param {Doc} doc @param {Mechanism} answer @param {(d: Doc) => Doc | null} made @returns {Finding[]}
 */
export function checkSubstrate(doc, answer, made) {
  const got = M.regions(doc), want = M.regions(answer.doc);
  if (got.arrows.length !== want.arrows.length) return [{ code: 'steps', at: 'state', step: 0, ids: got.arrows.map((r) => r.id), params: { n: want.arrows.length } }];
  const drawn = parts(doc, got.states[0]);
  const ids = drawn.flatMap((d) => d.ids);
  const pis = drawn[0]?.g.bonds.filter((b) => b.order > 1 && drawn[0].g.atoms[b.a].el === 'C' && drawn[0].g.atoms[b.b].el === 'C') ?? [];
  if (drawn.length !== 1 || pis.length !== 1 || pis[0].order !== 2) return [{ code: 'noAlkene', at: 'state', step: 0, ids, params: {} }];
  const alkene = structuredClone(doc);
  alkene.atoms = alkene.atoms.filter((a) => ids.includes(a.id) || (a.element === 'H' && M.neighbors(doc, a.id).some((n) => ids.includes(n))));
  alkene.bonds = alkene.bonds.filter((b) => alkene.atoms.some((a) => a.id === b.a) && alkene.atoms.some((a) => a.id === b.b));
  const out = made(alkene);
  if (!out) return [{ code: 'undecided', at: 'state', step: 0, ids, params: {} }];
  const gave = parts(out, out.atoms.map((a) => a.id)).map((p) => p.g);
  if (sameSet(gave, parts(answer.doc, want.states[want.arrows.length]).map((p) => p.g))) return [];
  return [{ code: 'otherAlkene', at: 'state', step: 0, ids, params: { names: named(out) } }];
}

// ---------- curved arrows ----------

/** The atoms an anchor rests on. @param {Doc} doc @param {import('../model.js').Anchor} an */
export function atomsOf(doc, an) {
  if ('mark' in an) return [doc.marks.find((m) => m.id === an.mark)?.atom ?? ''];
  if ('bond' in an) { const b = M.findBond(doc, an.bond); return b ? [b.a, b.b] : []; }
  if ('atom' in an) return [an.atom];
  return [...an.between];
}

/** Where an arrow starts or ends, its atoms named by id (the expected drawing's). @param {Doc} doc @param {import('../model.js').Anchor} an @param {(id: string) => string} id @returns {End} */
function end(doc, an, id) {
  const kind = 'mark' in an ? 'pair' : 'bond' in an ? 'bond' : 'atom' in an ? 'atom' : 'new';
  return { kind, atoms: atomsOf(doc, an).map(id).sort() };
}
const same = (/** @type {End} */ p, /** @type {End} */ q) => p.kind === q.kind && p.atoms.join() === q.atoms.join();

/**
 * Whether a drawn target is where the expected arrow goes: the same, or an atom standing for the bond it
 * forms with the electrons' atom (π to the H for the C–H bond, Br⁻ to the C⁺ for the C–Br bond).
 * @param {End} to @param {Move} e
 */
function fits(to, e) {
  if (e.also?.some((t) => fits(to, { from: e.from, to: t }))) return true;
  if (same(to, e.to)) return true;
  const formed = to.kind === 'new' ? to : e.to.kind === 'new' ? e.to : null;
  const atom = to.kind === 'atom' ? to : e.to.kind === 'atom' ? e.to : null;
  if (!formed || !atom) return false;
  const other = formed.atoms.find((a) => a !== atom.atoms[0]);
  return formed.atoms.includes(atom.atoms[0]) && !!other && e.from.atoms.includes(other);
}

/**
 * The drawn atoms matched to the expected ones, in every way a symmetric molecule allows (at most 200).
 * @param {{from: string[], to: string[], isos: number[][]}[]} maps @returns {Generator<Map<string, string>>}
 */
function* mappings(maps) {
  let count = 0;
  /** @param {number} k @param {Map<string, string>} map @returns {Generator<Map<string, string>>} */
  function* walk(k, map) {
    if (count >= 200) return;
    if (k === maps.length) { count++; yield map; return; }
    const { from, to, isos } = maps[k];
    for (const iso of isos) yield* walk(k + 1, new Map([...map, ...from.map((id, i) => /** @type {[string, string]} */ ([id, to[iso[i]]]))]));
  }
  yield* walk(0, new Map());
}

/**
 * Atoms named as the expected drawing names them: an H by the atom it hangs on, so that any H of H₃O⁺ or of
 * an oxonium is the same; any other atom by its match.
 * @param {Doc} doc @param {(id: string) => string} match
 */
const naming = (doc, match) => (/** @type {string} */ a) => {
  if (M.findAtom(doc, a)?.element !== 'H') return match(a);
  const [n] = M.neighbors(doc, a);
  return `H@${n ? match(n) : `?${a}`}`;
};

/**
 * The arrows of a step: each expected one is looked for among the drawn ones by the electrons it moves.
 * A symmetric molecule matches in several ways; the one that leaves the least to say is kept.
 * @param {Doc} doc @param {string[]} ids @param {Mechanism} answer @param {string[]} wantIds
 * @param {{from: string[], to: string[], isos: number[][]}[]} maps @param {number} step
 */
function arrows(doc, ids, answer, wantIds, maps, step) {
  const from = (/** @type {Doc} */ d, /** @type {string[]} */ state) => d.curvedArrows.filter((c) => atomsOf(d, c.from).some((a) => state.includes(a)));
  const drawn = from(doc, ids), expected = from(answer.doc, wantIds);
  const own = naming(answer.doc, (a) => a);
  const want = expected.map((c) => {
    const formed = answer.forms?.[c.id];
    const also = answer.either?.[c.id]?.map((a) => ({ kind: /** @type {const} */ ('atom'), atoms: [own(a)] }));
    return { c, move: { from: end(answer.doc, c.from, own), to: formed ? { kind: /** @type {const} */ ('new'), atoms: formed.map(own).sort() } : end(answer.doc, c.to, own), also } };
  });
  /** @type {Finding[] | null} */
  let best = null;
  for (const map of mappings(maps)) {
    const id = naming(doc, (a) => map.get(a) ?? `?${a}`);
    const found = compare(drawn.map((c) => ({ c, move: { from: end(doc, c.from, id), to: end(doc, c.to, id) } })), want, answer.roles, step, (c) => said(answer.doc, c));
    if (!best || found.length < best.length) best = found;
    if (!best.length) break;
  }
  return best ?? [];
}

/**
 * What the messages say of an expected arrow: the species its electrons come from (Br⁻, H₂O), the species of
 * the atom that receives them (HBr, H₃O⁺), that atom's element (Br, O), and the bond it breaks, that atom last
 * (H–Br, Br–Br, C–Br).
 * @param {Doc} doc @param {CurvedArrow} c
 */
function said(doc, c) {
  const from = atomsOf(doc, c.from), to = atomsOf(doc, c.to);
  const atom = to.find((a) => !from.includes(a)) ?? to[0];
  const el = (/** @type {string} */ id) => M.findAtom(doc, id)?.element ?? '';
  const bond = 'bond' in c.from ? [...from.filter((a) => a !== atom), ...from.filter((a) => a === atom)].map(el).join('–') : '';
  return { source: speciesOf(doc, from[0]), target: speciesOf(doc, atom), el: el(atom), bond };
}

/**
 * Drawn arrows against the expected ones: first those drawn right (a half arrow said so), then for each one
 * missing, an arrow from its electrons to the wrong place, one the other way round, or none; what is left is too many.
 * @param {{c: CurvedArrow, move: Move}[]} drawn @param {{c: CurvedArrow, move: Move}[]} expected
 * @param {Record<string, string>} roles @param {number} step @param {(c: CurvedArrow) => Record<string, string>} params what a message says of an expected arrow
 * @returns {Finding[]}
 */
function compare(drawn, expected, roles, step, params) {
  /** @type {Finding[]} */
  const found = [];
  const left = [...drawn];
  const finding = (/** @type {string} */ code, /** @type {CurvedArrow} */ e, /** @type {CurvedArrow} [s] */ s) => found.push({ code, at: 'step', step, role: roles[e.id], ids: s ? [s.id] : [], params: params(e) });
  const take = (/** @type {(d: {c: CurvedArrow, move: Move}) => boolean} */ f) => { const i = left.findIndex(f); return i < 0 ? null : left.splice(i, 1)[0]; };
  const unmatched = expected.filter((e) => {
    const s = take((d) => same(d.move.from, e.move.from) && fits(d.move.to, e.move));
    if (s && s.c.electrons !== e.c.electrons) finding('halfArrow', e.c, s.c);
    return !s;
  });
  for (const e of unmatched) {
    const s = take((d) => same(d.move.from, e.move.from));
    if (s) {
      // The bond being formed on the wrong atom of the electrons' bond: the H on the wrong carbon of the C=C.
      const wrongEnd = s.move.to.kind === 'new' && e.move.to.kind === 'new' && s.move.to.atoms.some((a) => !e.move.from.atoms.includes(a) && e.move.to.atoms.includes(a));
      finding(wrongEnd && roles[e.c.id] === 'pi' ? 'markovnikovArrow' : 'wrongTarget', e.c, s.c);
      continue;
    }
    const r = take((d) => d.move.from.atoms.every((a) => e.move.to.atoms.includes(a)) && d.move.to.atoms.some((a) => e.move.from.atoms.includes(a)));
    finding(r ? 'reversed' : 'missingArrow', e.c, r?.c);
  }
  for (const d of left) found.push({ code: 'extraArrow', at: 'step', step, ids: [d.c.id], params: {} });
  return found;
}
