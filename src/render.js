// @ts-check
import {
  add, sub, scale, norm, mid, dot, cross, fromAngle, angleOf, angleDiff, angularGaps, boxExit,
} from './geometry.js';
import { formatChem, H_FIRST } from './chem.js';
import { findAtom, findBond, bondsOf, otherEnd, hydrogenCount, substituentSides, DEFAULT_BEND } from './model.js';

/**
 * Layout and SVG rendering of a document.
 * `layout` computes where everything goes (labels, lone pairs, charges, arrow curves);
 * `renderDoc` turns that into SVG markup. Both are pure: same document, same output.
 *
 * @typedef {import('./geometry.js').Vec} Vec
 * @typedef {import('./model.js').Doc} Doc
 * @typedef {import('./chem.js').Segment} Segment
 */

/** Drawing style in document units. The double-bond gap is 18 % of the bond, as in ACS 1996. */
export const STYLE = Object.freeze({
  bond: 40, font: 15, text: 19.5, small: 12, line: 1.6, gap: 7.2, dotR: 1.5, dotHalf: 3, wedge: 6.5, headLen: 8, headHalf: 3.6,
});
const F = STYLE.font;
const AXES = [90, 270, 0, 180]; // lone pairs: above, below, right, left of the symbol (GR-5.2)
const DIAGONALS = [45, 135, 315, 225]; // charges and δ: top right first (GR-5.1)
const SIDE_AXIS = { right: 0, left: 180, top: 90, bottom: 270 };

// ---------- text ----------

/** Arial advance widths, in em. */
const CHAR_W = /** @type {Record<string, number>} */ ({
  H: 0.722, C: 0.722, N: 0.722, O: 0.778, S: 0.667, F: 0.611, P: 0.667, B: 0.667, I: 0.278,
  l: 0.222, r: 0.333, i: 0.222, ' ': 0.278, ',': 0.278, '.': 0.278, '+': 0.584, '−': 0.584,
  '-': 0.333, δ: 0.556, Δ: 0.668, ν: 0.5, '°': 0.4, '(': 0.333, ')': 0.333,
});

/** @param {string} str @param {number} size */
export function textWidth(str, size) {
  let w = 0;
  for (const ch of str) w += CHAR_W[ch] ?? (/[A-Z]/.test(ch) ? 0.667 : /[a-z]/.test(ch) ? 0.5 : 0.556);
  return w * size;
}

/** @param {Segment[]} segs @param {number} size */
function segmentsWidth(segs, size) {
  return segs.reduce((w, s) => w + textWidth(s.text, s.mode === 'normal' ? size : 0.7 * size), 0);
}

/** @param {unknown} s */
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** @param {number} v */
const n2 = (v) => String(Math.round(v * 100) / 100);
/** @param {Vec[]} ps */
const pts = (ps) => ps.map((p) => `${n2(p.x)},${n2(p.y)}`).join(' ');

/** Segments as tspans: subscripts and superscripts are shifted with dy. @param {Segment[]} segments @param {number} size */
export function tspans(segments, size) {
  let off = 0;
  let s = '';
  for (const seg of segments) {
    const target = seg.mode === 'sub' ? 0.3 * size : seg.mode === 'sup' ? -0.4 * size : 0;
    const dy = target - off;
    off = target;
    const fs = seg.mode === 'normal' ? '' : ` font-size="${n2(0.7 * size)}"`;
    s += `<tspan${dy ? ` dy="${n2(dy)}"` : ''}${fs}>${esc(seg.text)}</tspan>`;
  }
  return s;
}

// ---------- atom labels ----------

/**
 * Side for the implicit H of a label. GR-2.1.6: when the bonds leave to the right, write HO–, H2N–.
 * @param {number[]} bondAngles @param {string} element
 */
function chooseHSide(bondAngles, element) {
  if (bondAngles.length === 0) return H_FIRST.has(element) ? 'left' : 'right';
  /** @type {[string, number][]} */
  const sides = [['right', 0], ['left', 180], ['top', 90], ['bottom', 270]];
  for (const [name, dir] of sides) if (bondAngles.every((a) => angleDiff(a, dir) > 60)) return name;
  let best = 'right';
  let clearance = -1;
  for (const [name, dir] of sides) {
    const c = Math.min(...bondAngles.map((a) => angleDiff(a, dir)));
    if (c > clearance) { clearance = c; best = name; }
  }
  return best;
}

/**
 * Carbons are not labelled once bonded (GR-2.1.2); every other atom is, with its hydrogens.
 * @param {Doc} doc @param {import('./model.js').Atom} atom @param {number[]} bondAngles
 */
function atomLabel(doc, atom, bondAngles) {
  if (atom.element === 'C' && bondAngles.length > 0) return null;
  const h = hydrogenCount(doc, atom);
  const side = h === 0 ? 'right' : atom.hSide ?? chooseHSide(bondAngles, atom.element);
  const symW = textWidth(atom.element, F);
  /** @type {Segment[]} */
  const hSegs = h === 0 ? [] : [{ text: 'H', mode: 'normal' }, ...(h > 1 ? [{ text: String(h), mode: /** @type {const} */ ('sub') }] : [])];
  const hW = segmentsWidth(hSegs, F);
  /** @type {Segment[]} */
  const sym = [{ text: atom.element, mode: 'normal' }];
  const baseline = atom.y + 0.36 * F;
  const symX = atom.x - symW / 2;
  const box = { l: symX, r: symX + symW, t: atom.y - F / 2, b: atom.y + F / 2 };
  const runs = [];
  if (side === 'right') {
    runs.push({ x: symX, y: baseline, segs: [...sym, ...hSegs] });
    box.r += hW;
  } else if (side === 'left') {
    runs.push({ x: symX - hW, y: baseline, segs: [...hSegs, ...sym] });
    box.l -= hW;
  } else {
    runs.push({ x: symX, y: baseline, segs: sym });
    const dy = side === 'top' ? -1.05 * F : 1.05 * F;
    runs.push({ x: atom.x - textWidth('H', F) / 2, y: baseline + dy, segs: hSegs });
    if (side === 'top') box.t += dy;
    else box.b += dy;
  }
  return { side, h, symHalfW: symW / 2, runs, box };
}

// ---------- layout ----------

/** @param {number[]} list @param {number} angle */
const nearest = (list, angle) => list.reduce((best, a) => (angleDiff(a, angle) < angleDiff(best, angle) ? a : best), list[0]);

/**
 * @param {Doc} doc
 */
export function layout(doc) {
  /** @type {Map<string, {atom: import('./model.js').Atom, bondAngles: number[], label: ReturnType<typeof atomLabel>}>} */
  const atoms = new Map();
  for (const atom of doc.atoms) {
    const bondAngles = [];
    for (const b of bondsOf(doc, atom.id)) {
      const o = findAtom(doc, otherEnd(b, atom.id));
      if (o) bondAngles.push(angleOf(sub(o, atom)));
    }
    atoms.set(atom.id, { atom, bondAngles, label: atomLabel(doc, atom, bondAngles) });
  }
  /** @type {Map<string, any>} */
  const marks = new Map();
  /** @type {Map<string, {atom: string, charge: number, center: Vec}>} */
  const charges = new Map();
  for (const info of atoms.values()) {
    const own = doc.marks.filter((m) => m.atom === info.atom.id);
    if (info.label) placeOnLabel(info, own, marks, charges);
    else placeOnVertex(info, own, marks, charges);
  }
  const L = { atoms, marks, charges, curved: new Map() };
  for (const ca of doc.curvedArrows) L.curved.set(ca.id, arrowGeometry(doc, L, ca));
  return L;
}

/** @param {import('./model.js').Mark} m @param {{x:number,y:number,id:string}} atom @param {Vec} center @param {Vec} along */
function electronPlacement(m, atom, center, along) {
  const dots = m.kind === 'radical' ? [center] : [add(center, scale(along, STYLE.dotHalf)), sub(center, scale(along, STYLE.dotHalf))];
  return { kind: m.kind, atom: atom.id, center, dots, out: norm(sub(center, atom)) };
}

/**
 * Lone pairs go exactly above, below, left or right of the symbol (GR-5.2);
 * charges and δ go on the diagonals, top right first (GR-5.1).
 * @param {any} info @param {import('./model.js').Mark[]} own @param {Map<string, any>} marks @param {Map<string, any>} charges
 */
function placeOnLabel(info, own, marks, charges) {
  const { atom, label, bondAngles } = info;
  /** @param {number} dir @param {number} tol */
  const blocked = (dir, tol) => bondAngles.some((/** @type {number} */ a) => angleDiff(a, dir) <= tol);
  const used = new Set(AXES.filter((ax) => blocked(ax, 45)));
  if (label.h > 0) used.add(SIDE_AXIS[/** @type {keyof typeof SIDE_AXIS} */ (label.side)]);
  const electrons = own.filter((m) => m.kind === 'lonePair' || m.kind === 'radical');
  /** @type {Map<string, number>} */
  const slot = new Map();
  for (const m of electrons) {
    if (typeof m.angle === 'number') { const ax = nearest(AXES, m.angle); slot.set(m.id, ax); used.add(ax); }
  }
  for (const m of electrons) {
    if (slot.has(m.id)) continue;
    const ax = AXES.find((a) => !used.has(a)) ?? AXES[slot.size % 4];
    slot.set(m.id, ax);
    used.add(ax);
  }
  for (const m of electrons) {
    const spot = axisSpot(atom, label.box, /** @type {number} */ (slot.get(m.id)));
    marks.set(m.id, electronPlacement(m, atom, spot.center, spot.along));
  }
  const diagUsed = new Set(DIAGONALS.filter((d) => blocked(d, 30)));
  if (atom.charge) {
    const d = typeof atom.chargeAngle === 'number' ? nearest(DIAGONALS, atom.chargeAngle) : DIAGONALS.find((x) => !diagUsed.has(x)) ?? 45;
    diagUsed.add(d);
    charges.set(atom.id, { atom: atom.id, charge: atom.charge, center: diagSpot(label.box, d, 0.3 * F, 0.25 * F) });
  }
  for (const m of own.filter((x) => x.kind === 'partial')) {
    const d = typeof m.angle === 'number' ? nearest(DIAGONALS, m.angle) : DIAGONALS.find((x) => !diagUsed.has(x)) ?? 45;
    diagUsed.add(d);
    marks.set(m.id, { kind: 'partial', atom: atom.id, value: m.value ?? 'δ+', center: diagSpot(label.box, d, 0.55 * F, 0.3 * F) });
  }
}

/** @param {Vec} atom @param {{l:number,r:number,t:number,b:number}} box @param {number} ax */
function axisSpot(atom, box, ax) {
  if (ax === 90) return { center: { x: atom.x, y: box.t - 3 }, along: { x: 1, y: 0 } };
  if (ax === 270) return { center: { x: atom.x, y: box.b + 3 }, along: { x: 1, y: 0 } };
  if (ax === 0) return { center: { x: box.r + 3.5, y: atom.y }, along: { x: 0, y: 1 } };
  return { center: { x: box.l - 3.5, y: atom.y }, along: { x: 0, y: 1 } };
}

/** @param {{l:number,r:number,t:number,b:number}} box @param {number} d @param {number} dx @param {number} dy */
function diagSpot(box, d, dx, dy) {
  const v = fromAngle(d, 1);
  return { x: v.x > 0 ? box.r + dx : box.l - dx, y: v.y < 0 ? box.t - dy : box.b + dy };
}

/**
 * On an unlabelled carbon, each annotation takes the bisector of the largest free sector.
 * @param {any} info @param {import('./model.js').Mark[]} own @param {Map<string, any>} marks @param {Map<string, any>} charges
 */
function placeOnVertex(info, own, marks, charges) {
  const { atom, bondAngles } = info;
  const occupied = [...bondAngles];
  /** @type {{type: 'charge' | 'mark', mark?: import('./model.js').Mark, angle?: number}[]} */
  const items = [];
  if (atom.charge) items.push({ type: 'charge', angle: atom.chargeAngle });
  for (const m of own) items.push({ type: 'mark', mark: m, angle: m.angle });
  const angleOfItem = new Map();
  for (const it of items) if (typeof it.angle === 'number') { angleOfItem.set(it, it.angle); occupied.push(it.angle); }
  for (const it of items) {
    if (angleOfItem.has(it)) continue;
    const gap = angularGaps(occupied)[0];
    const a = gap ? gap.mid : 90;
    angleOfItem.set(it, a);
    occupied.push(a);
  }
  for (const it of items) {
    const dir = fromAngle(angleOfItem.get(it), 1);
    if (it.type === 'charge') {
      charges.set(atom.id, { atom: atom.id, charge: atom.charge, center: add(atom, scale(dir, 0.75 * F)) });
    } else if (it.mark && it.mark.kind === 'partial') {
      marks.set(it.mark.id, { kind: 'partial', atom: atom.id, value: it.mark.value ?? 'δ+', center: add(atom, scale(dir, 0.85 * F)) });
    } else if (it.mark) {
      const center = add(atom, scale(dir, 0.6 * F));
      marks.set(it.mark.id, electronPlacement(it.mark, atom, center, { x: -dir.y, y: dir.x }));
    }
  }
}

// ---------- curved arrows ----------

/**
 * Where an anchor sits before trimming.
 * @param {Doc} doc @param {any} L @param {import('./model.js').Anchor} an
 * @returns {{p: Vec, kind: string, info?: any} | null}
 */
function anchorRaw(doc, L, an) {
  if (!an) return null;
  if ('mark' in an) { const m = L.marks.get(an.mark); return m ? { p: m.center, kind: 'mark' } : null; }
  if ('bond' in an) {
    const b = findBond(doc, an.bond);
    const A = b && findAtom(doc, b.a);
    const B = b && findAtom(doc, b.b);
    return A && B ? { p: mid(A, B), kind: 'bond' } : null;
  }
  if ('atom' in an) { const info = L.atoms.get(an.atom); return info ? { p: { x: info.atom.x, y: info.atom.y }, kind: 'atom', info } : null; }
  if ('between' in an) {
    const A = findAtom(doc, an.between[0]);
    const B = findAtom(doc, an.between[1]);
    return A && B ? { p: mid(A, B), kind: 'between' } : null;
  }
  return null;
}

/** How far the end of an arrow stays from its anchor, toward the curve. @param {any} raw @param {Vec} toward */
function endOffset(raw, toward) {
  if (raw.kind === 'mark') return 3.5;
  if (raw.kind === 'bond') return 4;
  if (raw.kind === 'between') return 0;
  const label = raw.info.label;
  if (!label) return 6;
  return boxExit(norm(sub(toward, raw.p)), label.symHalfW + 3, F / 2 + 2.5);
}

/**
 * Control points are stored in the arrow's own frame: t along the source→target line,
 * n across it (positive = to the left of the direction of travel, i.e. up for a rightward arrow).
 * When molecules move, the curve stretches and turns with its anchors.
 * @param {Vec} raw0 @param {Vec} raw3 @param {[[number, number], [number, number]]} bend
 */
export function controlPoints(raw0, raw3, bend) {
  const D = sub(raw3, raw0);
  const N = { x: D.y, y: -D.x };
  /** @param {[number, number]} b */
  const at = ([t, n]) => add(raw0, add(scale(D, t), scale(N, n)));
  return [at(bend[0]), at(bend[1])];
}

/** Inverse of controlPoints for one point. @param {Vec} raw0 @param {Vec} raw3 @param {Vec} c @returns {[number, number]} */
export function bendFromControl(raw0, raw3, c) {
  const D = sub(raw3, raw0);
  const N = { x: D.y, y: -D.x };
  const dd = dot(D, D) || 1;
  const v = sub(c, raw0);
  return [dot(v, D) / dd, dot(v, N) / dd];
}

/** @param {Doc} doc @param {any} L @param {import('./model.js').CurvedArrow} ca */
export function arrowGeometry(doc, L, ca) {
  const s = anchorRaw(doc, L, ca.from);
  const e = anchorRaw(doc, L, ca.to);
  if (!s || !e) return null;
  const [c1, c2] = controlPoints(s.p, e.p, ca.bend ?? DEFAULT_BEND);
  const p0 = add(s.p, scale(norm(sub(c1, s.p)), endOffset(s, c1)));
  const p3 = add(e.p, scale(norm(sub(c2, e.p)), endOffset(e, c2)));
  return { p0, c1, c2, p3, raw0: s.p, raw3: e.p };
}

/**
 * Default bend for a new arrow: it bulges away from the nearby atoms.
 * @param {Doc} doc @param {import('./model.js').Anchor} from @param {import('./model.js').Anchor} to
 */
export function defaultBend(doc, from, to) {
  const L = layout(doc);
  const s = anchorRaw(doc, L, from);
  const e = anchorRaw(doc, L, to);
  if (!s || !e) return /** @type {[[number, number], [number, number]]} */ (DEFAULT_BEND.map((x) => [...x]));
  // A short hop (a bond to its own atom) needs a tall arc, or the head lands on the curve's start.
  const short = Math.hypot(e.p.x - s.p.x, e.p.y - s.p.y) < 30;
  /** @type {[[number, number], [number, number]]} */
  const base = short ? [[0, 1.5], [0.15, 1]] : [[DEFAULT_BEND[0][0], DEFAULT_BEND[0][1]], [DEFAULT_BEND[1][0], DEFAULT_BEND[1][1]]];
  const m = mid(s.p, e.p);
  const D = sub(e.p, s.p);
  const N = { x: D.y, y: -D.x };
  const near = doc.atoms.filter((a) => Math.hypot(a.x - m.x, a.y - m.y) < 2 * STYLE.bond);
  if (!near.length) return base;
  const c = { x: near.reduce((t, a) => t + a.x, 0) / near.length, y: near.reduce((t, a) => t + a.y, 0) / near.length };
  const side = dot(sub(c, m), N) > 0 ? -1 : 1;
  return /** @type {[[number, number], [number, number]]} */ (base.map(([t, n]) => [t, n * side]));
}

// ---------- bonds ----------

/** @param {any} info @param {Vec} dir unit vector from the atom along the bond */
function trimFor(info, dir) {
  return info.label ? boxExit(dir, info.label.symHalfW + 1.5, F / 2) : 0;
}

/** @param {any} L @param {import('./model.js').Bond} bond */
function bondGeometry(L, bond) {
  const A = L.atoms.get(bond.a);
  const B = L.atoms.get(bond.b);
  if (!A || !B) return null;
  const a = A.atom;
  const b = B.atom;
  const u = norm(sub(b, a));
  const p = add(a, scale(u, trimFor(A, u)));
  const q = sub(b, scale(u, trimFor(B, scale(u, -1))));
  return { A, B, a, b, u, p, q };
}

/**
 * Side of the second line of a double bond (GR-1.10): toward the more substituted side;
 * centred when one end carries nothing (C=O of a ketone, isolated C=C). A trans double bond
 * inside a chain balances out but is still drawn offset, toward the first end's substituent.
 * Returns 1 for the screen side to the right of a→b, −1 for the left, 0 for centred.
 * @param {Doc} doc @param {import('./model.js').Bond} bond
 */
export function doubleBondSide(doc, bond) {
  if (bond.doubleSide === 0 || bond.doubleSide === 1 || bond.doubleSide === -1) return bond.doubleSide;
  const sides = substituentSides(doc, bond);
  const s = [...sides[0], ...sides[1]].reduce((t, x) => t + x, 0);
  if (s !== 0) return Math.sign(s);
  if (sides[0].length > 0 && sides[1].length > 0) return sides[0].find((x) => x !== 0) ?? 1;
  return 0;
}

/** @param {Vec} p @param {Vec} q @param {string} [cls] */
const lineEl = (p, q, cls) => `<line${cls ? ` class="${cls}"` : ''} x1="${n2(p.x)}" y1="${n2(p.y)}" x2="${n2(q.x)}" y2="${n2(q.y)}"/>`;
/** @param {{l:number,r:number,t:number,b:number}} box @param {number} pad @param {string} cls */
const rectEl = (box, pad, cls) => `<rect class="${cls}" x="${n2(box.l - pad)}" y="${n2(box.t - pad)}" width="${n2(box.r - box.l + 2 * pad)}" height="${n2(box.b - box.t + 2 * pad)}" rx="3"/>`;
/** @param {Vec} c @param {number} r @param {string} cls */
const circleEl = (c, r, cls) => `<circle class="${cls}" cx="${n2(c.x)}" cy="${n2(c.y)}" r="${r}"/>`;

/** @param {Doc} doc @param {import('./model.js').Bond} bond @param {any} g */
function bondShape(doc, bond, g) {
  const { u, p, q } = g;
  const nrm = { x: -u.y, y: u.x };
  if (bond.order === 1 && bond.stereo === 'wedge') {
    const w = STYLE.wedge / 2;
    return `<polygon class="wedge" points="${pts([p, add(q, scale(nrm, w)), sub(q, scale(nrm, w))])}"/>`;
  }
  if (bond.order === 1 && bond.stereo === 'hash') {
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const count = Math.max(4, Math.round(len / 3.2));
    let s = '';
    for (let i = 1; i <= count; i++) {
      const t = i / count;
      const c = add(p, scale(sub(q, p), t));
      const half = (STYLE.wedge / 2) * t + 0.3;
      s += lineEl(add(c, scale(nrm, half)), sub(c, scale(nrm, half)));
    }
    return `<g class="hash">${s}</g>`;
  }
  if (bond.order === 1) return `<g class="bd">${lineEl(p, q)}</g>`;
  if (bond.order === 3) {
    const o = scale(nrm, STYLE.gap * 0.8);
    return `<g class="bd">${lineEl(p, q)}${lineEl(add(p, o), add(q, o))}${lineEl(sub(p, o), sub(q, o))}</g>`;
  }
  const side = doubleBondSide(doc, bond);
  if (side === 0) {
    const o = scale(nrm, STYLE.gap / 2);
    return `<g class="bd">${lineEl(add(p, o), add(q, o))}${lineEl(sub(p, o), sub(q, o))}</g>`;
  }
  const o = scale(nrm, STYLE.gap * side);
  const shA = g.A.label ? 0 : STYLE.gap * 0.9;
  const shB = g.B.label ? 0 : STYLE.gap * 0.9;
  return `<g class="bd">${lineEl(p, q)}${lineEl(add(add(p, o), scale(u, shA)), sub(add(q, o), scale(u, shB)))}</g>`;
}

// ---------- marks, charges, arrows ----------

/** @param {any} pos */
function markShape(pos) {
  if (pos.kind === 'partial') {
    return `<text class="pc" x="${n2(pos.center.x)}" y="${n2(pos.center.y + 0.36 * STYLE.small)}">${esc(pos.value)}</text>`;
  }
  return `<g class="lp">${pos.dots.map((/** @type {Vec} */ d) => `<circle cx="${n2(d.x)}" cy="${n2(d.y)}" r="${STYLE.dotR}"/>`).join('')}</g>`;
}

/** "+", "−", "2+": written top right as a superscript, never circled. @param {any} c */
function chargeShape(c) {
  const mag = Math.abs(c.charge);
  const text = `${mag > 1 ? mag : ''}${c.charge > 0 ? '+' : '−'}`;
  return `<text class="chgt" x="${n2(c.center.x)}" y="${n2(c.center.y + 0.36 * STYLE.small)}">${text}</text>`;
}

/** @param {any} g */
function curveParts(g) {
  let t = norm(sub(g.p3, g.c2));
  if (t.x === 0 && t.y === 0) t = norm(sub(g.p3, g.c1));
  const nn = { x: -t.y, y: t.x };
  const H = STYLE.headLen;
  const W = STYLE.headHalf;
  const base = sub(g.p3, scale(t, H * 0.75));
  const p = (/** @type {Vec} */ v) => `${n2(v.x)},${n2(v.y)}`;
  const path = `M${p(g.p0)} C${p(g.c1)} ${p(g.c2)} ${p(base)}`;
  const full = `M${p(g.p0)} C${p(g.c1)} ${p(g.c2)} ${p(g.p3)}`;
  const inside = Math.sign(cross(t, sub(g.c1, g.p3))) || 1;
  const barb = scale(nn, -inside);
  /** @param {1 | 2} electrons */
  const head = (electrons) => (electrons === 1
    ? pts([g.p3, add(sub(g.p3, scale(t, H)), scale(barb, W)), base])
    : pts([g.p3, add(sub(g.p3, scale(t, H)), scale(nn, W)), base, sub(sub(g.p3, scale(t, H)), scale(nn, W))]));
  return { path, full, head };
}

/** @param {import('./model.js').ReactionArrow} ra */
function reactionShape(ra) {
  const A = { x: ra.x1, y: ra.y1 };
  const B = { x: ra.x2, y: ra.y2 };
  const u = norm(sub(B, A));
  const up = { x: u.y, y: -u.x };
  const H = 10;
  const W = 4;
  /** @param {Vec} tip @param {Vec} dir */
  const head = (tip, dir) => {
    const n = { x: dir.y, y: -dir.x };
    return `<polygon class="rxh" points="${pts([tip, add(sub(tip, scale(dir, H)), scale(n, W)), sub(tip, scale(dir, H * 0.75)), sub(sub(tip, scale(dir, H)), scale(n, W))])}"/>`;
  };
  /** @param {Vec} tip @param {Vec} dir @param {Vec} side */
  const half = (tip, dir, side) => `<polygon class="rxh" points="${pts([tip, add(sub(tip, scale(dir, H)), scale(side, W)), sub(tip, scale(dir, H * 0.75))])}"/>`;
  let m = '';
  if (ra.kind === 'equilibrium') {
    const o = scale(up, 2.5);
    m = lineEl(add(A, o), sub(add(B, o), scale(u, H * 0.75))) + half(add(B, o), u, up)
      + lineEl(sub(B, o), add(sub(A, o), scale(u, H * 0.75))) + half(sub(A, o), scale(u, -1), scale(up, -1));
  } else if (ra.kind === 'resonance') {
    m = lineEl(add(A, scale(u, H * 0.75)), sub(B, scale(u, H * 0.75))) + head(B, u) + head(A, scale(u, -1));
  } else if (ra.kind === 'retro') {
    const o = scale(up, 2.8);
    const end = sub(B, scale(u, 5));
    m = lineEl(add(A, o), add(end, o)) + lineEl(sub(A, o), sub(end, o))
      + `<polyline points="${pts([add(sub(B, scale(u, 9)), scale(up, 7.5)), B, sub(sub(B, scale(u, 9)), scale(up, 7.5))])}"/>`;
  } else {
    m = lineEl(A, sub(B, scale(u, H * 0.75))) + head(B, u);
    if (ra.kind === 'noReaction') {
      const c = mid(A, B);
      const a1 = add(scale(u, 5), scale(up, 6));
      const a2 = sub(scale(u, 5), scale(up, 6));
      m += lineEl(add(c, a1), sub(c, a1)) + lineEl(add(c, a2), sub(c, a2));
    }
  }
  const size = STYLE.small;
  const c = mid(A, B);
  // One line per step ("1. …", "2. …"): above, the last line sits on the arrow; below, the first.
  const lines = (/** @type {string} */ s) => (s ?? '').split('\n').filter((l) => l.trim()).map(formatChem);
  const above = lines(ra.above);
  const below = lines(ra.below);
  const lh = 1.25 * size;
  const placed = [
    ...above.map((segs, i) => ({ segs, at: add(c, scale(up, 8 + (above.length - 1 - i) * lh)) })),
    ...below.map((segs, i) => ({ segs, at: sub(c, scale(up, 7 + 0.72 * size + i * lh)) })),
  ];
  const text = placed.map(({ segs, at }) => `<text class="cond" x="${n2(at.x)}" y="${n2(at.y)}">${tspans(segs, size)}</text>`).join('');
  const box = { l: Math.min(A.x, B.x) - 2, r: Math.max(A.x, B.x) + 2, t: Math.min(A.y, B.y) - 8, b: Math.max(A.y, B.y) + 8 };
  for (const { segs, at } of placed) {
    const w = segmentsWidth(segs, size) / 2;
    box.l = Math.min(box.l, at.x - w - 2);
    box.r = Math.max(box.r, at.x + w + 2);
    box.t = Math.min(box.t, at.y - 0.75 * size);
    box.b = Math.max(box.b, at.y + 0.3 * size);
  }
  return { markup: `<g class="rx">${m}</g>${text}`, box };
}

// ---------- whole document ----------

/**
 * @param {Doc} doc
 * @param {{selection?: {kind: string, id: string, ids?: string[]} | null, hover?: {kind: string, id: string} | null,
 *   preview?: {points: Vec[]} | null, marquee?: {l: number, t: number, r: number, b: number} | null,
 *   plain?: boolean, warnings?: string[]}} [opts] plain: drawing only, without the invisible click areas (for export);
 *   warnings: ids of objects to outline
 */
export function renderDoc(doc, opts = {}) {
  const L = layout(doc);
  const sel = opts.selection ?? null;
  const hov = opts.hover ?? null;
  const group = new Set(sel?.kind === 'group' ? sel.ids : []);
  /** @param {string} kind @param {string} id @param {boolean} [inGroup] */
  const st = (kind, id, inGroup = false) => {
    const s = inGroup || (!!sel && sel.kind === kind && sel.id === id);
    const h = !!hov && hov.kind === kind && hov.id === id;
    return { lit: s || h, cls: `obj${s ? ' is-sel' : ''}${h ? ' is-hov' : ''}` };
  };
  /** @param {string} kind @param {string} id @param {{lit: boolean, cls: string}} s @param {string} inner */
  const wrap = (kind, id, s, inner) => `<g class="${s.cls}" data-kind="${kind}" data-id="${esc(id)}">${inner}</g>`;
  let out = '';

  for (const b of doc.bonds) {
    const g = bondGeometry(L, b);
    if (!g) continue;
    const s = st('bond', b.id, group.has(b.a) && group.has(b.b));
    out += wrap('bond', b.id, s, `${s.lit ? lineEl(g.p, g.q, 'hl') : ''}${bondShape(doc, b, g)}${lineEl(g.p, g.q, 'hit')}`);
  }
  for (const info of L.atoms.values()) {
    const { atom, label } = info;
    const s = st('atom', atom.id, group.has(atom.id));
    const hl = s.lit ? (label ? rectEl(label.box, 2, 'hl') : circleEl(atom, 9, 'hl')) : '';
    const vis = label ? label.runs.map((r) => `<text class="lbl" x="${n2(r.x)}" y="${n2(r.y)}">${tspans(r.segs, F)}</text>`).join('') : '';
    const hit = label ? rectEl(label.box, 3, 'hit') : circleEl(atom, 8, 'hit');
    out += wrap('atom', atom.id, s, hl + vis + hit);
  }
  for (const m of doc.marks) {
    const pos = L.marks.get(m.id);
    if (!pos) continue;
    const s = st('mark', m.id);
    out += wrap('mark', m.id, s, `${s.lit ? circleEl(pos.center, 6, 'hl') : ''}${markShape(pos)}${circleEl(pos.center, 5, 'hit')}`);
  }
  for (const c of L.charges.values()) {
    const s = st('charge', c.atom);
    out += wrap('charge', c.atom, s, `${s.lit ? circleEl(c.center, 7, 'hl') : ''}${chargeShape(c)}${circleEl(c.center, 6, 'hit')}`);
  }
  for (const t of doc.texts) {
    const size = t.size ?? STYLE.text;
    const segs = formatChem(t.text);
    const w = segmentsWidth(segs, size);
    const box = { l: t.x - w / 2, r: t.x + w / 2, t: t.y - size / 2, b: t.y + size / 2 };
    const s = st('text', t.id, group.has(t.id));
    out += wrap('text', t.id, s, `${s.lit ? rectEl(box, 2, 'hl') : ''}<text class="txt" x="${n2(t.x)}" y="${n2(t.y + 0.36 * size)}" font-size="${n2(size)}">${tspans(segs, size)}</text>${rectEl(box, 3, 'hit')}`);
  }
  for (const ra of doc.reactionArrows) {
    const r = reactionShape(ra);
    const s = st('rxn', ra.id, group.has(ra.id));
    out += wrap('rxn', ra.id, s, `${s.lit ? rectEl(r.box, 3, 'hl') : ''}${r.markup}${rectEl(r.box, 2, 'hit')}`);
  }
  for (const ca of doc.curvedArrows) {
    const g = L.curved.get(ca.id);
    if (!g) continue;
    const parts = curveParts(g);
    const s = st('curved', ca.id);
    out += wrap('curved', ca.id, s, `${s.lit ? `<path class="hl" d="${parts.full}"/>` : ''}<path class="ea" d="${parts.path}"/><polygon class="eh" points="${parts.head(ca.electrons)}"/><path class="hit" d="${parts.full}"/>`);
  }
  if (sel && (sel.kind === 'curved' || sel.kind === 'handle')) {
    const g = L.curved.get(sel.id);
    if (g) {
      out += `<path class="guide" d="M${n2(g.p0.x)},${n2(g.p0.y)} L${n2(g.c1.x)},${n2(g.c1.y)} M${n2(g.p3.x)},${n2(g.p3.y)} L${n2(g.c2.x)},${n2(g.c2.y)}"/>`;
      [g.c1, g.c2].forEach((c, i) => {
        out += `<g class="handle" data-kind="handle" data-id="${esc(sel.id)}" data-index="${i}"><rect x="${n2(c.x - 4)}" y="${n2(c.y - 4)}" width="8" height="8"/></g>`;
      });
    }
  }
  for (const id of opts.warnings ?? []) {
    const info = L.atoms.get(id);
    const g = L.curved.get(id);
    const ra = doc.reactionArrows.find((r) => r.id === id);
    if (info) out += info.label ? rectEl(info.label.box, 4, 'warn') : circleEl(info.atom, 11, 'warn');
    else if (g) out += `<path class="warn" d="${curveParts(g).full}"/>`;
    else if (ra) out += rectEl(reactionShape(ra).box, 4, 'warn');
  }
  const ghost = opts.preview?.points;
  if (ghost && ghost.length > 1) out += `<polyline class="ghost" points="${pts(ghost)}"/>${circleEl(ghost[ghost.length - 1], 3, 'ghost-dot')}`;
  if (opts.marquee) out += rectEl(opts.marquee, 0, 'marquee');
  if (opts.plain) out = out.replace(/<(?:line|rect|circle|path) class="hit"[^>]*\/>/g, '');
  return { markup: out, layout: L };
}

/** Extent of everything drawn, for "fit to view". @param {Doc} doc @param {ReturnType<typeof layout>} L */
export function docBounds(doc, L) {
  /** @type {number[]} */ const xs = [];
  /** @type {number[]} */ const ys = [];
  for (const info of L.atoms.values()) {
    if (info.label) { xs.push(info.label.box.l, info.label.box.r); ys.push(info.label.box.t, info.label.box.b); }
    else { xs.push(info.atom.x); ys.push(info.atom.y); }
  }
  for (const m of L.marks.values()) { xs.push(m.center.x); ys.push(m.center.y); }
  for (const c of L.charges.values()) { xs.push(c.center.x); ys.push(c.center.y); }
  for (const g of L.curved.values()) if (g) for (const p of [g.p0, g.c1, g.c2, g.p3]) { xs.push(p.x); ys.push(p.y); }
  for (const r of doc.reactionArrows) { const box = reactionShape(r).box; xs.push(box.l, box.r); ys.push(box.t, box.b); }
  for (const t of doc.texts) { xs.push(t.x - 10, t.x + 10); ys.push(t.y - 10, t.y + 10); }
  if (!xs.length) return null;
  return { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) };
}
