// @ts-check
import * as M from '../model.js';
import { isomorphisms, sameMolecule, toGraph } from '../naming/graph.js';
import { NamingError, nameOf } from '../naming/namer.js';

/**
 * Checks a drawn mechanism against the expected one (SPEC, Exercices de mécanisme). Both are drawings:
 * states (reactants, intermediates, products) between reaction arrows, and curved arrows leaving the
 * electrons of a state. They are compared on graphs (atoms, bonds, charges), never on coordinates, as
 * the nomenclature drawings are; a lone pair counts only as where an arrow starts.
 * @typedef {import('../model.js').Doc} Doc
 * @typedef {import('../model.js').CurvedArrow} CurvedArrow
 * @typedef {import('../naming/graph.js').Graph} Graph
 * @typedef {{doc: Doc, roles: Record<string, string>, forms?: Record<string, [string, string]>}} Mechanism
 *   roles: what each expected curved arrow does (pi, leaving, attack); forms: the bond an arrow drawn to an atom
 *   forms, where it matters (π drawn to the H, as in the textbooks, forms the C–H bond on the carbon with more H)
 * @typedef {{code: string, at: 'state' | 'step', step: number, role?: string, ids: string[], params: Record<string, string | number>}} Finding
 *   at, step: a species' state (0: the reactants) or an arrow's step (1: the first); ids: what to outline
 * @typedef {{kind: 'pair' | 'bond' | 'atom' | 'new', atoms: string[]}} End where an arrow starts or ends, in the expected
 *   drawing's atoms: a lone pair on an atom, a bond, an atom, or a bond being formed
 * @typedef {{from: End, to: End}} Move
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
function parts(doc, ids) {
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
      : formula(d.g) === formula(e.g) ? 'antiMarkovnikov' : 'otherSpecies';
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

/** How a species is called in a message: HBr, Br⁻, H₂O, H₃O⁺, or its name; nothing when the namer cannot name it (a carbocation). @param {Graph} g */
function label(g) {
  if (g.atoms.length === 1) {
    const { el, charge: c } = g.atoms[0];
    return ALONE[el]?.[c] ?? `${el}${c < 0 ? '⁻' : c > 0 ? '⁺' : ''}`;
  }
  try { return nameOf(g).name; } catch (e) { if (e instanceof NamingError) return ''; throw e; }
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
    return { c, move: { from: end(answer.doc, c.from, own), to: formed ? { kind: /** @type {const} */ ('new'), atoms: formed.map(own).sort() } : end(answer.doc, c.to, own) } };
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
 * the atom that receives them (HBr, H₃O⁺) and that atom's element (Br, O).
 * @param {Doc} doc @param {CurvedArrow} c
 */
function said(doc, c) {
  const from = atomsOf(doc, c.from), to = atomsOf(doc, c.to);
  const atom = to.find((a) => !from.includes(a)) ?? to[0];
  return { source: speciesOf(doc, from[0]), target: speciesOf(doc, atom), el: M.findAtom(doc, atom)?.element ?? '' };
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
