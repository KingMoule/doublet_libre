// @ts-check
import * as M from '../model.js';
import { add, angleOf, fromAngle, mid, nextBondAngle, scale, sub } from '../geometry.js';
import { sameMolecule, toGraph } from '../naming/graph.js';

/**
 * What each reaction of the textbook's chapter 7 makes of an alkene, as one table (SPEC, Exercices de
 * mécanisme): what the two carbons of its double bond receive, the one with more H first; or an O bridging
 * them; or the cut that gives each carbon a C=O. Pure: the generator draws products from it, the Substrat style
 * applies it to the student's alkene, the Réactifs style takes its choices from it, and a wrong product is told
 * apart as another reaction's.
 * @typedef {'H' | 'X' | 'OH'} Group X: the halogen of the item
 * @typedef {{add: [Group, Group], cation?: boolean} | {bridge: true} | {cut: 'carbonyl' | 'acid'}} Net
 *   add: on the carbon with more H, then on the other; cation: through a carbocation, which must not rearrange;
 *   bridge: an oxirane; cut: a C=O on each carbon, for 'acid' an aldehyde going on to the acid, and a CH₂ to CO₂ + H₂O
 */
export const NET = /** @type {Record<string, Net>} */ ({
  hx: { add: ['H', 'X'], cation: true }, // figure 7.6
  hydration: { add: ['H', 'OH'], cation: true }, // figure 7.14
  halogenation: { add: ['X', 'X'] }, // figure 7.22: through the bridged ion, no carbocation to rearrange
  hydroboration: { add: ['OH', 'H'] }, // figure 7.15: anti-Markovnikov
  hydrogenation: { add: ['H', 'H'] }, // figure 7.19
  dihydroxylation: { add: ['OH', 'OH'] }, // figure 7.26: KMnO₄ dilute, a vicinal diol
  epoxidation: { bridge: true }, // figure 7.32
  ozonolysis: { cut: 'carbonyl' }, // figure 7.30: reductive, Zn, H₃O⁺
  cleavage: { cut: 'acid' }, // figure 7.28: KMnO₄ concentrated; the oxidative ozonolysis gives the same (figure 7.30)
});

const L = 40;
/** The carbon atoms bonded to an atom. @param {M.Doc} d @param {string} id */
const carbons = (d, id) => M.neighbors(d, id).filter((n) => M.findAtom(d, n)?.element === 'C');

/**
 * Which carbon of an alkene's double bond takes what, or null when the textbook would not decide: two C=C or a
 * C≡C; two different carbons with as many H when the reaction puts two different groups
 * on them and both ways give different products (but-2-ène and cyclohexène are decided); through a carbocation, a
 * secondary one next to a carbon with three carbons or more (it would rearrange by a hydride or methyl shift).
 * h: the carbon with more H (Markovnikov's), c: the other, cation: what c would be as a carbocation.
 * @param {M.Doc} d @param {string} reaction a key of NET
 */
export function addition(d, reaction) {
  const pis = d.bonds.filter((b) => b.order === 2);
  if (pis.length !== 1 || d.bonds.some((b) => b.order === 3)) return null;
  const [p, q] = [pis[0].a, pis[0].b].map((id) => /** @type {M.Atom} */ (M.findAtom(d, id)));
  if (p.element !== 'C' || q.element !== 'C') return null;
  const [h, c] = M.hydrogenCount(d, p) >= M.hydrogenCount(d, q) ? [p, q] : [q, p];
  const net = NET[reaction];
  const two = 'add' in net && net.add[0] !== net.add[1];
  if (two && M.hydrogenCount(d, p) === M.hydrogenCount(d, q) && !sameMolecule(toGraph(made(d, net, p, q)), toGraph(made(d, net, q, p)))) return null;
  const n = carbons(d, c.id).length;
  if ('cation' in net && n === 2 && carbons(d, c.id).some((id) => id !== h.id && carbons(d, id).length >= 3)) return null;
  return { pi: pis[0], h, c, cation: /** @type {'primary' | 'secondary' | 'tertiary'} */ (['primary', 'primary', 'secondary', 'tertiary'][n]) };
}

/**
 * The products of a reaction on an alkene, in one drawing where the alkene was, its molecules apart; null when
 * addition() leaves the alkene out.
 * @param {M.Doc} d @param {string} reaction a key of NET @param {string} [x] the halogen of HX
 */
export function outcome(d, reaction, x = 'Br') {
  const a = addition(d, reaction);
  return a && made(d, NET[reaction], a.h, a.c, x);
}

/**
 * One more atom on an atom, in the free direction among its bonds. @param {M.Doc} d @param {string} at
 * @param {string} el @param {M.Bond['order']} [order]
 */
function hang(d, at, el, order = 1) {
  const a = /** @type {M.Atom} */ (M.findAtom(d, at));
  const dir = nextBondAngle(M.neighbors(d, at).map((n) => angleOf(sub(/** @type {M.Atom} */ (M.findAtom(d, n)), a))));
  M.addBond(d, at, M.addAtom(d, { element: el, ...add(a, fromAngle(dir, L)) }).id, order);
}

/**
 * Where the atom bridging two bonded carbons goes (the O of an oxirane, the Br⁺ of a bromonium ion): the top of an
 * equilateral triangle on their bond, on the side away from their other bonds (outside a ring), or with more room.
 * @param {M.Doc} d @param {M.Atom} h @param {M.Atom} c
 */
export function apex(d, h, c) {
  const u = sub(c, h), m = mid(h, c);
  const tops = [1, -1].map((s) => add(m, scale({ x: -u.y * s, y: u.x * s }, Math.sqrt(3) / 2)));
  const others = [...M.neighbors(d, h.id), ...M.neighbors(d, c.id)].filter((id) => id !== h.id && id !== c.id).map((id) => /** @type {M.Atom} */ (M.findAtom(d, id)));
  // The side of each top: + where the other bonds go, − away from them.
  const side = (/** @type {{x: number, y: number}} */ p) => others.reduce((s, o) => s + (o.x - m.x) * (p.x - m.x) + (o.y - m.y) * (p.y - m.y), 0);
  const room = (/** @type {{x: number, y: number}} */ p) => Math.min(...d.atoms.map((a) => Math.hypot(a.x - p.x, a.y - p.y)));
  if (Math.abs(side(tops[0])) > 1e-6) return side(tops[0]) < side(tops[1]) ? tops[0] : tops[1];
  return room(tops[0]) >= room(tops[1]) ? tops[0] : tops[1];
}

/** What a reaction makes of the alkene, h taking the first group. @param {M.Doc} d @param {Net} net @param {M.Atom} h @param {M.Atom} c @param {string} [x] */
function made(d, net, h, c, x = 'Br') {
  const e = structuredClone(d);
  const pi = /** @type {M.Bond} */ (M.bondBetween(e, h.id, c.id));
  if ('add' in net) {
    M.setBondOrder(e, pi.id, 1);
    net.add.forEach((g, i) => { if (g !== 'H') hang(e, [h, c][i].id, g === 'X' ? x : 'O'); });
  } else if ('bridge' in net) {
    M.setBondOrder(e, pi.id, 1);
    const o = M.addAtom(e, { element: 'O', ...apex(d, h, c) });
    M.addBond(e, h.id, o.id);
    M.addBond(e, c.id, o.id);
  } else {
    // The H each carbon had: an aldehyde's goes on to the acid's OH; a CH₂ ends as CO₂, drawn straight, and H₂O.
    const hs = [h, c].map((t) => M.hydrogenCount(d, t));
    // Not M.removeBond, which would take a carbon left alone (a CH₂) away with it, as the eraser does.
    e.bonds = e.bonds.filter((b) => b.id !== pi.id);
    [h, c].forEach((t, i) => {
      if (net.cut === 'acid' && hs[i] === 2) {
        for (const s of [1, -1]) M.addBond(e, t.id, M.addAtom(e, { element: 'O', x: t.x + s * L, y: t.y }).id, 2);
        M.addAtom(e, { element: 'O', x: t.x + 3 * L, y: t.y });
        return;
      }
      hang(e, t.id, 'O', 2);
      if (net.cut === 'acid' && hs[i] === 1) hang(e, t.id, 'O');
    });
  }
  return e;
}
