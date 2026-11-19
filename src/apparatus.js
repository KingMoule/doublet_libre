// @ts-check
/**
 * Lab glassware: the library of pieces and how they fit together.
 * A piece is drawn in its own frame, in drawing units (a bond is 40), then turned by its angle
 * about its origin and moved to (x, y). Its joints are where it fits another piece:
 * a ground-glass joint takes a joint of the other sex facing it; a seat (the bottom of a flask)
 * goes into a cup (a heating mantle). Pieces whose joints meet form one set-up.
 * @typedef {import('./model.js').Doc} Doc
 * @typedef {import('./model.js').Piece} Piece
 * @typedef {{x: number, y: number, dir: number, kind: 'joint' | 'seat', male: boolean}} Joint
 *   dir: the way the joint faces, in degrees (0 right, 90 down)
 * @typedef {Joint & {piece: string}} WorldJoint
 * @typedef {{d: string, box: {l: number, t: number, r: number, b: number}, joints: Joint[]}} PieceDef
 */

/** @type {Record<string, PieceDef>} */
export const PIECES = {
  // Round-bottom flask: a socket at the top of the neck, a round bottom that sits in a mantle.
  flask: {
    d: 'M-7.5 -52 L-6 -44 L-6 -25.3 A26 26 0 1 0 6 -25.3 L6 -44 L7.5 -52',
    box: { l: -26, t: -52, r: 26, b: 26 },
    joints: [
      { x: 0, y: -52, dir: -90, kind: 'joint', male: false },
      { x: 0, y: 26, dir: 90, kind: 'seat', male: true },
    ],
  },
  // Allihn (bulb) condenser: a cone at the bottom, a socket at the top, water in low and out high.
  allihn: {
    d: 'M-7.5 -90 L-6 -82 L-6 -76 Q-13 -74 -13 -66 L-13 58 Q-13 66 -5 68 L-5 80 L-4.5 90'
      + ' M4.5 90 L5 80 L5 68 Q13 66 13 58 L13 -66 Q13 -74 6 -76 L6 -82 L7.5 -90'
      + ' M-3 -76 L-3 -52 M3 -76 L3 -52 M-3 -38 L-3 -22 M3 -38 L3 -22 M-3 -8 L-3 8 M3 -8 L3 8'
      + ' M-3 22 L-3 38 M3 22 L3 38 M-3 52 L-3 80 M3 52 L3 80'
      + [-45, -15, 15, 45].map((y) => ` M-7 ${y} a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0`).join('')
      + ' M13 46 L22 46 M13 54 L22 54 M-13 -56 L-22 -56 M-13 -48 L-22 -48',
    box: { l: -22, t: -90, r: 22, b: 90 },
    joints: [
      { x: 0, y: 80, dir: 90, kind: 'joint', male: true },
      { x: 0, y: -90, dir: -90, kind: 'joint', male: false },
    ],
  },
  // Heating mantle: a cup that takes the bottom of a flask, and a knob.
  mantle: {
    d: 'M-30 0 L-42 0 L-42 44 Q-42 50 -36 50 L36 50 Q42 50 42 44 L42 0 L30 0 A30 30 0 0 1 -30 0 Z'
      + ' M28 40 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0',
    box: { l: -42, t: 0, r: 42, b: 50 },
    joints: [{ x: 0, y: 28, dir: -90, kind: 'seat', male: false }],
  },
};

/** The pieces of each glassware tool, in the order of its option window. */
export const FAMILIES = {
  synthesis: ['flask', 'allihn'],
  heating: ['mantle'],
};

const SNAP = 15;
const PLACE = 40;
const SAME = 0.5;

/** Hundredths are enough, and keep the saved file readable. @param {number} v */
const r2 = (v) => Math.round(v * 100) / 100;
/** @param {number} a */
const norm = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
/** @param {{x: number, y: number}} v @param {number} deg */
const turnVec = (v, deg) => {
  const r = (deg * Math.PI) / 180;
  return { x: v.x * Math.cos(r) - v.y * Math.sin(r), y: v.x * Math.sin(r) + v.y * Math.cos(r) };
};

/** Where a piece's joints are in the drawing, and which way they face. @param {Piece} g @returns {WorldJoint[]} */
export function worldJoints(g) {
  return (PIECES[g.kind]?.joints ?? []).map((j) => {
    const p = turnVec(j, g.angle);
    return { ...j, x: g.x + p.x, y: g.y + p.y, dir: norm(j.dir + g.angle), piece: g.id };
  });
}

/** Two joints that can fit together: same kind, other sex. @param {Joint} a @param {Joint} b */
const fits = (a, b) => a.kind === b.kind && a.male !== b.male;
/** Two joints fitted together: at the same spot, facing each other. @param {Joint} a @param {Joint} b */
const meet = (a, b) => fits(a, b) && Math.hypot(a.x - b.x, a.y - b.y) < SAME && Math.abs(norm(a.dir - b.dir + 180)) < 1;

/** The pieces joined to a piece, through joints that meet, itself included. @param {Doc} doc @param {string} id */
export function assembly(doc, id) {
  const joints = doc.apparatus.flatMap(worldJoints);
  const seen = new Set([id]);
  const todo = [id];
  while (todo.length) {
    const cur = todo.pop();
    for (const j of joints) {
      if (j.piece !== cur) continue;
      for (const k of joints) if (!seen.has(k.piece) && meet(j, k)) { seen.add(k.piece); todo.push(k.piece); }
    }
  }
  return seen;
}

/** Turns pieces by deg degrees about a point. @param {Doc} doc @param {Set<string>} ids @param {{x: number, y: number}} c @param {number} deg */
export function turn(doc, ids, c, deg) {
  c = { x: c.x, y: c.y }; // c may be one of the pieces turned
  for (const g of doc.apparatus) {
    if (!ids.has(g.id)) continue;
    const p = turnVec({ x: g.x - c.x, y: g.y - c.y }, deg);
    g.x = r2(c.x + p.x);
    g.y = r2(c.y + p.y);
    g.angle = r2(norm(g.angle + deg));
  }
}

/** Turns and moves pieces so that their joint `from` fits onto `to`. @param {Doc} doc @param {Set<string>} ids @param {Joint} from @param {Joint} to */
function fitOnto(doc, ids, from, to) {
  turn(doc, ids, from, norm(to.dir + 180 - from.dir));
  for (const g of doc.apparatus) if (ids.has(g.id)) { g.x = r2(g.x + to.x - from.x); g.y = r2(g.y + to.y - from.y); }
}

/** Joints of the other pieces that nothing fits into yet. @param {Doc} doc @param {Set<string>} ids */
function freeJoints(doc, ids) {
  const all = doc.apparatus.flatMap(worldJoints);
  return all.filter((j) => !ids.has(j.piece) && !all.some((k) => k.piece !== j.piece && meet(j, k)));
}

/**
 * Snaps pieces being dragged together: if one of their joints comes within 15 units of a free
 * joint it fits, they turn and move so the two meet. Returns whether they snapped.
 * @param {Doc} doc @param {Set<string>} ids
 */
export function snap(doc, ids) {
  const free = freeJoints(doc, ids);
  let best = null;
  let bestDist = SNAP;
  for (const m of doc.apparatus.filter((g) => ids.has(g.id)).flatMap(worldJoints)) {
    for (const f of free) {
      const dd = Math.hypot(m.x - f.x, m.y - f.y);
      if (fits(m, f) && dd < bestDist) { best = [m, f]; bestDist = dd; }
    }
  }
  if (best) fitOnto(doc, ids, best[0], best[1]);
  return !!best;
}

/**
 * Fits a piece just put down onto the free joint nearest the spot touched (within 40 units),
 * as when touching the neck of a flask with a condenser. Returns whether it fitted.
 * @param {Doc} doc @param {string} id @param {{x: number, y: number}} p
 */
export function place(doc, id, p) {
  const g = doc.apparatus.find((x) => x.id === id);
  if (!g) return false;
  const ids = new Set([id]);
  const own = worldJoints(g);
  const near = freeJoints(doc, ids)
    .filter((f) => own.some((m) => fits(m, f)))
    .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  if (!near || Math.hypot(near.x - p.x, near.y - p.y) > PLACE) return false;
  fitOnto(doc, ids, /** @type {Joint} */ (own.find((m) => fits(m, near))), near);
  return true;
}

/** The four corners of a piece's box, in the drawing. @param {Piece} g */
export function corners(g) {
  const b = PIECES[g.kind]?.box ?? { l: -10, t: -10, r: 10, b: 10 };
  return [[b.l, b.t], [b.r, b.t], [b.r, b.b], [b.l, b.b]].map(([x, y]) => {
    const p = turnVec({ x, y }, g.angle);
    return { x: g.x + p.x, y: g.y + p.y };
  });
}
