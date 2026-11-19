// @ts-check
import { implicitHydrogens } from './chem.js';

/**
 * Document model.
 * A document is a flat set of objects linked by id. Molecules are not stored:
 * they are the connected groups of atoms. A curved arrow points at electrons
 * (a lone pair, a bond, an atom), never at coordinates, so it follows its molecules.
 * Functions that change a document mutate it in place; the editor records a snapshot first.
 *
 * @typedef {{id: string, element: string, x: number, y: number, charge: number,
 *   chargeAngle?: number, hSide?: 'right' | 'left' | 'top' | 'bottom'}} Atom
 * @typedef {{id: string, a: string, b: string, order: 1 | 2 | 3,
 *   stereo?: 'wedge' | 'hash', doubleSide?: -1 | 0 | 1}} Bond
 * @typedef {{id: string, atom: string, kind: 'lonePair' | 'radical' | 'partial',
 *   value?: string, angle?: number}} Mark
 * @typedef {{mark: string} | {bond: string} | {atom: string} | {between: [string, string]}} Anchor
 * @typedef {{id: string, from: Anchor, to: Anchor, electrons: 1 | 2,
 *   bend: [[number, number], [number, number]]}} CurvedArrow
 * @typedef {{id: string, x1: number, y1: number, x2: number, y2: number,
 *   kind: 'forward' | 'equilibrium' | 'resonance' | 'retro' | 'noReaction',
 *   above: string, below: string}} ReactionArrow
 * @typedef {{id: string, x: number, y: number, text: string, size?: number}} TextBox
 * @typedef {{version: 1, style: {}, atoms: Atom[], bonds: Bond[],
 *   marks: Mark[], curvedArrows: CurvedArrow[], reactionArrows: ReactionArrow[],
 *   texts: TextBox[]}} Doc
 */

/** Control points of a new curved arrow, in the arrow's own frame (see render.controlPoints). */
export const DEFAULT_BEND = /** @type {[[number, number], [number, number]]} */ ([[0.15, 0.45], [0.85, 0.45]]);

const ID_PREFIX = /** @type {const} */ ({
  atoms: 'a', bonds: 'b', marks: 'm', curvedArrows: 'ca', reactionArrows: 'ra', texts: 't',
});
const LISTS = /** @type {(keyof typeof ID_PREFIX)[]} */ (Object.keys(ID_PREFIX));

/** @returns {Doc} */
export function emptyDoc() {
  return {
    version: 1, style: {},
    atoms: [], bonds: [], marks: [], curvedArrows: [], reactionArrows: [], texts: [],
  };
}

/** @param {Doc} doc @param {keyof typeof ID_PREFIX} list */
export function nextId(doc, list) {
  const prefix = ID_PREFIX[list];
  let max = 0;
  for (const o of doc[list]) {
    const n = Number(o.id.slice(prefix.length));
    if (o.id.startsWith(prefix) && Number.isInteger(n) && n > max) max = n;
  }
  return prefix + (max + 1);
}

// ---------- queries ----------

/** @param {Doc} doc @param {string} id */
export const findAtom = (doc, id) => doc.atoms.find((a) => a.id === id);
/** @param {Doc} doc @param {string} id */
export const findBond = (doc, id) => doc.bonds.find((b) => b.id === id);
/** @param {Doc} doc @param {string} atomId */
export const bondsOf = (doc, atomId) => doc.bonds.filter((b) => b.a === atomId || b.b === atomId);
/** @param {Bond} bond @param {string} atomId */
export const otherEnd = (bond, atomId) => (bond.a === atomId ? bond.b : bond.a);
/** @param {Doc} doc @param {string} atomId */
export const neighbors = (doc, atomId) => bondsOf(doc, atomId).map((b) => otherEnd(b, atomId));

/** @param {Doc} doc @param {string} x @param {string} y */
export function bondBetween(doc, x, y) {
  return doc.bonds.find((b) => (b.a === x && b.b === y) || (b.a === y && b.b === x));
}

/** @param {Doc} doc @param {string} atomId */
export function bondOrderSum(doc, atomId) {
  return bondsOf(doc, atomId).reduce((s, b) => s + b.order, 0);
}

/** @param {Doc} doc @param {Atom} atom */
export function hydrogenCount(doc, atom) {
  const radicals = doc.marks.filter((m) => m.atom === atom.id && m.kind === 'radical').length;
  return implicitHydrogens(atom.element, bondOrderSum(doc, atom.id), atom.charge, radicals);
}

/**
 * For each end of a bond, the side of each of its other neighbours:
 * +1 on the screen right of a→b, −1 on the left. Used to place double bonds and fused rings.
 * @param {Doc} doc @param {Bond} bond @returns {[number[], number[]]}
 */
export function substituentSides(doc, bond) {
  const a = findAtom(doc, bond.a);
  const b = findAtom(doc, bond.b);
  if (!a || !b) return [[], []];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  /** @param {string} end @param {string} other */
  const sides = (end, other) => neighbors(doc, end).filter((id) => id !== other).map((id) => {
    const n = /** @type {Atom} */ (findAtom(doc, id));
    return Math.sign(dx * (n.y - a.y) - dy * (n.x - a.x));
  });
  return [sides(bond.a, bond.b), sides(bond.b, bond.a)];
}

/** Atoms connected to atomId, itself included. @param {Doc} doc @param {string} atomId */
export function component(doc, atomId) {
  const seen = new Set([atomId]);
  const stack = [atomId];
  while (stack.length) {
    const id = /** @type {string} */ (stack.pop());
    for (const n of neighbors(doc, id)) if (!seen.has(n)) { seen.add(n); stack.push(n); }
  }
  return seen;
}

/**
 * The atom whose midpoint with atomId lies within tol of p: the partner of a bond that an
 * arrow dropped there would form.
 * @param {Doc} doc @param {string} atomId @param {{x: number, y: number}} p @param {number} [tol]
 */
export function formingPartner(doc, atomId, p, tol = 10) {
  const a = findAtom(doc, atomId);
  if (!a) return null;
  let best = null;
  let bestD = tol;
  for (const o of doc.atoms) {
    const d = Math.hypot((a.x + o.x) / 2 - p.x, (a.y + o.y) / 2 - p.y);
    if (o.id !== atomId && d < bestD) { best = o.id; bestD = d; }
  }
  return best;
}

/** @param {Doc} doc @param {Anchor} an */
export function anchorExists(doc, an) {
  if (!an || typeof an !== 'object') return false;
  if ('mark' in an) return doc.marks.some((m) => m.id === an.mark);
  if ('bond' in an) return doc.bonds.some((b) => b.id === an.bond);
  if ('atom' in an) return doc.atoms.some((a) => a.id === an.atom);
  if ('between' in an) return an.between.every((id) => doc.atoms.some((a) => a.id === id));
  return false;
}

// ---------- changes ----------

/** @param {Doc} doc @param {{element?: string, x: number, y: number, charge?: number}} p */
export function addAtom(doc, { element = 'C', x, y, charge = 0 }) {
  /** @type {Atom} */
  const atom = { id: nextId(doc, 'atoms'), element, x, y, charge };
  doc.atoms.push(atom);
  return atom;
}

/** @param {Doc} doc @param {string} a @param {string} b @param {1 | 2 | 3} [order] */
export function addBond(doc, a, b, order = 1) {
  if (a === b) throw new Error('a bond needs two different atoms');
  const existing = bondBetween(doc, a, b);
  if (existing) return existing;
  /** @type {Bond} */
  const bond = { id: nextId(doc, 'bonds'), a, b, order };
  doc.bonds.push(bond);
  return bond;
}

/**
 * Atoms at the given points, bonded in sequence (and back to the first when closed).
 * A point within 8 units of an existing atom reuses it: that is how chains and rings join.
 * @param {Doc} doc @param {{x: number, y: number}[]} points @param {boolean} [closed] @param {boolean} [reuse]
 */
export function addPath(doc, points, closed = false, reuse = true) {
  const near = (/** @type {{x: number, y: number}} */ p) => (reuse ? doc.atoms.find((a) => Math.hypot(a.x - p.x, a.y - p.y) < 8) : undefined);
  const ids = points.map((p) => (near(p) ?? addAtom(doc, { x: p.x, y: p.y })).id);
  const bonds = [];
  for (let i = 0; i < ids.length - (closed ? 0 : 1); i++) {
    const next = ids[(i + 1) % ids.length];
    if (next !== ids[i]) bonds.push(addBond(doc, ids[i], next));
  }
  return { ids, bonds };
}

/**
 * Ring through the given points, reusing atoms already there (fused rings).
 * An aromatic ring gets a double bond wherever both atoms are still free of one (Kekulé form).
 * @param {Doc} doc @param {{x: number, y: number}[]} points @param {boolean} [aromatic] @param {boolean} [reuse]
 */
export function addRing(doc, points, aromatic = false, reuse = true) {
  const { ids, bonds } = addPath(doc, points, true, reuse);
  if (aromatic) {
    const hasDouble = (/** @type {string} */ id) => bondsOf(doc, id).some((b) => b.order === 2);
    for (let i = 1; i <= bonds.length; i++) {
      const b = bonds[i % bonds.length];
      if (b.order === 1 && !hasDouble(b.a) && !hasDouble(b.b)) setBondOrder(doc, b.id, 2);
    }
  }
  return ids;
}

/** @param {Doc} doc @param {string} atomId @param {Mark['kind']} kind @param {{value?: string, angle?: number}} [extra] */
export function addMark(doc, atomId, kind, extra = {}) {
  /** @type {Mark} */
  const mark = { id: nextId(doc, 'marks'), atom: atomId, kind, ...extra };
  doc.marks.push(mark);
  return mark;
}

/** Partial charge of an atom, one step further: none → δ+ → δ− → none. @param {Doc} doc @param {string} atomId */
export function cyclePartial(doc, atomId) {
  const m = doc.marks.find((x) => x.atom === atomId && x.kind === 'partial');
  if (!m) addMark(doc, atomId, 'partial', { value: 'δ+' });
  else if (m.value === 'δ+') m.value = 'δ−';
  else removeMark(doc, m.id);
}

/** @param {Doc} doc @param {Anchor} from @param {Anchor} to @param {1 | 2} [electrons] @param {CurvedArrow['bend']} [bend] */
export function addCurvedArrow(doc, from, to, electrons = 2, bend = DEFAULT_BEND) {
  /** @type {CurvedArrow} */
  const arrow = { id: nextId(doc, 'curvedArrows'), from, to, electrons, bend: [[...bend[0]], [...bend[1]]] };
  doc.curvedArrows.push(arrow);
  return arrow;
}

/** @param {Doc} doc @param {Omit<ReactionArrow, 'id'>} p */
export function addReactionArrow(doc, p) {
  const arrow = { id: nextId(doc, 'reactionArrows'), ...p };
  doc.reactionArrows.push(arrow);
  return arrow;
}

/** @param {Doc} doc @param {Omit<TextBox, 'id'>} p */
export function addText(doc, p) {
  const text = { id: nextId(doc, 'texts'), ...p };
  doc.texts.push(text);
  return text;
}

/** Curved arrows whose source or target disappeared are removed with it. @param {Doc} doc */
export function pruneArrows(doc) {
  doc.curvedArrows = doc.curvedArrows.filter((c) => anchorExists(doc, c.from) && anchorExists(doc, c.to));
}

/** @param {Doc} doc @param {string} id */
export function removeAtom(doc, id) {
  doc.bonds = doc.bonds.filter((b) => b.a !== id && b.b !== id);
  doc.marks = doc.marks.filter((m) => m.atom !== id);
  doc.atoms = doc.atoms.filter((a) => a.id !== id);
  pruneArrows(doc);
}

/**
 * Removes a bond. Carbons left alone without charge or marks go too, as in ChemDraw.
 * @param {Doc} doc @param {string} id
 */
export function removeBond(doc, id) {
  const bond = findBond(doc, id);
  if (!bond) return;
  doc.bonds = doc.bonds.filter((b) => b.id !== id);
  for (const end of [bond.a, bond.b]) {
    const atom = findAtom(doc, end);
    const alone = atom && bondsOf(doc, end).length === 0 && !doc.marks.some((m) => m.atom === end);
    if (atom && alone && atom.element === 'C' && atom.charge === 0) removeAtom(doc, end);
  }
  pruneArrows(doc);
}

/** @param {Doc} doc @param {string} id */
export function removeMark(doc, id) {
  doc.marks = doc.marks.filter((m) => m.id !== id);
  pruneArrows(doc);
}

/** @param {Doc} doc @param {string} id */
export function removeCurvedArrow(doc, id) {
  doc.curvedArrows = doc.curvedArrows.filter((c) => c.id !== id);
}

/** @param {Doc} doc @param {string} id */
export function removeReactionArrow(doc, id) {
  doc.reactionArrows = doc.reactionArrows.filter((r) => r.id !== id);
}

/** @param {Doc} doc @param {string} id */
export function removeText(doc, id) {
  doc.texts = doc.texts.filter((t) => t.id !== id);
}

/** Atoms, texts and reaction arrows lying entirely inside a rectangle. @param {Doc} doc @param {{l:number,t:number,r:number,b:number}} r */
export function idsInRect(doc, r) {
  /** @param {number} x @param {number} y */
  const inside = (x, y) => x >= r.l && x <= r.r && y >= r.t && y <= r.b;
  return [
    ...doc.atoms.filter((a) => inside(a.x, a.y)),
    ...doc.texts.filter((t) => inside(t.x, t.y)),
    ...doc.reactionArrows.filter((ra) => inside(ra.x1, ra.y1) && inside(ra.x2, ra.y2)),
  ].map((o) => o.id);
}

/** Moves the atoms, texts and reaction arrows whose ids are given. @param {Doc} doc @param {Set<string>} ids @param {number} dx @param {number} dy */
export function moveObjects(doc, ids, dx, dy) {
  for (const a of doc.atoms) if (ids.has(a.id)) { a.x += dx; a.y += dy; }
  for (const t of doc.texts) if (ids.has(t.id)) { t.x += dx; t.y += dy; }
  for (const ra of doc.reactionArrows) if (ids.has(ra.id)) { ra.x1 += dx; ra.x2 += dx; ra.y1 += dy; ra.y2 += dy; }
}

/**
 * The part of a document made of the given atoms, texts and reaction arrows, as a copy. Bonds, marks
 * and curved arrows come along when everything they point at is in it.
 * @param {Doc} doc @param {Set<string>} ids
 */
export function extract(doc, ids) {
  const part = emptyDoc();
  part.atoms = doc.atoms.filter((a) => ids.has(a.id));
  part.bonds = doc.bonds.filter((b) => ids.has(b.a) && ids.has(b.b));
  part.marks = doc.marks.filter((m) => ids.has(m.atom));
  part.texts = doc.texts.filter((t) => ids.has(t.id));
  part.reactionArrows = doc.reactionArrows.filter((r) => ids.has(r.id));
  part.curvedArrows = doc.curvedArrows.filter((c) => anchorExists(part, c.from) && anchorExists(part, c.to));
  return /** @type {Doc} */ (structuredClone(part));
}

/**
 * Adds a copy of a part made by extract, moved by (dx, dy), with fresh ids.
 * Returns the ids of its atoms, texts and reaction arrows, as a selection.
 * @param {Doc} doc @param {Doc} part @param {number} dx @param {number} dy
 */
export function paste(doc, part, dx, dy) {
  /** @type {Map<string, string>} */ const ids = new Map();
  /** @param {keyof typeof ID_PREFIX} list @param {string} old */
  const fresh = (list, old) => { const id = nextId(doc, list); ids.set(old, id); return id; };
  const to = (/** @type {string} */ old) => /** @type {string} */ (ids.get(old));
  /** @param {Anchor} an @returns {Anchor} */
  const anchor = (an) => ('mark' in an ? { mark: to(an.mark) } : 'bond' in an ? { bond: to(an.bond) }
    : 'atom' in an ? { atom: to(an.atom) } : { between: [to(an.between[0]), to(an.between[1])] });
  const p = /** @type {Doc} */ (structuredClone(part));
  for (const a of p.atoms) doc.atoms.push({ ...a, id: fresh('atoms', a.id), x: a.x + dx, y: a.y + dy });
  for (const b of p.bonds) doc.bonds.push({ ...b, id: fresh('bonds', b.id), a: to(b.a), b: to(b.b) });
  for (const m of p.marks) doc.marks.push({ ...m, id: fresh('marks', m.id), atom: to(m.atom) });
  for (const t of p.texts) doc.texts.push({ ...t, id: fresh('texts', t.id), x: t.x + dx, y: t.y + dy });
  for (const r of p.reactionArrows) {
    doc.reactionArrows.push({ ...r, id: fresh('reactionArrows', r.id), x1: r.x1 + dx, y1: r.y1 + dy, x2: r.x2 + dx, y2: r.y2 + dy });
  }
  for (const c of p.curvedArrows) doc.curvedArrows.push({ ...c, id: fresh('curvedArrows', c.id), from: anchor(c.from), to: anchor(c.to) });
  return [...p.atoms, ...p.texts, ...p.reactionArrows].map((o) => to(o.id));
}

/** @param {Doc} doc @param {string} id @param {1 | 2 | 3} order */
export function setBondOrder(doc, id, order) {
  const b = findBond(doc, id);
  if (!b) return;
  b.order = order;
  if (order !== 1) delete b.stereo;
}

/** @param {Doc} doc @param {string} id */
export function cycleBondOrder(doc, id) {
  const b = findBond(doc, id);
  if (b) setBondOrder(doc, id, b.order === 3 ? 1 : /** @type {2 | 3} */ (b.order + 1));
}

/** @param {Doc} doc @param {string} id @param {'none' | 'wedge' | 'hash'} stereo */
export function setStereo(doc, id, stereo) {
  const b = findBond(doc, id);
  if (!b) return;
  if (stereo === 'none') delete b.stereo;
  else { b.stereo = stereo; b.order = 1; }
}

/**
 * Gives a bond the kind chosen in the Bond tool: an order, or a wedge. The same wedge again
 * turns it round, as its narrow end marks the stereocentre (IUPAC ST-0.3).
 * @param {Doc} doc @param {string} id @param {1 | 2 | 3 | 'wedge' | 'hash'} kind
 */
export function setBondKind(doc, id, kind) {
  const b = findBond(doc, id);
  if (!b) return;
  if (typeof kind === 'number') { setBondOrder(doc, id, kind); delete b.stereo; return; }
  if (b.stereo === kind) [b.a, b.b] = [b.b, b.a];
  setStereo(doc, id, kind);
}

/** @param {Doc} doc @param {string} id @param {string} element */
export function setElement(doc, id, element) {
  const a = findAtom(doc, id);
  if (a) { a.element = element; delete a.hSide; }
}

// ---------- history ----------

/** @param {number} [limit] */
export function createHistory(limit = 200) {
  return { past: /** @type {string[]} */ ([]), future: /** @type {string[]} */ ([]), limit };
}

/**
 * Saves the state before a change. Accepts a document or an already serialized one.
 * @param {ReturnType<typeof createHistory>} h @param {Doc | string} doc
 */
export function record(h, doc) {
  h.past.push(typeof doc === 'string' ? doc : serialize(doc));
  if (h.past.length > h.limit) h.past.shift();
  h.future = [];
}

/** @param {ReturnType<typeof createHistory>} h @param {Doc} current @returns {Doc | null} */
export function undo(h, current) {
  const prev = h.past.pop();
  if (prev === undefined) return null;
  h.future.push(serialize(current));
  return JSON.parse(prev);
}

/** @param {ReturnType<typeof createHistory>} h @param {Doc} current @returns {Doc | null} */
export function redo(h, current) {
  const next = h.future.pop();
  if (next === undefined) return null;
  h.past.push(serialize(current));
  return JSON.parse(next);
}

// ---------- files ----------

/** @param {Doc} doc */
export function serialize(doc) {
  return JSON.stringify(doc);
}

/** @param {any} doc @returns {string[]} problems found, empty when the document is valid */
export function validateDoc(doc) {
  if (!doc || typeof doc !== 'object') return ['not a document'];
  const errors = [];
  if (doc.version !== 1) errors.push(`unsupported version ${doc.version}`);
  for (const list of LISTS) if (!Array.isArray(doc[list])) errors.push(`missing list ${list}`);
  if (errors.length) return errors;
  const ids = new Set();
  for (const list of LISTS) {
    for (const o of doc[list]) {
      if (!o || typeof o.id !== 'string') errors.push(`object without id in ${list}`);
      else if (ids.has(o.id)) errors.push(`duplicate id ${o.id}`);
      else ids.add(o.id);
    }
  }
  const atomIds = new Set(doc.atoms.map((/** @type {Atom} */ a) => a.id));
  for (const b of doc.bonds) if (!atomIds.has(b.a) || !atomIds.has(b.b)) errors.push(`bond ${b.id} points to a missing atom`);
  for (const m of doc.marks) if (!atomIds.has(m.atom)) errors.push(`mark ${m.id} points to a missing atom`);
  for (const c of doc.curvedArrows) {
    if (!anchorExists(doc, c.from) || !anchorExists(doc, c.to)) errors.push(`arrow ${c.id} has a dangling anchor`);
  }
  return errors;
}

/** @param {string} text @returns {Doc} */
export function parseDoc(text) {
  const doc = JSON.parse(text);
  const errors = validateDoc(doc);
  if (errors.length) throw new Error(errors.join('; '));
  return doc;
}
