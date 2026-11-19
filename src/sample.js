// @ts-check
/**
 * Example document: SN2 substitution of bromoethane by hydroxide.
 * The same figure as in the project proposal, now as data drawn by the renderer.
 * @returns {import('./model.js').Doc}
 */
export function sampleSN2() {
  return {
    version: 1,
    style: {},
    atoms: [
      { id: 'a1', element: 'O', x: 100, y: 100, charge: -1 },
      { id: 'a2', element: 'C', x: 180, y: 134.64, charge: 0 },
      { id: 'a3', element: 'C', x: 200, y: 100, charge: 0 },
      { id: 'a4', element: 'Br', x: 240, y: 100, charge: 0 },
      { id: 'a5', element: 'O', x: 400, y: 100, charge: 0 },
      { id: 'a6', element: 'C', x: 434.64, y: 120, charge: 0 },
      { id: 'a7', element: 'C', x: 469.28, y: 100, charge: 0 },
      { id: 'a8', element: 'Br', x: 545, y: 100, charge: -1 },
    ],
    bonds: [
      { id: 'b1', a: 'a2', b: 'a3', order: 1 },
      { id: 'b2', a: 'a3', b: 'a4', order: 1 },
      { id: 'b3', a: 'a5', b: 'a6', order: 1 },
      { id: 'b4', a: 'a6', b: 'a7', order: 1 },
    ],
    marks: [
      { id: 'm1', atom: 'a1', kind: 'lonePair' },
      { id: 'm2', atom: 'a1', kind: 'lonePair' },
      { id: 'm3', atom: 'a1', kind: 'lonePair' },
      { id: 'm4', atom: 'a4', kind: 'lonePair' },
      { id: 'm5', atom: 'a4', kind: 'lonePair' },
      { id: 'm6', atom: 'a4', kind: 'lonePair' },
      { id: 'm7', atom: 'a4', kind: 'partial', value: 'δ−' },
      { id: 'm8', atom: 'a3', kind: 'partial', value: 'δ+', angle: 300 },
      { id: 'm9', atom: 'a5', kind: 'lonePair' },
      { id: 'm10', atom: 'a5', kind: 'lonePair' },
      { id: 'm11', atom: 'a8', kind: 'lonePair' },
      { id: 'm12', atom: 'a8', kind: 'lonePair' },
      { id: 'm13', atom: 'a8', kind: 'lonePair' },
      { id: 'm14', atom: 'a8', kind: 'lonePair' },
    ],
    curvedArrows: [
      { id: 'ca1', from: { mark: 'm1' }, to: { atom: 'a3' }, electrons: 2, bend: [[0.09, 0.32], [0.74, 0.39]] },
      { id: 'ca2', from: { bond: 'b2' }, to: { atom: 'a4' }, electrons: 2, bend: [[0, 1.5], [0.15, 1]] },
    ],
    reactionArrows: [
      { id: 'ra1', x1: 285, y1: 100, x2: 365, y2: 100, kind: 'forward', above: 'H2O, EtOH', below: 'Δ, 1 h' },
    ],
    texts: [
      { id: 't1', x: 150, y: 100, text: '+' },
      { id: 't2', x: 506, y: 100, text: '+' },
    ],
    apparatus: [],
  };
}
