// @ts-check
import { fr } from '../i18n/fr.js';
import { adjacency } from './graph.js';

/**
 * Names a molecule by the rules of the course's textbook (Girouard, Marrano and Lapierre,
 * Chimie organique, 3e éd., ch. 2, section 2.5), even where IUPAC 2013 has changed them.
 * For now: alkanes, cycloalkanes and halogen compounds (2.5.1 to 2.5.3).
 * Outside that, or where the textbook does not decide, it throws a NamingError, and the
 * exercise generator draws another molecule.
 * @typedef {import('./graph.js').Graph} Graph
 * @typedef {{name: string, locants: number[]}} Prefix
 * @typedef {{name: string, parent: number[], ring: boolean, prefixes: Prefix[]}} Naming
 *   parent: the parent chain's atoms in numbering order; prefixes: in the order the name cites them
 */

export class NamingError extends Error {
  /** @param {'scope' | 'undecided'} reason */
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

const N = fr.naming;
const HALOGENS = ['F', 'Cl', 'Br', 'I'];
const scope = () => new NamingError('scope');

/** Alphabetical key of a prefix: no accents, no italic sec- or tert- (2.5.1, règle 3d). @param {string} name */
function sortKey(name) {
  const italic = N.italic.find((p) => name.startsWith(p));
  return (italic ? name.slice(italic.length) : name).normalize('NFD').replace(/[̀-ͯ]/g, '');
}
/** @param {string} a @param {string} b */
const alphabetical = (a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : a < b ? -1 : a > b ? 1 : 0);
/** Locants compared at the first point of difference, never added up (2.5.1, règle 2). @param {number[]} a @param {number[]} b */
function firstDifference(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}
const ascending = (/** @type {number[]} */ xs) => [...xs].sort((a, b) => a - b);

/**
 * The French name from its pieces. Locants are left out when they could only be 1: methane, a single
 * prefix on ethane or on a ring; prefixes are then written together.
 * @param {Prefix[]} prefixes in citation order @param {number} size carbons of the parent @param {boolean} ring
 */
export function spell(prefixes, size, ring) {
  const count = prefixes.reduce((s, p) => s + p.locants.length, 0);
  const omit = size === 1 || (count === 1 && (ring || size === 2));
  const words = prefixes.map(({ name, locants }) => {
    const mult = N.multipliers[locants.length];
    const word = mult + (mult && N.italic.some((p) => name.startsWith(p)) ? '-' : '') + name; // di-tert-butyl
    return omit ? word : `${locants.join(',')}-${word}`;
  });
  return words.join(omit ? '' : '-') + (ring ? N.cyclo : '') + N.stems[size - 1] + N.ane;
}

/**
 * What the naming works on: the ring (one at most) and every chain of carbons outside it.
 * @param {Graph} g
 */
function skeleton(g) {
  const adj = adjacency(g);
  const el = (/** @type {number} */ i) => g.atoms[i].el;
  const carbons = g.atoms.map((_, i) => i).filter((i) => el(i) === 'C');
  if (!carbons.length || g.bonds.some((b) => b.order !== 1)) throw scope();
  for (const [i, a] of g.atoms.entries()) {
    if (a.charge !== 0 || (a.el !== 'C' && !HALOGENS.includes(a.el))) throw scope();
    if (a.el !== 'C' && (adj[i].size !== 1 || el([...adj[i].keys()][0]) !== 'C')) throw scope();
  }
  const reached = new Set([0]);
  for (const q = [0]; q.length;) for (const j of adj[/** @type {number} */ (q.pop())].keys()) if (!reached.has(j)) { reached.add(j); q.push(j); }
  if (reached.size !== g.atoms.length) throw scope(); // two molecules

  // The ring: what is left of the carbon skeleton once its ends are pruned, one simple cycle at most.
  const cNext = (/** @type {number} */ i) => [...adj[i].keys()].filter((j) => el(j) === 'C');
  const core = new Set(carbons);
  for (let pruned = true; pruned;) {
    pruned = false;
    for (const i of core) if (cNext(i).filter((j) => core.has(j)).length <= 1) { core.delete(i); pruned = true; }
  }
  /** @type {number[]} */
  const ring = [];
  if (core.size) {
    for (let at = Math.min(...core), prev = -1; !ring.includes(at);) {
      ring.push(at);
      const next = cNext(at).filter((j) => core.has(j));
      if (next.length !== 2) throw scope(); // fused or bridged rings
      [prev, at] = [at, next[0] === prev ? next[1] : next[0]];
    }
    if (ring.length !== core.size) throw scope(); // two rings
  }

  // Chains: every path through the carbons outside the ring.
  /** @type {number[][]} */
  const chains = [];
  const walk = (/** @type {number[]} */ path) => {
    chains.push(path);
    for (const j of cNext(path[path.length - 1])) if (!core.has(j) && !path.includes(j)) walk([...path, j]);
  };
  for (const s of carbons) if (!core.has(s)) walk([s]);
  const longest = Math.max(0, ...chains.map((c) => c.length));
  const branches = (/** @type {number[]} */ c) => c.reduce((s, i) => s + [...adj[i].keys()].filter((j) => !c.includes(j)).length, 0);
  return { adj, core, ring, chains, longest, branches };
}

/** @param {Graph} g @returns {Naming} */
export function nameOf(g) {
  const { adj, core, ring, chains, longest, branches } = skeleton(g);
  // A ring is the parent when it is longer than any chain; the textbook does not decide a tie (2.5.2).
  if (ring.length && ring.length === longest) throw new NamingError('undecided');
  if (ring.length > longest) return numbered(g, adj, ring, true, core);
  // Otherwise the longest chain, and among those the most branched (2.5.1, règle 1).
  const long = chains.filter((c) => c.length === longest);
  const most = Math.max(...long.map(branches));
  const named = long.filter((c) => branches(c) === most).map((c) => numbered(g, adj, c, false, core));
  if (new Set(named.map((n) => n.name)).size > 1) throw new NamingError('undecided');
  return named[0];
}

/**
 * Names a student could write by breaking one rule of the textbook at a time, each with that rule
 * (a key of fr.naming.rules). The exercise compares a wrong answer with these to say which rule it breaks.
 * @param {Graph} g @returns {{name: string, rule: string}[]}
 */
export function wrongNames(g) {
  const right = nameOf(g);
  const { adj, core, ring, chains, longest, branches } = skeleton(g);
  /** @type {Map<string, string>} */
  const wrong = new Map();
  const add = (/** @type {string} */ name, /** @type {string} */ rule) => { if (name !== right.name && !wrong.has(name)) wrong.set(name, rule); };
  const n = right.parent.length;

  // On the right parent: another numbering, by the sum of locants, or against the alphabet on a tie.
  const { cited, scored } = numberings(g, adj, right.parent, right.ring, core);
  const sum = (/** @type {{all: number[]}} */ s) => s.all.reduce((t, x) => t + x, 0);
  const leastSum = [...scored].sort((a, b) => sum(a) - sum(b))[0];
  const other = scored.slice(1).map((s) => ({
    name: spell(cited.map((name) => ({ name, locants: s.of(name) })), n, right.ring),
    rule: firstDifference(s.all, scored[0].all) === 0 ? 'alphabeticalNumbering' : s === leastSum && sum(s) < sum(scored[0]) ? 'sum' : 'numbering',
  }));
  for (const r of ['sum', 'alphabeticalNumbering', 'numbering']) for (const o of other) if (o.rule === r) add(o.name, r);

  // Prefixes cited by locant, with di- or sec-/tert- counted; identical ones not grouped, or grouped without di-.
  const p = right.prefixes;
  const key = (/** @type {Prefix} */ x) => (N.multipliers[x.locants.length] + x.name).normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const order of [[...p].sort((a, b) => a.locants[0] - b.locants[0]), [...p].sort((a, b) => (key(a) < key(b) ? -1 : 1))]) add(spell(order, n, right.ring), 'alphabetical');
  add(spell(p.flatMap((x) => x.locants.map((l) => ({ name: x.name, locants: [l] }))), n, right.ring), 'multiplier');
  add(p.reduce((name, x) => name.replace(N.multipliers[x.locants.length] + x.name, x.name), right.name), 'multiplier');
  if (p.length === 1 && p[0].locants.length === 1 && (right.ring || n === 2)) add(`1-${right.name}`, 'locant');

  // Another parent: a shorter or less branched chain, or the ring and the chain the other way round.
  const attempt = (/** @type {number[]} */ parent, /** @type {boolean} */ isRing, /** @type {string} */ rule) => {
    try { add(numbered(g, adj, parent, isRing, core).name, rule); } catch (e) { if (!(e instanceof NamingError)) throw e; }
  };
  if (ring.length && !right.ring) attempt(ring, true, 'ringChain');
  for (const c of chains) if (c.length > 1 && c[0] < c[c.length - 1]) {
    attempt(c, false, right.ring ? 'ringChain' : c.length < longest ? 'chain' : branches(c) < branches(right.parent) ? 'branches' : 'chain');
  }
  return [...wrong].map(([name, rule]) => ({ name, rule }));
}

/**
 * Names the molecule on a given parent: its prefixes, then the numbering with the lowest locants,
 * and on equal locants the lowest to the prefix cited first (2.5.1, règle 2).
 * @param {Graph} g @param {Map<number, number>[]} adj @param {number[]} parent @param {boolean} ring @param {Set<number>} core
 * @returns {Naming}
 */
function numbered(g, adj, parent, ring, core) {
  const { cited, scored } = numberings(g, adj, parent, ring, core);
  const best = scored[0];
  const prefixes = cited.map((name) => ({ name, locants: best.of(name) }));
  return { name: spell(prefixes, parent.length, ring), parent: best.order, ring, prefixes };
}

/**
 * Every numbering of a parent, the best first: the prefixes in citation order, and for each
 * numbering the locants of all prefixes and of each one.
 * @param {Graph} g @param {Map<number, number>[]} adj @param {number[]} parent @param {boolean} ring @param {Set<number>} core
 */
function numberings(g, adj, parent, ring, core) {
  const inParent = new Set(parent);
  const subs = parent.flatMap((p) => [...adj[p].keys()].filter((q) => !inParent.has(q)).map((q) => ({ at: p, name: prefix(g, adj, q, inParent, core) })));
  const cited = [...new Set(subs.map((s) => s.name))].sort(alphabetical);
  const n = parent.length;
  const orders = ring
    ? parent.flatMap((_, s) => [1, -1].map((dir) => parent.map((__, k) => parent[(((s + dir * k) % n) + n) % n])))
    : [parent, [...parent].reverse()];
  const scored = orders.map((order) => {
    const locant = (/** @type {number} */ at) => order.indexOf(at) + 1;
    const of = (/** @type {string} */ name) => ascending(subs.filter((s) => s.name === name).map((s) => locant(s.at)));
    return { order, all: ascending(subs.map((s) => locant(s.at))), cited: cited.flatMap(of), of };
  });
  scored.sort((a, b) => firstDifference(a.all, b.all) || firstDifference(a.cited, b.cited));
  return { cited, scored };
}

/**
 * The prefix for what hangs from the parent at atom root: a halogen, a straight alkyl, one of
 * isopropyl, isobutyl, sec-butyl, tert-butyl (tableau 2.6), or a bare ring (cycloalkyl).
 * Anything else would need parentheses (Enrichissement), which the exercises leave out.
 * @param {Graph} g @param {Map<number, number>[]} adj @param {number} root @param {Set<number>} parent @param {Set<number>} core
 */
function prefix(g, adj, root, parent, core) {
  const el = g.atoms[root].el;
  if (el !== 'C') return /** @type {Record<string, string>} */ (N.halo)[el];
  const branch = new Set([root]);
  for (const q = [root]; q.length;) for (const j of adj[/** @type {number} */ (q.pop())].keys()) if (!parent.has(j) && !branch.has(j)) { branch.add(j); q.push(j); }
  if ([...branch].some((i) => g.atoms[i].el !== 'C')) throw scope();
  if (core.has(root)) {
    if (branch.size !== core.size) throw scope(); // a ring with its own branches
    return N.cyclo + N.stems[core.size - 1] + N.yl;
  }
  const degree = (/** @type {number} */ i) => [...adj[i].keys()].filter((j) => branch.has(j)).length;
  const size = branch.size;
  if (degree(root) <= 1 && [...branch].every((i) => degree(i) <= 2) && size <= N.stems.length) return N.stems[size - 1] + N.yl;
  if (size === 3 && degree(root) === 2) return N.isopropyl;
  if (size === 4 && degree(root) === 3) return N.tertButyl;
  if (size === 4 && degree(root) === 2) return N.secButyl;
  if (size === 4 && degree([...adj[root].keys()].find((j) => branch.has(j)) ?? root) === 3) return N.isobutyl;
  throw scope();
}
