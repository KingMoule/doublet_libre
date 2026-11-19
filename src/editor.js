// @ts-check
import { fr } from './i18n/fr.js';
import * as M from './model.js';
import { renderDoc, defaultBend, bendFromControl, docBounds, esc, STYLE } from './render.js';
import { ELEMENT_KEYS } from './chem.js';
import {
  add, sub, dist, cross, angleOf, angleDiff, angularGaps, fromAngle, snapAngle, nextBondAngle,
  zigzag, ringAt, ringOnBond, ringOnAtom,
} from './geometry.js';
import { sampleSN2 } from './sample.js';
import { exportSVG, docFromText, setPngDpi, POINTS_PER_UNIT } from './io.js';

/**
 * Interactive editor: tools, pointer and keyboard handling, properties panel.
 * Every change goes through `commit`, which records a snapshot for undo first.
 * @typedef {{kind: string, id: string, index?: number, ids?: string[]}} Hit
 */

const STORAGE_KEY = 'doublet.document.v1';
const PROPOSAL_URL = 'https://claude.ai/artifact/YERTS84ftfKtSyN5jv4F6S';
const TOOLS = /** @type {const} */ (['select', 'bond', 'chain', 'ring', 'atom', 'lonePair', 'charge', 'partial', 'curved', 'rxn', 'text', 'erase']);
const ELEMENTS = ['C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I', 'H'];
const TEXT_ICON = (/** @type {string} */ t) => `<text x="11" y="15.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="currentColor">${t}</text>`;
const ICONS = {
  select: '<path d="M6 3 L6 17 L9.5 13.5 L12 19 L14 18 L11.5 12.5 L16 12.5 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  bond: '<path d="M4 17 L18 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  chain: '<path d="M2 15 L7 7 L12 15 L17 7 L21 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  ring: '<path d="M11 3 L18 7 L18 15 L11 19 L4 15 L4 7 Z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  atom: TEXT_ICON('N'),
  lonePair: '<circle cx="8" cy="11" r="2.2" fill="currentColor"/><circle cx="14" cy="11" r="2.2" fill="currentColor"/>',
  charge: '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 11 H14.5 M11 7.5 V14.5" stroke="currentColor" stroke-width="1.4"/>',
  partial: TEXT_ICON('δ'),
  rxn: '<path d="M3 11 H17" stroke="currentColor" stroke-width="1.6"/><path d="M15 7 L20 11 L15 15 Z" fill="currentColor"/>',
  text: TEXT_ICON('T'),
  curved: '<path d="M4 17 C5 6 15 4 17 13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14 12.5 L17.3 14.6 L18.6 10.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  erase: '<path d="M9 18 L3.5 12.5 L12 4 L19 11 L12 18 Z M7 9 L14 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
};

/** @param {EventTarget | null} el @returns {Hit | null} */
function hitOf(el) {
  const g = el instanceof Element ? el.closest('[data-kind]') : null;
  if (!(g instanceof SVGElement || g instanceof HTMLElement)) return null;
  const { kind, id, index } = g.dataset;
  if (!kind || !id) return null;
  return { kind, id, index: index === undefined ? undefined : Number(index) };
}

/** @param {Hit | null} a @param {Hit | null} b */
const sameHit = (a, b) => (a === null || b === null ? a === b : a.kind === b.kind && a.id === b.id && a.index === b.index);

function shell() {
  const tools = TOOLS.map((t) => `<button type="button" class="tool" data-tool="${t}" aria-pressed="false" title="${fr.tools[t]} (${fr.toolKeys[t]})"><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">${ICONS[t]}</svg><span class="tool-name">${fr.tools[t]}</span><kbd>${fr.toolKeys[t]}</kbd></button>`).join('');
  return `
  <header class="top">
    <b class="name">${fr.appName}</b><span class="badge">${fr.badge}</span>
    <div class="actions">
      <button type="button" id="btn-undo">${fr.actions.undo}</button>
      <button type="button" id="btn-redo">${fr.actions.redo}</button>
      <button type="button" id="btn-fit">${fr.actions.fit}</button>
      <button type="button" id="btn-sample">${fr.actions.sample}</button>
      <details class="menu" id="file-menu"><summary>${fr.actions.file}</summary><div>
        <button type="button" id="btn-clear">${fr.actions.clear}</button>
        <button type="button" id="btn-open">${fr.actions.open}<kbd>Ctrl+O</kbd></button>
        <button type="button" id="btn-save">${fr.actions.save}<kbd>Ctrl+S</kbd></button>
        <button type="button" id="btn-png">${fr.actions.png}</button>
        <button type="button" id="btn-svg">${fr.actions.svg}</button>
        <button type="button" id="btn-copy">${fr.actions.copy}<kbd>Ctrl+C</kbd></button>
      </div></details>
      <input type="file" id="file-input" accept=".json,.svg,application/json,image/svg+xml" hidden>
      <a href="${PROPOSAL_URL}" target="_blank" rel="noopener">${fr.actions.proposal}</a>
    </div>
  </header>
  <nav class="tools" aria-label="${fr.toolsLabel}">${tools}</nav>
  <main class="stage">
    <svg id="canvas" role="application" aria-label="${fr.canvasLabel}">
      <defs><pattern id="hexp" width="34.64" height="60" patternUnits="userSpaceOnUse"><path class="hexline" d="M0,10 L17.32,0 L34.64,10 M0,10 L0,30 M0,30 L17.32,40 L34.64,30 M17.32,40 L17.32,60"/></pattern></defs>
      <rect id="bg" fill="url(#hexp)"/>
      <g id="content"></g>
    </svg>
  </main>
  <aside class="panel" id="panel" aria-live="polite"></aside>
  <footer class="status"><span id="status"></span><span id="zoom" class="zoom"></span></footer>`;
}

/** @returns {M.Doc | null} */
function loadSaved() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? M.parseDoc(text) : null;
  } catch {
    return null;
  }
}

/** @param {HTMLElement} root */
export function startEditor(root) {
  root.innerHTML = shell();
  /** @template {Element} T @param {string} s @returns {T} */
  const $ = (s) => /** @type {T} */ (root.querySelector(s));
  /** @type {SVGSVGElement} */ const svg = $('#canvas');
  /** @type {SVGGElement} */ const content = $('#content');
  /** @type {SVGRectElement} */ const bg = $('#bg');
  /** @type {HTMLElement} */ const panel = $('#panel');
  /** @type {HTMLElement} */ const statusEl = $('#status');
  /** @type {HTMLElement} */ const zoomEl = $('#zoom');

  const S = {
    doc: loadSaved() ?? sampleSN2(),
    history: M.createHistory(),
    /** @type {typeof TOOLS[number]} */ tool: 'select',
    /** @type {Hit | null} */ hover: null,
    /** @type {Hit | null} */ selection: null,
    /** @type {any} */ drag: null,
    /** @type {{points: {x:number,y:number}[]} | null} */ preview: null,
    /** @type {{l:number,t:number,r:number,b:number} | null} */ marquee: null,
    ring: { size: 6, aromatic: false },
    element: 'C',
    /** @type {any} */ layout: null,
    view: { x: 0, y: 0, w: 800, h: 500 },
    space: false,
    fieldSession: false,
    /** @type {string | null} */ lastField: null,
  };

  // ---------- drawing and view ----------

  function render() {
    const r = renderDoc(S.doc, { selection: S.selection, hover: S.hover, preview: S.preview, marquee: S.marquee });
    content.innerHTML = r.markup;
    S.layout = r.layout;
  }

  function size() {
    const r = svg.getBoundingClientRect();
    return { w: r.width || 800, h: r.height || 500 };
  }

  function applyView() {
    const v = S.view;
    svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
    bg.setAttribute('x', String(v.x));
    bg.setAttribute('y', String(v.y));
    bg.setAttribute('width', String(v.w));
    bg.setAttribute('height', String(v.h));
    zoomEl.textContent = `${Math.round((100 * size().w) / v.w)} %`;
  }

  function fit() {
    const { w: cw, h: ch } = size();
    const ar = ch / cw;
    const b = docBounds(S.doc, S.layout);
    const minW = 420;
    if (!b) {
      S.view = { x: -minW / 2, y: (-minW * ar) / 2, w: minW, h: minW * ar };
    } else {
      const pad = 40;
      const w = Math.max(b.r - b.l + 2 * pad, (b.b - b.t + 2 * pad) / ar, minW);
      S.view = { x: (b.l + b.r) / 2 - w / 2, y: (b.t + b.b) / 2 - (w * ar) / 2, w, h: w * ar };
    }
    applyView();
  }

  /** @param {{clientX: number, clientY: number}} e */
  function toDoc(e) {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  // ---------- changes ----------

  /** @param {(doc: M.Doc) => void} fn */
  function commit(fn) {
    M.record(S.history, S.doc);
    fn(S.doc);
    afterChange();
  }

  /** @param {M.Doc} doc */
  function replaceDoc(doc) {
    M.record(S.history, S.doc);
    S.doc = doc;
    S.selection = null;
    afterChange();
  }

  /** @param {Hit | null} h */
  function exists(h) {
    if (!h) return false;
    const d = S.doc;
    switch (h.kind) {
      case 'atom': return !!M.findAtom(d, h.id);
      case 'bond': return !!M.findBond(d, h.id);
      case 'mark': return d.marks.some((m) => m.id === h.id);
      case 'charge': return !!M.findAtom(d, h.id)?.charge;
      case 'curved': case 'handle': return d.curvedArrows.some((c) => c.id === h.id);
      case 'rxn': return d.reactionArrows.some((r) => r.id === h.id);
      case 'text': return d.texts.some((t) => t.id === h.id);
      case 'group':
        h.ids = (h.ids ?? []).filter((id) => M.findAtom(d, id));
        return h.ids.length > 0;
      default: return false;
    }
  }

  function afterChange() {
    if (!exists(S.selection)) S.selection = null;
    if (!exists(S.hover)) S.hover = null;
    save();
    render();
    renderPanel();
    updateButtons();
    updateStatus();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, M.serialize(S.doc));
    } catch {
      /* storage unavailable: the drawing still works, it is just not kept */
    }
  }

  /** @param {M.Doc} d @param {Hit} h */
  function deleteHit(d, h) {
    switch (h.kind) {
      case 'atom': M.removeAtom(d, h.id); break;
      case 'bond': M.removeBond(d, h.id); break;
      case 'mark': M.removeMark(d, h.id); break;
      case 'charge': { const a = M.findAtom(d, h.id); if (a) { a.charge = 0; delete a.chargeAngle; } break; }
      case 'curved': case 'handle': M.removeCurvedArrow(d, h.id); break;
      case 'rxn': M.removeReactionArrow(d, h.id); break;
      case 'text': M.removeText(d, h.id); break;
      case 'group': for (const id of h.ids ?? []) M.removeAtom(d, id); break;
      default: break;
    }
  }

  /** @param {M.Doc} d @param {string} atomId */
  function bondAngles(d, atomId) {
    const a = /** @type {M.Atom} */ (M.findAtom(d, atomId));
    return M.neighbors(d, atomId).map((id) => angleOf(sub(/** @type {M.Atom} */ (M.findAtom(d, id)), a)));
  }

  /**
   * Points a bond or chain drag would add, from its first atom (or the empty spot clicked).
   * A click gives one bond in the free direction; a bond drag snaps to 15°; a chain drag
   * zigzags along the drag, one bond per 35 units, first bond away from existing bonds.
   * @param {any} D @param {{x:number,y:number}} p @param {{clientX:number, clientY:number}} e
   */
  function sketch(D, p, e) {
    const a = D.atomId ? M.findAtom(S.doc, D.atomId) : null;
    const start = a ?? D.start;
    const existing = a ? bondAngles(S.doc, a.id) : [];
    if (!D.moved) return [start, add(start, fromAngle(nextBondAngle(existing), STYLE.bond))];
    if (D.type === 'bond') {
      const target = a && atomUnder(e, a.id);
      return [start, target ?? add(start, fromAngle(snapAngle(angleOf(sub(p, start))), STYLE.bond))];
    }
    const v = sub(p, start);
    const n = Math.max(1, Math.round(Math.hypot(v.x, v.y) / (STYLE.bond * Math.cos(Math.PI / 6))));
    const dir = snapAngle(angleOf(v), 30);
    const clear = (/** @type {number} */ s) => Math.min(360, ...existing.map((x) => angleDiff(x, dir + 30 * s)));
    return [start, ...zigzag(start, dir, n, STYLE.bond, clear(-1) > clear(1) ? -1 : 1)];
  }

  /**
   * Where a curved arrow starts: a lone pair or single electron, a bond, or an atom
   * (its electron mark nearest to the pointer).
   * @param {Hit | null} hit @param {{x:number,y:number}} p @returns {M.Anchor | null}
   */
  function arrowSource(hit, p) {
    if (hit?.kind === 'bond') return { bond: hit.id };
    const marks = hit?.kind === 'mark' ? S.doc.marks.filter((m) => m.id === hit.id)
      : hit?.kind === 'atom' ? S.doc.marks.filter((m) => m.atom === hit.id) : [];
    const electrons = marks.filter((m) => m.kind !== 'partial');
    if (!electrons.length) return null;
    const near = electrons.reduce((a, b) => (dist(S.layout.marks.get(a.id).center, p) <= dist(S.layout.marks.get(b.id).center, p) ? a : b));
    return { mark: near.id };
  }

  /**
   * Where a curved arrow ends: an atom, a bond, or the midpoint of the bond it forms.
   * @param {{clientX:number, clientY:number}} e @param {{x:number,y:number}} p @param {M.Anchor} from @returns {M.Anchor | null}
   */
  function arrowTarget(e, p, from) {
    const hit = hitOf(document.elementFromPoint(e.clientX, e.clientY));
    const fromAtom = 'mark' in from ? S.doc.marks.find((m) => m.id === from.mark)?.atom : undefined;
    if (hit?.kind === 'atom') return hit.id === fromAtom ? null : { atom: hit.id };
    if (hit?.kind === 'bond') return 'bond' in from && from.bond === hit.id ? null : { bond: hit.id };
    const partner = fromAtom ? M.formingPartner(S.doc, fromAtom, p) : null;
    return fromAtom && partner ? { between: [fromAtom, partner] } : null;
  }

  /** End of a new reaction arrow: dragged (15° steps, at least 40 long) or 80 to the right on a click. @param {any} D @param {{x:number,y:number}} p */
  function rxnEnd(D, p) {
    if (!D.moved) return add(D.start, { x: 80, y: 0 });
    return add(D.start, fromAngle(snapAngle(angleOf(sub(p, D.start))), Math.max(40, dist(p, D.start))));
  }

  /** Ring tool: on an atom (spiro or chain end), on a bond (fused, away from its neighbours), or alone. @param {M.Doc} d @param {Hit | null} hit @param {{x:number,y:number}} p */
  function addRingAt(d, hit, p) {
    const { size, aromatic } = S.ring;
    const atom = hit?.kind === 'atom' ? M.findAtom(d, hit.id) : null;
    const bond = hit?.kind === 'bond' ? M.findBond(d, hit.id) : null;
    let points;
    if (atom) {
      const gap = angularGaps(bondAngles(d, atom.id))[0];
      points = ringOnAtom(atom, gap ? gap.mid : 90, size, STYLE.bond);
    } else if (bond) {
      const A = /** @type {M.Atom} */ (M.findAtom(d, bond.a));
      const B = /** @type {M.Atom} */ (M.findAtom(d, bond.b));
      const s = M.substituentSides(d, bond).flat().reduce((t, x) => t + x, 0);
      points = ringOnBond(A, B, size, s ? -Math.sign(s) : Math.sign(cross(sub(B, A), sub(p, A))) || 1);
    } else {
      points = ringAt(p, size, STYLE.bond);
    }
    M.addRing(d, points, aromatic && size === 6);
  }

  /** @param {{clientX: number, clientY: number}} e @param {string} exclude */
  function atomUnder(e, exclude) {
    const h = hitOf(document.elementFromPoint(e.clientX, e.clientY));
    return h && h.kind === 'atom' && h.id !== exclude ? M.findAtom(S.doc, h.id) ?? null : null;
  }

  // ---------- pointer ----------

  /** @param {PointerEvent} e */
  function startPan(e) {
    userMovedView = true;
    S.drag = { type: 'pan', cx: e.clientX, cy: e.clientY, view: { ...S.view } };
    svg.classList.add('panning');
  }

  svg.addEventListener('pointerdown', (e) => {
    if (e.button === 2) return;
    const p = toDoc(e);
    const hit = hitOf(e.target);
    try { svg.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    if (e.button === 1 || S.space) { startPan(e); return; }
    if (S.tool === 'erase') {
      if (hit && hit.kind !== 'handle') commit((d) => deleteHit(d, hit));
      return;
    }
    if (S.tool === 'bond' || S.tool === 'chain') {
      if (hit?.kind === 'bond' && S.tool === 'bond') commit((d) => M.cycleBondOrder(d, hit.id));
      else if (hit?.kind === 'atom' || !hit) S.drag = { type: S.tool, atomId: hit?.id ?? null, start: p, moved: false };
      return;
    }
    if (S.tool === 'ring') {
      commit((d) => addRingAt(d, hit, p));
      return;
    }
    if (S.tool === 'rxn') {
      if (!hit) S.drag = { type: 'rxnNew', start: p, moved: false };
      return;
    }
    if (S.tool === 'text') {
      if (hit?.kind === 'text') { S.selection = hit; render(); renderPanel(); return; }
      if (hit) return;
      commit((d) => { S.selection = { kind: 'text', id: M.addText(d, { x: p.x, y: p.y, text: '+' }).id }; });
      return;
    }
    if (S.tool === 'curved') {
      const from = arrowSource(hit, p);
      if (from) S.drag = { type: 'curved', from, start: p, moved: false };
      return;
    }
    if (S.tool === 'atom') {
      if (hit?.kind === 'atom') commit((d) => M.setElement(d, hit.id, S.element));
      else if (!hit) commit((d) => { M.addAtom(d, { element: S.element, x: p.x, y: p.y }); });
      return;
    }
    if (S.tool === 'lonePair' || S.tool === 'charge' || S.tool === 'partial') {
      if (hit?.kind !== 'atom') return;
      const id = hit.id;
      const tool = S.tool;
      commit((d) => {
        const a = /** @type {M.Atom} */ (M.findAtom(d, id));
        if (tool === 'lonePair') M.addMark(d, id, e.shiftKey ? 'radical' : 'lonePair');
        else if (tool === 'charge') a.charge += e.shiftKey ? -1 : 1;
        else M.cyclePartial(d, id);
      });
      return;
    }
    if (!hit) {
      S.selection = null;
      S.drag = { type: 'marquee', start: p, moved: false };
      render();
      renderPanel();
      return;
    }
    const snap = M.serialize(S.doc);
    if (hit.kind === 'handle') {
      S.drag = { type: 'handle', id: hit.id, index: hit.index ?? 0, start: p, snap, moved: false };
      return;
    }
    const sel = S.selection;
    const grouped = sel?.kind === 'group' && !!sel.ids?.includes(hit.id);
    if (hit.kind === 'atom' && e.shiftKey) {
      const ids = sel?.kind === 'group' ? sel.ids ?? [] : sel?.kind === 'atom' ? [sel.id] : [];
      const next = ids.includes(hit.id) ? ids.filter((x) => x !== hit.id) : [...ids, hit.id];
      S.selection = next.length ? { kind: 'group', id: 'group', ids: next } : null;
      render();
      renderPanel();
      return;
    }
    if (!grouped) S.selection = { kind: hit.kind, id: hit.id };
    if (hit.kind === 'atom') {
      const ids = grouped ? new Set(sel?.ids) : e.altKey ? new Set([hit.id]) : M.component(S.doc, hit.id);
      S.drag = { type: 'move', ids, last: p, start: p, snap, moved: false };
    } else if (hit.kind === 'bond') {
      const b = M.findBond(S.doc, hit.id);
      if (b) S.drag = { type: 'move', ids: M.component(S.doc, b.a), last: p, start: p, snap, moved: false };
    } else if (hit.kind === 'mark') {
      S.drag = { type: 'rotateMark', id: hit.id, start: p, snap, moved: false };
    } else if (hit.kind === 'charge') {
      S.drag = { type: 'rotateCharge', id: hit.id, start: p, snap, moved: false };
    } else if (hit.kind === 'rxn' || hit.kind === 'text') {
      S.drag = { type: hit.kind === 'rxn' ? 'moveRxn' : 'moveText', id: hit.id, last: p, start: p, snap, moved: false };
    }
    render();
    renderPanel();
    updateStatus();
  });

  svg.addEventListener('pointermove', (e) => {
    const D = S.drag;
    if (!D) {
      const hit = hitOf(e.target);
      if (!sameHit(hit, S.hover)) { S.hover = hit; render(); updateStatus(); }
      return;
    }
    if (D.type === 'pan') {
      const k = D.view.w / size().w;
      S.view = { ...D.view, x: D.view.x - (e.clientX - D.cx) * k, y: D.view.y - (e.clientY - D.cy) * k };
      applyView();
      return;
    }
    const p = toDoc(e);
    if (!D.moved) {
      if (dist(p, D.start) < 3) return;
      D.moved = true;
      if (D.snap) M.record(S.history, D.snap);
    }
    const d = S.doc;
    switch (D.type) {
      case 'move':
        M.moveAtoms(d, D.ids, p.x - D.last.x, p.y - D.last.y);
        D.last = p;
        break;
      case 'moveRxn': {
        const r = d.reactionArrows.find((x) => x.id === D.id);
        if (r) { const dx = p.x - D.last.x; const dy = p.y - D.last.y; r.x1 += dx; r.x2 += dx; r.y1 += dy; r.y2 += dy; }
        D.last = p;
        break;
      }
      case 'moveText': {
        const t = d.texts.find((x) => x.id === D.id);
        if (t) { t.x += p.x - D.last.x; t.y += p.y - D.last.y; }
        D.last = p;
        break;
      }
      case 'handle': {
        const g = S.layout?.curved.get(D.id);
        const ca = d.curvedArrows.find((c) => c.id === D.id);
        if (g && ca) {
          const bend = /** @type {M.CurvedArrow['bend']} */ (ca.bend.map((x) => [x[0], x[1]]));
          bend[D.index] = bendFromControl(g.raw0, g.raw3, p);
          ca.bend = bend;
        }
        break;
      }
      case 'rotateMark': {
        const m = d.marks.find((x) => x.id === D.id);
        const a = m && M.findAtom(d, m.atom);
        if (m && a) m.angle = Math.round(angleOf(sub(p, a)));
        break;
      }
      case 'rotateCharge': {
        const a = M.findAtom(d, D.id);
        if (a) a.chargeAngle = Math.round(angleOf(sub(p, a)));
        break;
      }
      case 'bond':
      case 'chain':
        S.preview = { points: sketch(D, p, e) };
        break;
      case 'curved':
        S.preview = { points: [D.start, p] };
        break;
      case 'rxnNew':
        S.preview = { points: [D.start, rxnEnd(D, p)] };
        break;
      case 'marquee':
        S.marquee = { l: Math.min(p.x, D.start.x), r: Math.max(p.x, D.start.x), t: Math.min(p.y, D.start.y), b: Math.max(p.y, D.start.y) };
        break;
      default:
        break;
    }
    render();
  });

  /** @param {PointerEvent} e */
  function endDrag(e) {
    const D = S.drag;
    S.drag = null;
    S.preview = null;
    svg.classList.remove('panning');
    try { svg.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    return D;
  }

  svg.addEventListener('pointerup', (e) => {
    const D = endDrag(e);
    if (!D || D.type === 'pan') return;
    const p = toDoc(e);
    if (D.type === 'bond' || D.type === 'chain') {
      const points = sketch(D, p, e);
      commit((d) => M.addPath(d, points));
      return;
    }
    if (D.type === 'rxnNew') {
      const end = rxnEnd(D, p);
      commit((d) => {
        const ra = M.addReactionArrow(d, { x1: D.start.x, y1: D.start.y, x2: end.x, y2: end.y, kind: 'forward', above: '', below: '' });
        S.selection = { kind: 'rxn', id: ra.id };
      });
      return;
    }
    if (D.type === 'curved') {
      const to = D.moved ? arrowTarget(e, p, D.from) : null;
      if (!to) { render(); return; }
      const single = e.shiftKey || ('mark' in D.from && S.doc.marks.find((m) => m.id === D.from.mark)?.kind === 'radical');
      commit((d) => { M.addCurvedArrow(d, D.from, to, single ? 1 : 2, defaultBend(d, D.from, to)); });
      return;
    }
    if (D.type === 'marquee') {
      const r = S.marquee;
      S.marquee = null;
      const ids = r ? S.doc.atoms.filter((a) => a.x >= r.l && a.x <= r.r && a.y >= r.t && a.y <= r.b).map((a) => a.id) : [];
      S.selection = ids.length ? { kind: 'group', id: 'group', ids } : null;
      render();
      renderPanel();
      return;
    }
    if (D.moved) afterChange();
    else { render(); renderPanel(); }
  });

  svg.addEventListener('pointercancel', (e) => { endDrag(e); render(); });
  svg.addEventListener('pointerleave', () => {
    if (!S.drag && S.hover) { S.hover = null; render(); updateStatus(); }
  });

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = toDoc(e);
    const v = S.view;
    const w = Math.min(6000, Math.max(60, v.w * Math.exp(e.deltaY * 0.0015)));
    const k = w / v.w;
    S.view = { x: p.x - (p.x - v.x) * k, y: p.y - (p.y - v.y) * k, w, h: v.h * k };
    applyView();
  }, { passive: false });

  // Keep the centre of the view when the canvas changes size; refit until the user moves the view.
  let userMovedView = false;
  svg.addEventListener('wheel', () => { userMovedView = true; }, { passive: true });
  new ResizeObserver(() => {
    if (!userMovedView) { fit(); return; }
    const { w, h } = size();
    const cy = S.view.y + S.view.h / 2;
    S.view.h = (S.view.w * h) / w;
    S.view.y = cy - S.view.h / 2;
    applyView();
  }).observe(svg);

  // ---------- keyboard ----------

  /** @param {EventTarget | null} t */
  const typing = (t) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const k = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && k.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
    if (ctrl && k.toLowerCase() === 'y') { e.preventDefault(); doRedo(); return; }
    if (ctrl && k.toLowerCase() === 's') { e.preventDefault(); saveDoc(); return; }
    if (ctrl && k.toLowerCase() === 'o') { e.preventDefault(); fileInput.click(); return; }
    if (ctrl && k.toLowerCase() === 'c' && !String(window.getSelection())) { e.preventDefault(); copyImage(); return; }
    if (ctrl || e.altKey) return;
    if (k === ' ') { S.space = true; svg.classList.add('pannable'); e.preventDefault(); return; }
    if (k === 'Escape') { S.selection = null; render(); renderPanel(); return; }
    const target = S.hover ?? S.selection;
    if (k === 'Delete' || k === 'Backspace') {
      if (target && target.kind !== 'handle') { e.preventDefault(); commit((d) => deleteHit(d, target)); }
      return;
    }
    if (target?.kind === 'atom') {
      const atomId = target.id;
      const el = ELEMENT_KEYS[k.toLowerCase()];
      if (el) { commit((d) => M.setElement(d, atomId, el)); return; }
      if (k === '+' || k === '=' || k === '-') {
        commit((d) => { const a = M.findAtom(d, atomId); if (a) a.charge += k === '-' ? -1 : 1; });
        return;
      }
    }
    if (target?.kind === 'bond') {
      const bondId = target.id;
      if (k === '1' || k === '2' || k === '3') { commit((d) => M.setBondOrder(d, bondId, /** @type {1|2|3} */ (Number(k)))); return; }
      if (k.toLowerCase() === 'w' || k.toLowerCase() === 'h') {
        const want = k.toLowerCase() === 'w' ? 'wedge' : 'hash';
        commit((d) => { const b = M.findBond(d, bondId); M.setStereo(d, bondId, b?.stereo === want ? 'none' : want); });
        return;
      }
    }
    if (S.tool === 'ring' && /^[3-8]$/.test(k)) {
      S.ring = { size: Number(k), aromatic: false };
      renderPanel();
      return;
    }
    if (!target) {
      const tool = TOOLS.find((t) => fr.toolKeys[t].toLowerCase() === k.toLowerCase());
      if (tool) setTool(tool);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === ' ') { S.space = false; svg.classList.remove('pannable'); }
  });

  function doUndo() {
    const d = M.undo(S.history, S.doc);
    if (d) { S.doc = d; afterChange(); }
  }

  function doRedo() {
    const d = M.redo(S.history, S.doc);
    if (d) { S.doc = d; afterChange(); }
  }

  // ---------- toolbar and top bar ----------

  /** @param {typeof TOOLS[number]} tool */
  function setTool(tool) {
    S.tool = tool;
    for (const b of root.querySelectorAll('.tool')) b.setAttribute('aria-pressed', String(b.getAttribute('data-tool') === tool));
    svg.dataset.tool = tool;
    updateStatus();
    renderPanel();
  }

  root.querySelector('.tools')?.addEventListener('click', (e) => {
    const b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-tool]'));
    if (b) setTool(/** @type {typeof TOOLS[number]} */ (b.dataset.tool));
  });
  $('#btn-undo').addEventListener('click', doUndo);
  $('#btn-redo').addEventListener('click', doRedo);
  const refit = () => { userMovedView = false; fit(); };
  $('#btn-fit').addEventListener('click', refit);
  $('#btn-sample').addEventListener('click', () => { replaceDoc(sampleSN2()); refit(); });
  $('#btn-clear').addEventListener('click', () => { replaceDoc(M.emptyDoc()); refit(); });

  // ---------- files ----------

  const FILE_NAME = 'mecanisme';
  /** @type {HTMLInputElement} */ const fileInput = $('#file-input');
  /** @type {HTMLDetailsElement} */ const fileMenu = $('#file-menu');

  /** @param {Blob} blob @param {string} name */
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /** The drawing as a PNG at 300 dpi on white, marked so Word and Google Docs size it right. */
  async function pngBlob() {
    const svgText = exportSVG(S.doc);
    const [, , w, h] = (svgText.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 1 1').split(' ').map(Number);
    const scale = (300 / 72) * POINTS_PER_UNIT;
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(w * scale);
      canvas.height = Math.ceil(h * scale);
      const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = /** @type {Blob} */ (await new Promise((resolve) => canvas.toBlob(resolve, 'image/png')));
      return new Blob([setPngDpi(new Uint8Array(await blob.arrayBuffer()), 300)], { type: 'image/png' });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function saveDoc() {
    download(new Blob([M.serialize(S.doc)], { type: 'application/json' }), `${FILE_NAME}.doublet.json`);
    statusEl.textContent = fr.files.saved;
  }

  async function copyImage() {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob() })]);
      statusEl.textContent = fr.files.copied;
    } catch {
      statusEl.textContent = fr.files.copyFailed;
    }
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      replaceDoc(docFromText(await file.text()));
      refit();
      statusEl.textContent = fr.files.opened(file.name);
    } catch {
      statusEl.textContent = fr.files.badFile;
    } finally {
      fileInput.value = '';
    }
  });

  /** @type {Record<string, () => unknown>} */
  const fileActions = {
    'btn-open': () => fileInput.click(),
    'btn-save': saveDoc,
    'btn-png': async () => download(await pngBlob(), `${FILE_NAME}.png`),
    'btn-svg': () => download(new Blob([exportSVG(S.doc)], { type: 'image/svg+xml' }), `${FILE_NAME}.svg`),
    'btn-copy': copyImage,
  };
  fileMenu.addEventListener('click', (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest('button');
    if (!b) return;
    fileMenu.open = false;
    fileActions[b.id]?.();
  });

  function updateButtons() {
    /** @type {HTMLButtonElement} */ ($('#btn-undo')).disabled = S.history.past.length === 0;
    /** @type {HTMLButtonElement} */ ($('#btn-redo')).disabled = S.history.future.length === 0;
  }

  function updateStatus() {
    const hovered = S.hover && ['select', 'bond', 'chain'].includes(S.tool) ? /** @type {Record<string, string>} */ (fr.status.hover)[S.hover.kind] : null;
    statusEl.textContent = hovered ?? fr.status[S.tool];
  }

  // ---------- properties panel ----------

  /** @param {M.Anchor} an */
  function describeAnchor(an) {
    const d = S.doc;
    const el = (/** @type {string} */ id) => M.findAtom(d, id)?.element ?? '?';
    if ('mark' in an) {
      const m = d.marks.find((x) => x.id === an.mark);
      if (!m) return fr.anchor.unknown;
      return m.kind === 'radical' ? fr.anchor.radical(el(m.atom)) : fr.anchor.lonePair(el(m.atom));
    }
    if ('bond' in an) {
      const b = M.findBond(d, an.bond);
      return b ? fr.anchor.bond(el(b.a), el(b.b)) : fr.anchor.unknown;
    }
    if ('atom' in an) return fr.anchor.atom(el(an.atom));
    return fr.anchor.between(el(an.between[0]), el(an.between[1]));
  }

  /** @param {string} action @param {string} label @param {boolean} [on] */
  const btn = (action, label, on) => `<button type="button" data-action="${action}"${on === undefined ? '' : ` aria-pressed="${on}"`}>${label}</button>`;

  function renderPanel() {
    const P = fr.panel;
    const d = S.doc;
    const sel = S.selection;
    let html = '';
    const removeBtn = `<div class="row end">${btn('delete', P.remove)}</div>`;
    if (!sel && S.tool === 'atom') {
      html = `<h2>${P.elementTitle}</h2><div class="row">${ELEMENTS.map((el) => `<button type="button" data-element="${el}" aria-pressed="${S.element === el}">${el}</button>`).join('')}</div><p class="muted small">${P.elementHint}</p>`;
    } else if (!sel && S.tool === 'ring') {
      const { size, aromatic } = S.ring;
      html = `<h2>${P.ringTitle}</h2><div class="seg">${[3, 4, 5, 6, 7, 8].map((n) => `<button type="button" data-ring="${n}" aria-pressed="${size === n && !aromatic}">${n}</button>`).join('')}</div>
        <div class="col"><button type="button" data-ring="benzene" aria-pressed="${aromatic}">${P.benzene}</button></div><p class="muted small">${P.ringHint}</p>`;
    } else if (!sel) {
      html = `<h2>${P.nothing}</h2><p class="muted">${P.intro}</p><p class="counts">${P.counts(d)}</p>
        <h3>${P.phaseTitle}</h3><ul>${P.phaseItems.map((x) => `<li>${x}</li>`).join('')}</ul>
        <h3>${P.shortcutsTitle}</h3><ul class="small">${P.shortcuts.map((x) => `<li>${x}</li>`).join('')}</ul>
        <h3>${P.nextTitle}</h3><ul class="muted">${P.nextItems.map((x) => `<li>${x}</li>`).join('')}</ul>`;
    } else if (sel.kind === 'group') {
      html = `<h2>${P.group(sel.ids?.length ?? 0)}</h2><p class="muted">${P.groupHint}</p>${removeBtn}`;
    } else if (sel.kind === 'atom') {
      const a = M.findAtom(d, sel.id);
      if (a) {
        html = `<h2>${P.titles.atom}</h2><dl class="kv"><dt>${P.element}</dt><dd>${esc(a.element)}</dd><dt>${P.charge}</dt><dd>${fr.chargeText(a.charge)}</dd><dt>${P.hydrogens}</dt><dd>${M.hydrogenCount(d, a)}</dd></dl>
          <div class="row">${btn('charge-1', '− 1')}${btn('charge+1', '+ 1')}</div>
          <div class="col">${btn('lp-add', P.addLonePair)}${btn('lp-remove', P.removeLonePair)}</div>${removeBtn}`;
      }
    } else if (sel.kind === 'bond') {
      const b = M.findBond(d, sel.id);
      if (b) {
        const stereo = b.stereo ?? 'none';
        html = `<h2>${P.titles.bond}</h2><p class="label">${P.order}</p><div class="seg">${[1, 2, 3].map((o) => btn(`order-${o}`, String(o), b.order === o)).join('')}</div>
          <p class="label">${P.stereo}</p><div class="seg">${['none', 'wedge', 'hash'].map((s) => btn(`stereo-${s}`, P.stereoNames[/** @type {'none'} */ (s)], stereo === s)).join('')}</div>${removeBtn}`;
      }
    } else if (sel.kind === 'curved' || sel.kind === 'handle') {
      const c = d.curvedArrows.find((x) => x.id === sel.id);
      if (c) {
        html = `<h2>${P.titles.curved}</h2><p class="label">${P.electrons}</p><div class="seg">${btn('electrons-2', P.electronsTwo, c.electrons === 2)}${btn('electrons-1', P.electronsOne, c.electrons === 1)}</div>
          <dl class="kv"><dt>${P.source}</dt><dd>${esc(describeAnchor(c.from))}</dd><dt>${P.target}</dt><dd>${esc(describeAnchor(c.to))}</dd></dl>
          <div class="col">${btn('bend-reset', P.resetBend)}</div>${removeBtn}`;
      }
    } else if (sel.kind === 'rxn') {
      const r = d.reactionArrows.find((x) => x.id === sel.id);
      if (r) {
        const opts = Object.entries(fr.kinds).map(([k, label]) => `<option value="${k}"${r.kind === k ? ' selected' : ''}>${label}</option>`).join('');
        html = `<h2>${P.titles.rxn}</h2>
          <label for="rx-kind">${P.kind}</label><select id="rx-kind">${opts}</select>
          <label for="rx-above">${P.above}</label><textarea id="rx-above" rows="2">${esc(r.above)}</textarea>
          <label for="rx-below">${P.below}</label><textarea id="rx-below" rows="2">${esc(r.below)}</textarea>
          <p class="muted small">${P.formatHint}</p>
          <p class="label">${P.insert}</p><div class="row">${['Δ', 'hν', '°C', '⁻', '→'].map((s) => `<button type="button" data-insert="${s}">${s}</button>`).join('')}</div>${removeBtn}`;
      }
    } else if (sel.kind === 'mark') {
      const m = d.marks.find((x) => x.id === sel.id);
      if (m) html = `<h2>${P.markNames[m.kind]}${m.kind === 'partial' ? ` ${esc(m.value ?? 'δ+')}` : ''}</h2><p class="muted">${P.rotateHint}</p>${removeBtn}`;
    } else if (sel.kind === 'charge') {
      const a = M.findAtom(d, sel.id);
      if (a) html = `<h2>${P.titles.charge}</h2><dl class="kv"><dt>${P.charge}</dt><dd>${fr.chargeText(a.charge)}</dd></dl><div class="row">${btn('charge-1', '− 1')}${btn('charge+1', '+ 1')}</div><p class="muted">${P.rotateHint}</p>${removeBtn}`;
    } else if (sel.kind === 'text') {
      const t = d.texts.find((x) => x.id === sel.id);
      if (t) html = `<h2>${P.titles.text}</h2><label for="tx-text">${P.textLabel}</label><input id="tx-text" type="text" autocomplete="off" value="${esc(t.text)}">${removeBtn}`;
    }
    panel.innerHTML = html;
  }

  panel.addEventListener('click', (e) => {
    const b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('button'));
    if (!b) return;
    if (b.dataset.insert) { insertText(b.dataset.insert); return; }
    if (b.dataset.element) {
      S.element = b.dataset.element;
      renderPanel();
      return;
    }
    if (b.dataset.ring) {
      const v = b.dataset.ring;
      S.ring = v === 'benzene' ? { size: 6, aromatic: true } : { size: Number(v), aromatic: false };
      renderPanel();
      return;
    }
    const act = b.dataset.action;
    const sel = S.selection;
    if (!act || !sel) return;
    commit((d) => {
      if (act === 'delete') { deleteHit(d, sel); return; }
      if (act === 'charge-1' || act === 'charge+1') { const a = M.findAtom(d, sel.id); if (a) a.charge += act === 'charge+1' ? 1 : -1; return; }
      if (act === 'lp-add') { M.addMark(d, sel.id, 'lonePair'); return; }
      if (act === 'lp-remove') {
        const m = [...d.marks].reverse().find((x) => x.atom === sel.id && x.kind === 'lonePair');
        if (m) M.removeMark(d, m.id);
        return;
      }
      if (act.startsWith('order-')) { M.setBondOrder(d, sel.id, /** @type {1|2|3} */ (Number(act.slice(6)))); return; }
      if (act.startsWith('stereo-')) { M.setStereo(d, sel.id, /** @type {'none'} */ (act.slice(7))); return; }
      const c = d.curvedArrows.find((x) => x.id === sel.id);
      if (c && act.startsWith('electrons-')) c.electrons = /** @type {1|2} */ (Number(act.slice(10)));
      if (c && act === 'bend-reset') c.bend = defaultBend(d, c.from, c.to);
    });
  });

  /** @param {string} id @param {string} value */
  function applyField(id, value) {
    const sel = S.selection;
    if (!sel) return;
    const d = S.doc;
    if (id === 'tx-text') { const t = d.texts.find((x) => x.id === sel.id); if (t) t.text = value; return; }
    const r = d.reactionArrows.find((x) => x.id === sel.id);
    if (!r) return;
    if (id === 'rx-kind') r.kind = /** @type {M.ReactionArrow['kind']} */ (value);
    if (id === 'rx-above') r.above = value;
    if (id === 'rx-below') r.below = value;
  }

  panel.addEventListener('input', (e) => {
    const el = /** @type {HTMLInputElement | HTMLSelectElement} */ (e.target);
    if (!S.fieldSession) { M.record(S.history, S.doc); S.fieldSession = true; }
    applyField(el.id, el.value);
    save();
    render();
    updateButtons();
  });
  panel.addEventListener('change', () => { S.fieldSession = false; });
  panel.addEventListener('focusin', (e) => {
    const el = /** @type {HTMLElement} */ (e.target);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') S.lastField = el.id;
  });

  /** @param {string} s */
  function insertText(s) {
    const el = S.lastField ? /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (panel.querySelector(`#${S.lastField}`)) : null;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    el.value = el.value.slice(0, start) + s + el.value.slice(end);
    el.focus();
    el.setSelectionRange(start + s.length, start + s.length);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    S.fieldSession = false;
  }

  // ---------- start ----------
  render();
  fit();
  setTool('select');
  renderPanel();
  updateButtons();
}
