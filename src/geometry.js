// @ts-check
/**
 * Plane geometry for the drawing.
 * Document coordinates follow SVG: x to the right, y downwards.
 * Angles are in degrees, counter-clockwise as seen on screen: 0 = right, 90 = up.
 */

/** @typedef {{x: number, y: number}} Vec */

/** @param {Vec} a @param {Vec} b @returns {Vec} */
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
/** @param {Vec} a @param {Vec} b @returns {Vec} */
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
/** @param {Vec} a @param {number} k @returns {Vec} */
export const scale = (a, k) => ({ x: a.x * k, y: a.y * k });
/** @param {Vec} a @param {Vec} b */
export const dot = (a, b) => a.x * b.x + a.y * b.y;
/** Positive when b lies on the screen-clockwise side of a (below a rightward vector). @param {Vec} a @param {Vec} b */
export const cross = (a, b) => a.x * b.y - a.y * b.x;
/** @param {Vec} a @param {Vec} b */
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
/** @param {Vec} a @param {Vec} b @returns {Vec} */
export const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** @param {Vec} a @returns {Vec} */
export function norm(a) {
  const l = Math.hypot(a.x, a.y);
  return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/** @param {number} d */
export function normDeg(d) {
  return ((d % 360) + 360) % 360;
}

/** Direction of a vector, in degrees. @param {Vec} v */
export function angleOf(v) {
  return normDeg((Math.atan2(-v.y, v.x) * 180) / Math.PI);
}

/** Vector of length r pointing at the given angle. @param {number} deg @param {number} [r] @returns {Vec} */
export function fromAngle(deg, r = 1) {
  const a = (deg * Math.PI) / 180;
  return { x: r * Math.cos(a), y: -r * Math.sin(a) };
}

/** Smallest difference between two directions, 0–180. @param {number} a @param {number} b */
export function angleDiff(a, b) {
  const d = Math.abs(normDeg(a) - normDeg(b));
  return d > 180 ? 360 - d : d;
}

/** @param {number} deg @param {number} [step] */
export function snapAngle(deg, step = 15) {
  return normDeg(Math.round(deg / step) * step);
}

/**
 * Free sectors between occupied directions, largest first.
 * @param {number[]} angles
 * @returns {{start: number, size: number, mid: number}[]}
 */
export function angularGaps(angles) {
  if (angles.length === 0) return [];
  const s = angles.map(normDeg).sort((a, b) => a - b);
  const gaps = s.map((a, i) => {
    const next = i + 1 < s.length ? s[i + 1] : s[0] + 360;
    const size = next - a;
    return { start: a, size, mid: normDeg(a + size / 2) };
  });
  return gaps.sort((a, b) => b.size - a.size);
}

/**
 * Direction for a new bond from an atom whose bonds point at `existing`.
 * IUPAC GR-3.2.1: chains zigzag at 120°, first bond 30° from the horizontal.
 * @param {number[]} existing
 */
export function nextBondAngle(existing) {
  if (existing.length === 0) return 30;
  if (existing.length === 1) {
    const c1 = normDeg(existing[0] + 120);
    const c2 = normDeg(existing[0] - 120);
    const s1 = Math.abs(Math.sin((c1 * Math.PI) / 180));
    const s2 = Math.abs(Math.sin((c2 * Math.PI) / 180));
    if (Math.abs(s1 - s2) > 1e-6) return s1 < s2 ? c1 : c2;
    return Math.cos((c1 * Math.PI) / 180) >= Math.cos((c2 * Math.PI) / 180) - 1e-9 ? c1 : c2;
  }
  return angularGaps(existing)[0].mid;
}

/**
 * Zigzag chain of n bonds from start, along dirDeg (GR-3.2.1). Returns the new points.
 * @param {Vec} start @param {number} dirDeg @param {number} n @param {number} L @param {1 | -1} [sign] side of the first bond
 */
export function zigzag(start, dirDeg, n, L, sign = 1) {
  const pts = [];
  let p = start;
  for (let k = 0; k < n; k++) {
    p = add(p, fromAngle(dirDeg + (k % 2 === 0 ? 30 : -30) * sign, L));
    pts.push(p);
  }
  return pts;
}

/** @param {Vec} center @param {number} n @param {number} startDeg @param {number} L */
function polygon(center, n, startDeg, L) {
  const R = L / (2 * Math.sin(Math.PI / n));
  return Array.from({ length: n }, (_, k) => add(center, fromAngle(startDeg + (k * 360) / n, R)));
}

/**
 * Isolated ring: vertical sides for six atoms (GR-3.4.2), a flat bottom otherwise (GR-3.4.3).
 * @param {Vec} center @param {number} n @param {number} L
 */
export function ringAt(center, n, L) {
  return polygon(center, n, n === 6 ? 30 : 270 - 180 / n, L);
}

/**
 * Ring sharing the bond a–b, on side 1 (screen right of a→b) or −1. Starts with a, b.
 * @param {Vec} a @param {Vec} b @param {number} n @param {number} side
 */
export function ringOnBond(a, b, n, side) {
  const L = dist(a, b);
  const u = norm(sub(b, a));
  const c = add(mid(a, b), scale({ x: -u.y, y: u.x }, (side * L) / (2 * Math.tan(Math.PI / n))));
  const R = L / (2 * Math.sin(Math.PI / n));
  const ta = angleOf(sub(a, c));
  const step = angleDiff(ta + 360 / n, angleOf(sub(b, c))) < 1 ? 360 / n : -360 / n;
  return [a, b, ...Array.from({ length: n - 2 }, (_, k) => add(c, fromAngle(ta + (k + 2) * step, R)))];
}

/**
 * Ring through an atom, its centre in direction dirDeg. Starts with the atom.
 * @param {Vec} atom @param {number} dirDeg @param {number} n @param {number} L
 */
export function ringOnAtom(atom, dirDeg, n, L) {
  const center = add(atom, fromAngle(dirDeg, L / (2 * Math.sin(Math.PI / n))));
  const pts = polygon(center, n, dirDeg + 180, L);
  pts[0] = { x: atom.x, y: atom.y };
  return pts;
}

/**
 * Distance from the centre of a box to its edge along a unit direction.
 * @param {Vec} u @param {number} halfW @param {number} halfH
 */
export function boxExit(u, halfW, halfH) {
  const tx = Math.abs(u.x) < 1e-9 ? Infinity : halfW / Math.abs(u.x);
  const ty = Math.abs(u.y) < 1e-9 ? Infinity : halfH / Math.abs(u.y);
  return Math.min(tx, ty);
}
