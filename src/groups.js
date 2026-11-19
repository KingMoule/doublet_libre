// @ts-check
import { add, fromAngle, angleOf, ringOnAtom } from './geometry.js';
import { findAtom, addAtom, addBond, addRing } from './model.js';

/**
 * Functional groups, drawn in full and attached to an atom.
 * Each is described in a local frame: attachment at the origin, first bond along 0°,
 * then 120° zigzag. attachGroup turns that frame toward the free direction of the atom.
 * @typedef {[string, {x: number, y: number}, number?]} GroupAtom element, local point, charge
 * @typedef {{atoms: GroupAtom[], bonds: [number, number, number?][]} | 'ring'} Group bond -1 = the host atom
 */

const L = 40;
/** @param {{x:number,y:number}} p @param {number} deg */
const at = (p, deg) => add(p, fromAngle(deg, L));
const A = at({ x: 0, y: 0 }, 0);
const B = at(A, 60);

/** @type {Record<string, Group>} */
export const GROUPS = {
  Ph: 'ring',
  OMe: { atoms: [['O', A], ['C', B]], bonds: [[-1, 0], [0, 1]] },
  OEt: { atoms: [['O', A], ['C', B], ['C', at(B, 0)]], bonds: [[-1, 0], [0, 1], [1, 2]] },
  CO2H: { atoms: [['C', A], ['O', B], ['O', at(A, -60)]], bonds: [[-1, 0], [0, 1, 2], [0, 2]] },
  CHO: { atoms: [['C', A], ['O', B]], bonds: [[-1, 0], [0, 1, 2]] },
  CN: { atoms: [['C', A], ['N', at(A, 0)]], bonds: [[-1, 0], [0, 1, 3]] },
  // Nitro in its charge-separated form (GR-8.1).
  NO2: { atoms: [['N', A, 1], ['O', B], ['O', at(A, -60), -1]], bonds: [[-1, 0], [0, 1, 2], [0, 2]] },
  OAc: { atoms: [['O', A], ['C', B], ['O', at(B, 120)], ['C', at(B, 0)]], bonds: [[-1, 0], [0, 1], [1, 2, 2], [1, 3]] },
  Boc: {
    atoms: [['C', A], ['O', at(A, -60)], ['O', B], ['C', at(B, 0)], ['C', at(at(B, 0), 90)], ['C', at(at(B, 0), 0)], ['C', at(at(B, 0), -90)]],
    bonds: [[-1, 0], [0, 1, 2], [0, 2], [2, 3], [3, 4], [3, 5], [3, 6]],
  },
};

/**
 * Attaches a group to an atom, its first bond in direction dirDeg. Returns the new atoms, first bonded one first.
 * @param {import('./model.js').Doc} doc @param {string} atomId @param {string} name @param {number} dirDeg
 */
export function attachGroup(doc, atomId, name, dirDeg) {
  const host = findAtom(doc, atomId);
  const group = GROUPS[name];
  if (!host || !group) return [];
  /** @param {{x:number,y:number}} q */
  const place = (q) => add(host, fromAngle(angleOf(q) + dirDeg, Math.hypot(q.x, q.y)));
  if (group === 'ring') {
    const ids = addRing(doc, ringOnAtom(A, 0, 6, L).map(place), true, false);
    addBond(doc, atomId, ids[0]);
    return ids;
  }
  const ids = group.atoms.map(([element, q, charge = 0]) => addAtom(doc, { element, ...place(q), charge }).id);
  for (const [i, j, order = 1] of group.bonds) addBond(doc, i < 0 ? atomId : ids[i], ids[j], /** @type {1|2|3} */ (order));
  return ids;
}
