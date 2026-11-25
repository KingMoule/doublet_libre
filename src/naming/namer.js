// @ts-check
import { fr } from '../i18n/fr.js';
import { adjacency } from './graph.js';

/**
 * Names a molecule by the rules of the course's textbook (Girouard, Marrano and Lapierre,
 * Chimie organique, 3e éd., ch. 2, section 2.5), even where IUPAC 2013 has changed them.
 * For now: alkanes, cycloalkanes, halogen compounds, alkenes, alkynes, and benzene rings with alkyl,
 * halogen and nitro groups (2.5.1 to 2.5.6).
 * Outside that, or where the textbook does not decide, it throws a NamingError, and the
 * exercise generator draws another molecule.
 * @typedef {import('./graph.js').Graph} Graph
 * @typedef {{name: string, locants: number[]}} Prefix
 * @typedef {{name: string, parent: number[], ring: boolean, prefixes: Prefix[], doubles: number[], triples: number[],
 *   word: string, also: {name: string, remark?: 'retained'}[]}} Naming
 *   parent: the parent chain's atoms in numbering order; prefixes: in the order the name cites them;
 *   doubles, triples: the locants of its double and triple bonds; word: benzène or toluène for a benzene ring;
 *   also: the other names accepted (o-, m-, p-; the systematic name of a toluène, with a remark)
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
 * prefix on ethane, ethene or a saturated ring; prefixes are then written together. A single double bond
 * has no locant on two or three carbons or in a ring; several take a multiplying prefix, and the chain
 * an a before it: buta-1,3-diène (2.5.4). The same for triple bonds; with both, -ène comes first and
 * loses its e before a single -yne (hex-1-én-5-yne), and the a comes only with several -ène (2.5.5).
 * @param {Prefix[]} prefixes in citation order @param {number} size carbons of the parent @param {boolean} ring
 * A benzene ring is named by its word, benzène or toluène; on benzène a single prefix takes no locant (2.5.6).
 * @param {number[]} [doubles] locants of the double bonds @param {number[]} [triples] locants of the triple bonds
 * @param {string} [word] the parent's name when the textbook gives one: benzène, toluène
 */
export function spell(prefixes, size, ring, doubles = [], triples = [], word = '') {
  const count = prefixes.reduce((s, p) => s + p.locants.length, 0);
  const saturated = !doubles.length && !triples.length;
  const omit = size === 1 || (count === 1 && (size === 2 || (ring && saturated && (!word || word === N.benzene))));
  const words = prefixes.map(({ name, locants }) => {
    const mult = N.multipliers[locants.length];
    const word = mult + (mult && N.italic.some((p) => name.startsWith(p)) ? '-' : '') + name; // di-tert-butyl
    return omit ? word : `${locants.join(',')}-${word}`;
  });
  const stem = (ring ? N.cyclo : '') + N.stems[size - 1];
  const part = (/** @type {number[]} */ at, /** @type {string} */ end) => `-${at.join(',')}-${N.multipliers[at.length]}${end}`;
  const one = doubles.length + triples.length === 1 && (ring || size <= 3); // éthène, propyne, cyclohexène
  const parent = word || saturated ? word || stem + N.ane
    : one ? stem + (doubles.length ? N.ene : N.yne)
      : !triples.length ? stem + (doubles.length > 1 ? N.euphonic : '') + part(doubles, N.ene)
        : !doubles.length ? stem + (triples.length > 1 ? N.euphonic : '') + part(triples, N.yne)
          : stem + (doubles.length > 1 ? N.euphonic : '') + part(doubles, triples.length > 1 ? N.ene : N.en) + part(triples, N.yne);
  return words.join(omit ? '' : '-') + parent;
}

/**
 * What the naming works on: the ring (one at most) and every chain of carbons outside it.
 * @param {Graph} g
 */
function skeleton(g) {
  const adj = adjacency(g);
  const el = (/** @type {number} */ i) => g.atoms[i].el;
  const carbons = g.atoms.map((_, i) => i).filter((i) => el(i) === 'C');
  // Carbons bonded by single, double, triple or aromatic bonds (2.5.4 to 2.5.6); halogens and nitro groups on a carbon.
  const nitro = (/** @type {number} */ i) => el(i) === 'N' && adj[i].size === 3
    && [...adj[i]].filter(([j, o]) => el(j) === 'O' && o === 2 && adj[j].size === 1).length === 2 && [...adj[i]].some(([j, o]) => el(j) === 'C' && o === 1);
  if (!carbons.length) throw scope();
  for (const b of g.bonds) {
    const cc = el(b.a) === 'C' && el(b.b) === 'C';
    if (b.order !== 1 && !(cc && [1.5, 2, 3].includes(b.order)) && !(b.order === 2 && [el(b.a), el(b.b)].sort().join() === 'N,O')) throw scope();
  }
  for (const [i, a] of g.atoms.entries()) {
    const [first] = [...adj[i].keys()];
    if (a.charge !== 0) throw scope();
    if (HALOGENS.includes(a.el) && (adj[i].size !== 1 || el(first) !== 'C')) throw scope();
    if (a.el === 'N' && !nitro(i)) throw scope();
    // An oxygen is a nitro's, or an ether's between two carbons (2.5.7).
    if (a.el === 'O' && !(adj[i].size === 1 && nitro(first)) && !(adj[i].size === 2 && [...adj[i]].every(([j, o]) => el(j) === 'C' && o === 1))) throw scope();
    if (!['C', 'N', 'O', ...HALOGENS].includes(a.el)) throw scope();
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
    if (g.bonds.some((b) => b.order === 3 && core.has(b.a) && core.has(b.b))) throw scope(); // no triple bond in a ring
  }
  // No ring through an oxygen: cyclic ethers are left out (2.5.7). A connected molecule has bonds − atoms + 1 rings.
  if (g.bonds.length - g.atoms.length + 1 > (ring.length ? 1 : 0)) throw scope();
  // Aromatic bonds only around a benzene ring, all six of them.
  const aromatic = g.bonds.filter((b) => b.order === 1.5);
  if (aromatic.length && (aromatic.length !== 6 || ring.length !== 6 || aromatic.some((b) => !core.has(b.a) || !core.has(b.b)))) throw scope();

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
  // Double and triple bonds; a benzene ring's aromatic bonds are not alkenes (2.5.6).
  const multiples = (/** @type {number[]} */ c) => g.bonds.filter((b) => (b.order === 2 || b.order === 3) && c.includes(b.a) && c.includes(b.b)).length;
  return { adj, core, ring, chains, longest, branches, multiples };
}

/** @param {Graph} g @returns {Naming} */
export function nameOf(g) {
  const { adj, core, ring, chains, branches, multiples } = skeleton(g);
  // The parent holds the most double and triple bonds, even when shorter (2.5.4, 2.5.5); then it is the longest,
  // a ring against a chain by their sizes, a tie the textbook does not decide (2.5.2); then the most branched (2.5.1, règle 1).
  /** @typedef {{atoms: number[], ring: boolean}} Candidate */
  const most = (/** @type {Candidate[]} */ cs, /** @type {(c: Candidate) => number} */ f) => cs.filter((c) => f(c) === Math.max(...cs.map(f)));
  let top = most(most([...(ring.length ? [{ atoms: ring, ring: true }] : []), ...chains.map((atoms) => ({ atoms, ring: false }))], (c) => multiples(c.atoms)), (c) => c.atoms.length);
  if (top.some((c) => c.ring) && top.some((c) => !c.ring)) throw new NamingError('undecided');
  top = most(top, (c) => (c.ring ? 0 : branches(c.atoms)));
  const named = top.map((c) => numbered(g, adj, c.atoms, c.ring, core));
  if (new Set(named.map((n) => n.name)).size > 1) throw new NamingError('undecided');
  // A simple ether R–O–R′ is also « oxyde de R et de R′ », in alphabetical order (2.5.7, radicofunctional).
  const oxygens = g.atoms.flatMap((a, i) => (a.el === 'O' ? [i] : []));
  if (oxygens.length === 1 && adj[oxygens[0]].size === 2 && g.atoms.every((a) => a.el === 'C' || a.el === 'O')) {
    try {
      const groups = [...adj[oxygens[0]].keys()].map((c) => prefix(g, adj, c, new Set(oxygens), core) + 'e').sort(alphabetical);
      const of = (/** @type {string} */ x) => (/^[aeiouyéèh]/i.test(x) ? N.ofElided : N.of) + x;
      named[0].also.push({ name: groups[0] === groups[1] ? `${N.oxide} ${N.of}${N.multipliers[2]}${groups[0]}` : `${N.oxide} ${of(groups[0])} ${N.and} ${of(groups[1])}` });
    } catch (e) { if (!(e instanceof NamingError)) throw e; }
  }
  return named[0];
}

/**
 * Names a student could write by breaking one rule of the textbook at a time, each with that rule
 * (a key of fr.naming.rules). The exercise compares a wrong answer with these to say which rule it breaks.
 * @param {Graph} g @returns {{name: string, rule: string}[]}
 */
export function wrongNames(g) {
  const right = nameOf(g);
  const { adj, core, ring, chains, branches } = skeleton(g);
  /** @type {Map<string, string>} */
  const wrong = new Map();
  const add = (/** @type {string} */ name, /** @type {string} */ rule) => { if (name !== right.name && !wrong.has(name)) wrong.set(name, rule); };
  const n = right.parent.length;
  const [d, t] = [right.doubles, right.triples];

  // On the right parent: a ring numbered across its double bond, the triple bond before the double one on
  // a tie, the branches before the multiple bonds, the sum of locants, the alphabet ignored on a tie, or simply the other way.
  const { cited, scored } = numberings(g, adj, right.parent, right.ring, core);
  const best = scored[0];
  const sum = (/** @type {{all: number[]}} */ s) => s.all.reduce((x, y) => x + y, 0);
  const leastSum = scored.filter((s) => s.valid).sort((a, b) => sum(a) - sum(b))[0];
  const other = scored.slice(1).map((s) => {
    const same = firstDifference(s.multiples, best.multiples) === 0;
    return {
      name: spell(cited.map((name) => ({ name, locants: s.of(name) })), n, right.ring, s.doubles, s.triples, right.word),
      rule: !s.valid ? 'ringDoubleBond'
        : same && firstDifference(s.doubles, best.doubles) > 0 ? 'eneFirst'
          : firstDifference(s.multiples, best.multiples) > 0 && firstDifference(s.all, best.all) < 0 ? 'unsaturationFirst'
            : same && firstDifference(s.doubles, best.doubles) === 0 && firstDifference(s.all, best.all) === 0 ? 'alphabeticalNumbering'
              : s === leastSum && sum(s) < sum(best) ? 'sum' : 'numbering',
    };
  });
  for (const r of ['ringDoubleBond', 'eneFirst', 'unsaturationFirst', 'sum', 'alphabeticalNumbering', 'numbering']) for (const o of other) if (o.rule === r) add(o.name, r);

  // Prefixes cited by locant, with di- or sec-/tert- counted; identical ones not grouped, or grouped without di-.
  const p = right.prefixes;
  const key = (/** @type {Prefix} */ x) => (N.multipliers[x.locants.length] + x.name).normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const order of [[...p].sort((a, b) => a.locants[0] - b.locants[0]), [...p].sort((a, b) => (key(a) < key(b) ? -1 : 1))]) add(spell(order, n, right.ring, d, t, right.word), 'alphabetical');
  add(spell(p.flatMap((x) => x.locants.map((l) => ({ name: x.name, locants: [l] }))), n, right.ring, d, t, right.word), 'multiplier');
  add(p.reduce((name, x) => name.replace(N.multipliers[x.locants.length] + x.name, x.name), right.name), 'multiplier');
  if (p.length === 1 && p[0].locants.length === 1 && (n === 2 || (right.ring && !d.length && !t.length && (!right.word || right.word === N.benzene)))) add(`1-${right.name}`, 'locant');
  // A multiple bond written with both its carbons, the a left out, -ène kept whole before a single -yne (2.5.4, 2.5.5).
  const one = d.length + t.length === 1 ? (d.length ? { at: d[0], end: N.ene } : { at: t[0], end: N.yne }) : null;
  if (one) add(right.name.replace(`-${one.at}-${one.end}`, `-${one.at},${one.at + 1}-${one.end}`), 'bothLocants');
  const stem = (right.ring ? N.cyclo : '') + N.stems[n - 1];
  add(right.name.replace(`${stem}${N.euphonic}-`, `${stem}-`), 'euphony');
  if (d.length && t.length === 1) add(right.name.replace(`${N.en}-`, `${N.ene}-`), 'enElision');
  // Méthyloxy for méthoxy, pentoxy for pentyloxy (2.5.7).
  for (const x of p) {
    const k = N.stems.findIndex((s, i) => x.name === (i < 4 ? s : s + N.yl) + N.oxy);
    if (k >= 0) add(right.name.replace(x.name, (k < 4 ? N.stems[k] + N.yl : N.stems[k]) + N.oxy), 'alkoxy');
  }

  // Another parent: a shorter or less branched chain, or the ring and the chain the other way round.
  const attempt = (/** @type {number[]} */ parent, /** @type {boolean} */ isRing, /** @type {string} */ rule) => {
    try { add(numbered(g, adj, parent, isRing, core).name, rule); } catch (e) { if (!(e instanceof NamingError)) throw e; }
  };
  if (ring.length && !right.ring) attempt(ring, true, 'ringChain');
  for (const c of chains) if (c[0] <= c[c.length - 1]) {
    attempt(c, false, right.ring ? 'ringChain' : c.length < n ? 'chain' : branches(c) < branches(right.parent) ? 'branches' : 'chain');
  }
  return [...wrong].map(([name, rule]) => ({ name, rule }));
}

/**
 * Names the molecule on a given parent: its prefixes, then the numbering with the lowest locants,
 * and on equal locants the lowest to the prefix cited first (2.5.1, règle 2).
 * @param {Graph} g @param {Map<number, number>[]} adj @param {number[]} parent @param {boolean} ring @param {Set<number>} core
 * @returns {Naming}
 */
function numbered(g, adj, parent, ring, core, plain = false) {
  const { cited, scored, word } = numberings(g, adj, parent, ring, core, plain);
  const best = scored[0];
  const prefixes = cited.map((name) => ({ name, locants: best.of(name) }));
  const name = spell(prefixes, parent.length, ring, best.doubles, best.triples, word);
  // Also accepted on a benzene ring (2.5.6): o-, m-, p- for two substituents, and for a toluène its
  // systematic name, with a remark since the textbook asks for the familiar one.
  /** @type {{name: string, remark?: 'retained'}[]} */
  const also = [];
  const locs = prefixes.flatMap((p) => p.locants);
  const relative = /** @type {Record<number, string[]>} */ (N.omp);
  if (word && word !== N.benzene) {
    also.push({ name: numbered(g, adj, parent, ring, core, true).name, remark: 'retained' });
    if (locs.length === 1) for (const a of relative[locs[0]] ?? []) also.push({ name: `${a}-${prefixes[0].name}${word}` });
  }
  if (word === N.benzene && locs.length === 2) {
    const two = prefixes.length === 1 ? N.multipliers[2] + (N.italic.some((p) => prefixes[0].name.startsWith(p)) ? '-' : '') + prefixes[0].name : prefixes.map((p) => p.name).join('');
    for (const a of relative[Math.max(...locs)] ?? []) also.push({ name: `${a}-${two}${word}` });
  }
  return { name, parent: best.order, ring, prefixes, doubles: best.doubles, triples: best.triples, word, also };
}

/**
 * Every numbering of a parent, the best first: the prefixes in citation order, and for each numbering
 * the locants of its double bonds, of all prefixes and of each one. The double bonds take the lowest
 * locants first (2.5.4); in a ring, the two carbons of a double bond must follow each other, so a
 * numbering that crosses one from 1 to the last carbon is not valid. A benzene ring with a single methyl
 * is toluène, its methyl at 1; with none, or several, it is benzène (2.5.6, unless `plain`: always benzène).
 * @param {Graph} g @param {Map<number, number>[]} adj @param {number[]} parent @param {boolean} ring @param {Set<number>} core
 * @param {boolean} [plain]
 */
function numberings(g, adj, parent, ring, core, plain = false) {
  const inParent = new Set(parent);
  let subs = parent.flatMap((p) => [...adj[p].keys()].filter((q) => !inParent.has(q)).map((q) => ({ at: p, name: prefix(g, adj, q, inParent, core) })));
  const aromatic = ring && g.bonds.some((b) => b.order === 1.5 && inParent.has(b.a) && inParent.has(b.b));
  // A group alone on the ring that gives it a familiar name takes it; one repeated keeps benzène; two such
  // groups of the same rank leave it undecided (2.5.6).
  const found = aromatic && !plain ? N.retained.map((r) => ({ ...r, subs: subs.filter((s) => s.name === r.prefix) })).filter((r) => r.subs.length) : [];
  const kept = found.length === 1 && found[0].subs.length === 1 ? found[0] : null;
  if (!kept && found.length > 1 && found.every((r) => r.subs.length === 1)) throw new NamingError('undecided');
  const methyls = kept ? kept.subs : [];
  if (kept) subs = subs.filter((s) => s !== methyls[0]);
  const word = !aromatic ? '' : kept ? kept.word : N.benzene;
  const cited = [...new Set(subs.map((s) => s.name))].sort(alphabetical);
  const bonds = (/** @type {number} */ o) => g.bonds.filter((b) => b.order === o && inParent.has(b.a) && inParent.has(b.b));
  const [double, triple] = [bonds(2), bonds(3)];
  const n = parent.length;
  const orders = (ring
    ? parent.flatMap((_, s) => [1, -1].map((dir) => parent.map((__, k) => parent[(((s + dir * k) % n) + n) % n])))
    : [parent, [...parent].reverse()]).filter((o) => methyls.length !== 1 || o[0] === methyls[0].at);
  const scored = orders.map((order) => {
    const locant = (/** @type {number} */ at) => order.indexOf(at) + 1;
    const of = (/** @type {string} */ name) => ascending(subs.filter((s) => s.name === name).map((s) => locant(s.at)));
    const ends = double.map((b) => [locant(b.a), locant(b.b)]);
    const doubles = ascending(ends.map(([x, y]) => Math.min(x, y)));
    const triples = ascending(triple.map((b) => Math.min(locant(b.a), locant(b.b))));
    return {
      order, of, all: ascending(subs.map((s) => locant(s.at))), cited: cited.flatMap(of),
      valid: ends.every(([x, y]) => Math.abs(x - y) === 1),
      doubles, triples, multiples: ascending([...doubles, ...triples]),
    };
  });
  // Double and triple bonds together first, then the double bonds on a tie (2.5.5), then the prefixes.
  scored.sort((a, b) => Number(b.valid) - Number(a.valid) || firstDifference(a.multiples, b.multiples) || firstDifference(a.doubles, b.doubles)
    || firstDifference(a.all, b.all) || firstDifference(a.cited, b.cited));
  return { cited, scored, word };
}

/**
 * The prefix for what hangs from the parent at atom root: a halogen, a straight alkyl, one of
 * isopropyl, isobutyl, sec-butyl, tert-butyl (tableau 2.6), or a bare ring (cycloalkyl).
 * Anything else would need parentheses (Enrichissement), which the exercises leave out.
 * @param {Graph} g @param {Map<number, number>[]} adj @param {number} root @param {Set<number>} parent @param {Set<number>} core
 */
function prefix(g, adj, root, parent, core) {
  const el = g.atoms[root].el;
  if (el === 'N') return N.nitro;
  if (el === 'O') {
    // An ether: the oxygen and the group beyond it, méthoxy to butoxy, then pentyloxy…, phényloxy, benzyloxy (tableau 2.8).
    const c = [...adj[root].keys()].find((j) => !parent.has(j));
    if (c === undefined) throw scope();
    const r = prefix(g, adj, c, new Set([...parent, root]), core);
    const short = N.stems.slice(0, 4).findIndex((s) => r === s + N.yl);
    if (short >= 0) return N.stems[short] + N.oxy;
    if (r === N.phenyl || r === N.benzyl || N.stems.slice(4).some((s) => r === s + N.yl)) return r + N.oxy;
    throw scope(); // isopropoxy and the like: not in the textbook's table
  }
  if (el !== 'C') return /** @type {Record<string, string>} */ (N.halo)[el];
  const branch = new Set([root]);
  for (const q = [root]; q.length;) for (const j of adj[/** @type {number} */ (q.pop())].keys()) if (!parent.has(j) && !branch.has(j)) { branch.add(j); q.push(j); }
  if ([...branch].some((i) => g.atoms[i].el !== 'C')) throw scope();
  // A double bond in a branch (vinyl, allyl…) or towards it is left out by the textbook (2.5.4).
  if ([...branch].some((i) => [...adj[i].values()].some((o) => o !== 1 && o !== 1.5))) throw scope();
  const aromatic = g.bonds.some((b) => b.order === 1.5);
  if ([...branch].some((i) => core.has(i))) {
    // A bare ring: cycloalkyl, or phényl for a benzene ring; benzyl is CH₂ and a phényl (tableau 2.6).
    if (core.has(root) && branch.size === core.size) return aromatic ? N.phenyl : N.cyclo + N.stems[core.size - 1] + N.yl;
    if (!core.has(root) && aromatic && branch.size === core.size + 1) return N.benzyl;
    throw scope(); // a ring with its own branches
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
