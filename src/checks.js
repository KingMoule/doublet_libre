// @ts-check
import { ELEMENTS } from './chem.js';
import { bondOrderSum, hydrogenCount, component, findAtom, regions } from './model.js';

/**
 * Pedagogical checks, re-run after every change. They never block: each returns a warning
 * with the objects to outline and the values its message needs (texts live in i18n).
 * @typedef {import('./model.js').Doc} Doc
 * @typedef {{code: 'octet' | 'arrowDirection' | 'mixedCharges' | 'charge' | 'resonance',
 *   ids: string[], params: Record<string, string | number>}} Warning
 */

/** @param {Doc} doc @returns {Warning[]} */
export function checkDoc(doc) {
  return [...octet(doc), ...arrowDirection(doc), ...mixedCharges(doc), ...reactionSides(doc)];
}

/** Elements allowed past the octet: S and P (GR-8.2), and Si and I; H holds 2 and is left out. */
const EXPANDED = new Set(['H', 'S', 'P', 'Si', 'I']);

/** Atoms hold at most 8 electrons, except those above. @param {Doc} doc */
function octet(doc) {
  /** @type {Warning[]} */
  const out = [];
  for (const a of doc.atoms) {
    if (!ELEMENTS[a.element] || EXPANDED.has(a.element)) continue;
    const own = doc.marks.reduce((n, m) => n + (m.atom !== a.id ? 0 : m.kind === 'lonePair' ? 2 : m.kind === 'radical' ? 1 : 0), 0);
    const electrons = 2 * (bondOrderSum(doc, a.id) + hydrogenCount(doc, a)) + own;
    if (electrons > 8) out.push({ code: 'octet', ids: [a.id], params: { element: a.element, electrons } });
  }
  return out;
}

/** Electrons flow from rich to poor: an arrow leaving a + atom or landing on a − atom is suspicious. @param {Doc} doc */
function arrowDirection(doc) {
  /** @type {Warning[]} */
  const out = [];
  for (const c of doc.curvedArrows) {
    const markId = 'mark' in c.from ? c.from.mark : undefined;
    const src = markId ? doc.marks.find((m) => m.id === markId)?.atom : undefined;
    const tgt = 'atom' in c.to ? c.to.atom : undefined;
    const fromPlus = !!src && (findAtom(doc, src)?.charge ?? 0) > 0;
    const toMinus = !!tgt && (findAtom(doc, tgt)?.charge ?? 0) < 0;
    if (fromPlus || toMinus) out.push({ code: 'arrowDirection', ids: [c.id], params: {} });
  }
  return out;
}

/** Show either formal or partial charges on a molecule, not both (GR-5.6). @param {Doc} doc */
function mixedCharges(doc) {
  /** @type {Warning[]} */
  const out = [];
  const seen = new Set();
  for (const a of doc.atoms) {
    if (seen.has(a.id)) continue;
    const ids = [...component(doc, a.id)];
    ids.forEach((id) => seen.add(id));
    const formal = ids.some((id) => findAtom(doc, id)?.charge);
    const partial = doc.marks.some((m) => m.kind === 'partial' && ids.includes(m.atom));
    if (formal && partial) out.push({ code: 'mixedCharges', ids, params: {} });
  }
  return out;
}

/**
 * Around each reaction arrow, the species on its left and on its right (between neighbouring
 * arrows, by x): the total charge must match, and ↔ needs the same atoms and σ bonds.
 * @param {Doc} doc
 */
function reactionSides(doc) {
  /** @type {Warning[]} */
  const out = [];
  const { arrows, states } = regions(doc);
  arrows.forEach((r, i) => {
    if (r.kind === 'retro') return;
    const atoms = (/** @type {string[]} */ ids) => ids.map((id) => /** @type {import('./model.js').Atom} */ (findAtom(doc, id)));
    const [left, right] = [atoms(states[i]), atoms(states[i + 1])];
    if (!left.length || !right.length) return;
    const charge = (/** @type {typeof left} */ atoms) => atoms.reduce((s, a) => s + a.charge, 0);
    if (charge(left) !== charge(right)) out.push({ code: 'charge', ids: [r.id], params: { left: charge(left), right: charge(right) } });
    if (r.kind === 'resonance') {
      // σ skeleton: the atoms, and each bond as its pair of elements whatever its order.
      const skeleton = (/** @type {typeof left} */ atoms) => {
        const el = (/** @type {string} */ id) => findAtom(doc, id)?.element ?? '';
        const bonds = doc.bonds.filter((b) => atoms.some((a) => a.id === b.a)).map((b) => [el(b.a), el(b.b)].sort().join('-'));
        return `${atoms.map((a) => a.element).sort()}|${bonds.sort()}`;
      };
      if (skeleton(left) !== skeleton(right)) out.push({ code: 'resonance', ids: [r.id], params: {} });
    }
  });
  return out;
}
