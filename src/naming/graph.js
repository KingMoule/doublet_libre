// @ts-check
/**
 * Molecules as graphs: which atoms are bonded, and how. Coordinates play no part, so a molecule drawn
 * turned, mirrored or elsewhere on the page is the same graph. Hydrogens stay implicit. A benzene ring
 * is the same graph whichever Kekulé form is drawn, and a nitro group whether drawn with its charges or not.
 * @typedef {{el: string, charge: number}} GAtom
 * @typedef {{a: number, b: number, order: number}} GBond order 1, 2 or 3; 1.5 in an aromatic ring
 * @typedef {{atoms: GAtom[], bonds: GBond[], ids?: string[]}} Graph ids: the document atom of each atom
 */

/** Neighbours of each atom, with the order of the bond to it. @param {Graph} g */
function adjacency(g) {
  const adj = g.atoms.map(() => /** @type {Map<number, number>} */ (new Map()));
  for (const { a, b, order } of g.bonds) { adj[a].set(b, order); adj[b].set(a, order); }
  return adj;
}

/**
 * One way of drawing each group, so that two drawings of the same molecule give the same graph:
 * a nitro group drawn charge-separated (N⁺, O⁻) becomes N(=O)=O, and a six-membered ring of
 * alternating single and double bonds becomes aromatic (order 1.5) whichever Kekulé form was drawn.
 * @param {Graph} g @returns {Graph}
 */
function normalize(g) {
  const adj = adjacency(g);
  const bond = (/** @type {number} */ a, /** @type {number} */ b) => g.bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  g.atoms.forEach((n, i) => {
    if (n.el !== 'N' || n.charge !== 1) return;
    const os = [...adj[i]].filter(([j]) => g.atoms[j].el === 'O');
    const minus = os.find(([j, o]) => o === 1 && g.atoms[j].charge === -1);
    if (!minus || !os.some(([j, o]) => o === 2 && g.atoms[j].charge === 0)) return;
    n.charge = 0;
    g.atoms[minus[0]].charge = 0;
    /** @type {GBond} */ (bond(i, minus[0])).order = 2;
  });
  // Rings of six found from their lowest atom, then checked on the orders as drawn.
  /** @type {number[][]} */
  const rings = [];
  const walk = (/** @type {number[]} */ path) => {
    const last = path[path.length - 1];
    if (path.length === 6) { if (adj[last].has(path[0])) rings.push(path); return; }
    for (const next of adj[last].keys()) if (next > path[0] && !path.includes(next)) walk([...path, next]);
  };
  g.atoms.forEach((_, s) => walk([s]));
  const kekule = rings.filter((r) => r.every((a, i) => {
    const o = adj[a].get(r[(i + 1) % 6]), p = adj[r[(i + 5) % 6]].get(a);
    return (o === 1 && p === 2) || (o === 2 && p === 1);
  }));
  for (const r of kekule) r.forEach((a, i) => { /** @type {GBond} */ (bond(a, r[(i + 1) % 6])).order = 1.5; });
  return g;
}

/**
 * The graph of a document's molecules (or of the atoms whose ids are given), explicit H left out.
 * Lone pairs, wedges and coordinates are not part of it.
 * @param {import('../model.js').Doc} doc @param {Iterable<string>} [ids] @returns {Graph}
 */
export function toGraph(doc, ids) {
  const only = ids ? new Set(ids) : null;
  const atoms = doc.atoms.filter((a) => a.element !== 'H' && (!only || only.has(a.id)));
  const index = new Map(atoms.map((a, i) => [a.id, i]));
  /** @type {Graph} */
  const g = { atoms: atoms.map((a) => ({ el: a.element, charge: a.charge ?? 0 })), bonds: [], ids: atoms.map((a) => a.id) };
  for (const b of doc.bonds) {
    const a = index.get(b.a), c = index.get(b.b);
    if (a !== undefined && c !== undefined) g.bonds.push({ a, b: c, order: b.order });
  }
  return normalize(g);
}

const ELEMENTS = ['Cl', 'Br', 'C', 'N', 'O', 'S', 'F', 'I'];

/**
 * A graph written in a subset of SMILES, enough for the tests and the exercises: the elements above,
 * aromatic c, bonds - = #, branches in parentheses, ring closures 1 to 9. No brackets, so no charges.
 * @param {string} s @returns {Graph}
 */
export function fromSmiles(s) {
  /** @type {Graph} */
  const g = { atoms: [], bonds: [] };
  const aromatic = /** @type {boolean[]} */ ([]);
  const open = /** @type {Map<string, [number, number | null]>} */ (new Map());
  const stack = /** @type {number[]} */ ([]);
  let prev = -1;
  /** @type {number | null} */
  let order = null;
  const link = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number | null} */ o) => {
    g.bonds.push({ a, b, order: o ?? (aromatic[a] && aromatic[b] ? 1.5 : 1) });
  };
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (c === '(') { stack.push(prev); i++; continue; }
    if (c === ')') { prev = /** @type {number} */ (stack.pop()); i++; continue; }
    if (c === '-' || c === '=' || c === '#') { order = { '-': 1, '=': 2, '#': 3 }[c]; i++; continue; }
    if (/[1-9]/.test(c)) {
      const other = open.get(c);
      if (other) { link(other[0], prev, order ?? other[1]); open.delete(c); } else open.set(c, [prev, order]);
      order = null; i++; continue;
    }
    const el = c === 'c' ? 'C' : ELEMENTS.find((e) => s.startsWith(e, i));
    if (!el) throw new Error(`SMILES: cannot read "${c}" at position ${i + 1}`);
    g.atoms.push({ el, charge: 0 });
    aromatic.push(c === 'c');
    const k = g.atoms.length - 1;
    if (prev >= 0) link(prev, k, order);
    prev = k; order = null;
    i += c === 'c' ? 1 : el.length;
  }
  return normalize(g);
}

/**
 * Whether two graphs are the same molecule: a one-to-one match of their atoms keeping elements,
 * charges and bonds. The molecules of an exercise are small, so a plain search is enough.
 * @param {Graph} g1 @param {Graph} g2
 */
export function sameMolecule(g1, g2) {
  const n = g1.atoms.length;
  if (n !== g2.atoms.length || g1.bonds.length !== g2.bonds.length) return false;
  const a1 = adjacency(g1), a2 = adjacency(g2);
  const sig = (/** @type {Graph} */ g, /** @type {Map<number, number>[]} */ adj, /** @type {number} */ i) =>
    `${g.atoms[i].el}${g.atoms[i].charge}:${[...adj[i].values()].sort().join(',')}`;
  const s1 = g1.atoms.map((_, i) => sig(g1, a1, i)), s2 = g2.atoms.map((_, i) => sig(g2, a2, i));
  if ([...s1].sort().join(' ') !== [...s2].sort().join(' ')) return false;
  // Match atoms in breadth-first order, so each new atom has a matched neighbour to agree with.
  const order = [], seen = new Set();
  for (let s = 0; s < n; s++) {
    if (seen.has(s)) continue;
    seen.add(s);
    for (let q = [s]; q.length;) {
      const x = /** @type {number} */ (q.shift());
      order.push(x);
      for (const y of a1[x].keys()) if (!seen.has(y)) { seen.add(y); q.push(y); }
    }
  }
  const map = new Array(n).fill(-1), used = new Array(n).fill(false);
  const match = (/** @type {number} */ k) => {
    if (k === n) return true;
    const x = order[k];
    for (let y = 0; y < n; y++) {
      if (used[y] || s2[y] !== s1[x]) continue;
      if ([...a1[x]].some(([z, o]) => map[z] >= 0 && a2[y].get(map[z]) !== o)) continue;
      map[x] = y; used[y] = true;
      if (match(k + 1)) return true;
      map[x] = -1; used[y] = false;
    }
    return false;
  };
  return match(0);
}
