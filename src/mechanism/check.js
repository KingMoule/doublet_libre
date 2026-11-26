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
  // The halogen of H–X, for the messages (HBr, Br⁻).
  const x = answer.doc.atoms.find((a) => HALOGENS.includes(a.element))?.element ?? '';
  /** @type {Finding[]} */
  const out = [];
  for (let k = 0; k <= n; k++) {
    const { found, maps } = species(doc, got.states[k], answer.doc, want.states[k], k);
    out.push(...found);
    if (k < n && (!steps || steps.includes(k + 1))) out.push(...arrows(doc, got.states[k], answer, want.states[k], maps, k + 1));
  }
  return out.map((f) => ({ ...f, params: { x, ...f.params } }));
}

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
    found.push({ code, at: 'state', step: k, ids: d.ids, params: { name: label(d.g) } });
  }
  for (const d of drawn) found.push({ code: 'extraSpecies', at: 'state', step: k, ids: d.ids, params: {} });
  return { found, maps };
}

/** How a species is called in a message: Br⁻, HBr, or its name; nothing when the namer cannot name it (a carbocation). @param {Graph} g */
function label(g) {
  if (g.atoms.length === 1) {
    const { el, charge: c } = g.atoms[0];
    return c < 0 ? `${el}⁻` : c > 0 ? `${el}⁺` : HALOGENS.includes(el) ? `H${el}` : el;
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
 * The drawn atoms matched to the expected ones, in every way a symmetric molecule allows (at most 200),
 * each explicit H following the atom it is bonded to.
 * @param {Doc} doc @param {Doc} ans @param {{from: string[], to: string[], isos: number[][]}[]} maps @returns {Generator<Map<string, string>>}
 */
function* mappings(doc, ans, maps) {
  let count = 0;
  /** @param {number} k @param {Map<string, string>} map @returns {Generator<Map<string, string>>} */
  function* walk(k, map) {
    if (count >= 200) return;
    if (k === maps.length) { count++; yield withHydrogens(doc, ans, map); return; }
    const { from, to, isos } = maps[k];
    for (const iso of isos) yield* walk(k + 1, new Map([...map, ...from.map((id, i) => /** @type {[string, string]} */ ([id, to[iso[i]]]))]));
  }
  yield* walk(0, new Map());
}

/** @param {Doc} doc @param {Doc} ans @param {Map<string, string>} map */
function withHydrogens(doc, ans, map) {
  const used = new Set();
  for (const h of doc.atoms.filter((a) => a.element === 'H')) {
    const [n] = M.neighbors(doc, h.id);
    const target = n ? map.get(n) : undefined;
    const twin = target && M.neighbors(ans, target).find((y) => M.findAtom(ans, y)?.element === 'H' && !used.has(y));
    if (twin) { used.add(twin); map.set(h.id, twin); }
  }
  return map;
}

/**
 * The arrows of a step: each expected one is looked for among the drawn ones by the electrons it moves.
 * A symmetric molecule matches in several ways; the one that leaves the least to say is kept.
 * @param {Doc} doc @param {string[]} ids @param {Mechanism} answer @param {string[]} wantIds
 * @param {{from: string[], to: string[], isos: number[][]}[]} maps @param {number} step
 */
function arrows(doc, ids, answer, wantIds, maps, step) {
  const from = (/** @type {Doc} */ d, /** @type {string[]} */ state) => d.curvedArrows.filter((c) => atomsOf(d, c.from).some((a) => state.includes(a)));
  const drawn = from(doc, ids), expected = from(answer.doc, wantIds);
  /** @type {Finding[] | null} */
  let best = null;
  for (const map of mappings(doc, answer.doc, maps)) {
    const id = (/** @type {string} */ a) => map.get(a) ?? `?${a}`;
    const formed = (/** @type {CurvedArrow} */ c) => answer.forms?.[c.id];
    const want = expected.map((c) => ({ c, move: { from: end(answer.doc, c.from, (a) => a), to: formed(c) ? { kind: /** @type {const} */ ('new'), atoms: [...formed(c) ?? []].sort() } : end(answer.doc, c.to, (a) => a) } }));
    const found = compare(drawn.map((c) => ({ c, move: { from: end(doc, c.from, id), to: end(doc, c.to, id) } })), want, answer.roles, step);
    if (!best || found.length < best.length) best = found;
    if (!best.length) break;
  }
  return best ?? [];
}

/**
 * Drawn arrows against the expected ones: first those drawn right (a half arrow said so), then for each one
 * missing, an arrow from its electrons to the wrong place, one the other way round, or none; what is left is too many.
 * @param {{c: CurvedArrow, move: Move}[]} drawn @param {{c: CurvedArrow, move: Move}[]} expected
 * @param {Record<string, string>} roles @param {number} step @returns {Finding[]}
 */
function compare(drawn, expected, roles, step) {
  /** @type {Finding[]} */
  const found = [];
  const left = [...drawn];
  const finding = (/** @type {string} */ code, /** @type {CurvedArrow} */ e, /** @type {CurvedArrow} [s] */ s) => found.push({ code, at: 'step', step, role: roles[e.id], ids: s ? [s.id] : [], params: {} });
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
