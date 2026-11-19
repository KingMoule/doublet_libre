// @ts-check
import { emptyDoc, addAtom, addBond, addMark, addCurvedArrow, addReactionArrow, addText } from './model.js';
import { defaultBend } from './render.js';
import { sampleSN2 } from './sample.js';

/**
 * The mechanisms of the course, built with the same functions as the tools.
 * Lone pairs are placed automatically: on an isolated O or Br the first ones go on top,
 * then bottom, then right. Curved arrows get their default bend once everything is drawn.
 * @typedef {import('./model.js').Anchor} Anchor
 */

function builder() {
  const d = emptyDoc();
  /** @type {[Anchor, Anchor, number | undefined][]} */
  const arrows = [];
  return {
    /** @param {string} element @param {number} x @param {number} y @param {number} [charge] @param {number} [pairs] */
    atom(element, x, y, charge = 0, pairs = 0) {
      const id = addAtom(d, { element, x, y, charge }).id;
      const lp = Array.from({ length: pairs }, () => addMark(d, id, 'lonePair').id);
      return { id, lp };
    },
    /** @param {{id: string}} a @param {{id: string}} b @param {1 | 2 | 3} [order] */
    bond: (a, b, order = 1) => addBond(d, a.id, b.id, order).id,
    /** @param {number} x @param {number} y */
    plus: (x, y = 0) => { addText(d, { x, y, text: '+' }); },
    /** @param {number} x1 @param {number} x2 @param {string} [above] @param {string} [below] */
    step: (x1, x2, above = '', below = '') => { addReactionArrow(d, { x1, y1: 0, x2, y2: 0, kind: 'forward', above, below }); },
    /** @param {Anchor} from @param {Anchor} to @param {1 | -1} [side] force the arc to the left (1) or right (−1) of travel */
    arrow: (from, to, side) => { arrows.push([from, to, side]); },
    done() {
      for (const [from, to, side] of arrows) {
        const bend = defaultBend(d, from, to);
        if (side) for (const p of bend) p[1] = Math.abs(p[1]) * side;
        addCurvedArrow(d, from, to, 2, bend);
      }
      return d;
    },
  };
}

/** tert-Butyl bromide centred on (x, 0), bromine on the right. @param {ReturnType<typeof builder>} b @param {number} x */
function tBuBr(b, x) {
  const c = b.atom('C', x, 0);
  for (const [dx, dy] of [[0, -40], [-40, 0], [0, 40]]) b.bond(c, b.atom('C', x + dx, dy));
  const br = b.atom('Br', x + 40, 0, 0, 3);
  return { br, bond: b.bond(c, br) };
}

function sn1() {
  const b = builder();
  const { br, bond } = tBuBr(b, 40);
  b.step(120, 190, '', 'lente');
  const cp = b.atom('C', 240, 0, 1);
  for (const [x, y] of [[240, -40], [205.36, 20], [274.64, 20]]) b.bond(cp, b.atom('C', x, y));
  b.plus(300);
  const water = b.atom('O', 340, 0, 0, 2);
  b.plus(375);
  b.atom('Br', 410, 0, -1, 4);
  b.step(450, 520, '', 'rapide');
  const c = b.atom('C', 580, 0);
  for (const [x, y] of [[580, -40], [540, 0], [580, 40]]) b.bond(c, b.atom('C', x, y));
  b.bond(c, b.atom('O', 620, 0, 1, 1));
  b.plus(675);
  b.atom('Br', 710, 0, -1, 4);
  b.arrow({ bond }, { atom: br.id });
  b.arrow({ mark: water.lp[1] }, { atom: cp.id });
  return b.done();
}

function e2() {
  const b = builder();
  const ho = b.atom('O', 0, 0, -1, 3);
  b.plus(50);
  const h = b.atom('H', 95.36, 0);
  const cb = b.atom('C', 130, 20);
  const ca = b.atom('C', 164.64, 0);
  const br = b.atom('Br', 199.28, 20, 0, 3);
  const bH = b.bond(cb, h);
  const bCC = b.bond(cb, ca);
  const bBr = b.bond(ca, br);
  b.step(250, 330, 'EtOH', 'Δ');
  b.bond(b.atom('C', 365, 10), b.atom('C', 399.64, -10), 2);
  b.plus(430);
  b.atom('O', 470, 0, 0, 2);
  b.plus(505);
  b.atom('Br', 545, 0, -1, 4);
  b.arrow({ mark: ho.lp[2] }, { atom: h.id });
  b.arrow({ bond: bH }, { bond: bCC });
  b.arrow({ bond: bBr }, { atom: br.id });
  return b.done();
}

function e1() {
  const b = builder();
  const { br, bond } = tBuBr(b, 40);
  b.step(120, 190, '', 'lente');
  const cp = b.atom('C', 240, 0, 1);
  const me = b.atom('C', 240, -40);
  const cMe = b.bond(cp, me);
  for (const [x, y] of [[205.36, 20], [274.64, 20]]) b.bond(cp, b.atom('C', x, y));
  const h = b.atom('H', 274.64, -60);
  const bH = b.bond(me, h);
  const water = b.atom('O', 335, -60, 0, 2);
  b.plus(300, 40);
  b.atom('Br', 335, 40, -1, 4);
  b.step(380, 450, '', 'rapide');
  const c = b.atom('C', 530, 10);
  b.bond(c, b.atom('C', 530, -30), 2);
  for (const [x, y] of [[495.36, 30], [564.64, 30]]) b.bond(c, b.atom('C', x, y));
  b.plus(600);
  b.atom('O', 650, 0, 1, 1);
  b.plus(690);
  b.atom('Br', 725, 0, -1, 4);
  b.arrow({ bond }, { atom: br.id });
  b.arrow({ mark: water.lp[1] }, { atom: h.id });
  b.arrow({ bond: bH }, { bond: cMe });
  return b.done();
}

function electrophilicAddition() {
  const b = builder();
  const c1 = b.atom('C', 0, 20);
  const c2 = b.atom('C', 34.64, 0);
  const pi = b.bond(c1, c2, 2);
  b.bond(c2, b.atom('C', 69.28, 20));
  b.plus(95);
  const h = b.atom('H', 120, -20);
  const br = b.atom('Br', 160, -20, 0, 3);
  const hBr = b.bond(h, br);
  b.step(200, 270);
  const k1 = b.atom('C', 300, 20);
  const kp = b.atom('C', 334.64, 0, 1);
  b.bond(k1, kp);
  b.bond(kp, b.atom('C', 369.28, 20));
  b.plus(390);
  const bromide = b.atom('Br', 420, 0, -1, 4);
  b.step(460, 530);
  const p2 = b.atom('C', 594.64, 0);
  b.bond(b.atom('C', 560, 20), p2);
  b.bond(p2, b.atom('C', 629.28, 20));
  b.bond(p2, b.atom('Br', 594.64, -40, 0, 3));
  b.arrow({ bond: pi }, { atom: h.id });
  b.arrow({ bond: hBr }, { atom: br.id });
  b.arrow({ mark: bromide.lp[3] }, { atom: kp.id });
  return b.done();
}

function carbonylAddition() {
  const b = builder();
  const ho = b.atom('O', 0, 0, -1, 3);
  b.plus(45);
  const c = b.atom('C', 100, 20);
  const o = b.atom('O', 100, -20, 0, 2);
  const co = b.bond(c, o, 2);
  for (const [x, y] of [[65.36, 40], [134.64, 40]]) b.bond(c, b.atom('C', x, y));
  b.step(170, 250, 'H2O');
  const p = b.atom('C', 310, 20);
  b.bond(p, b.atom('O', 310, -20, -1, 3));
  b.bond(p, b.atom('O', 350, 20, 0, 2));
  b.bond(p, b.atom('C', 270, 20));
  b.bond(p, b.atom('C', 310, 60));
  b.arrow({ mark: ho.lp[2] }, { atom: c.id }, 1);
  b.arrow({ bond: co }, { atom: o.id }, -1);
  return b.done();
}

/** Mechanism templates, in the order of the course. */
export const TEMPLATES = {
  sn2: sampleSN2,
  sn1,
  e2,
  e1,
  electrophilicAddition,
  carbonylAddition,
};
