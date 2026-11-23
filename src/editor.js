// @ts-check
import { fr } from './i18n/fr.js';
import * as M from './model.js';
import { renderDoc, defaultBend, bendFromControl, docBounds, esc, STYLE } from './render.js';
import { ELEMENT_KEYS } from './chem.js';
import {
  add, sub, dist, cross, angleOf, angleDiff, angularGaps, fromAngle, snapAngle, nextBondAngle,
  zigzag, ringAt, ringOnBond, ringOnAtom, pinchView, zoomView, hexVertex, hexCenter, hexEdges, normDeg,
} from './geometry.js';
import { sampleSN2 } from './sample.js';
import { exportSVG, docFromText, setPngDpi, POINTS_PER_UNIT } from './io.js';
import { checkDoc } from './checks.js';
import { GROUPS, attachGroup } from './groups.js';
import { TEMPLATES, SETUP_TEMPLATES } from './templates.js';
import * as A from './apparatus.js';

/**
 * Interactive editor: tools, pointer and keyboard handling, properties panel.
 * Every change goes through `commit`, which records a snapshot for undo first.
 * @typedef {{kind: string, id: string, index?: number, ids?: string[]}} Hit
 */

const STORAGE_KEY = 'doublet.document.v1';
/** The tools in groups, separated by a line on the rail: select; skeleton; electrons; glassware; reaction and text; eraser. */
const TOOL_GROUPS = /** @type {const} */ ([
  ['select'],
  ['bond', 'chain', 'ring', 'atom', 'group'],
  ['lonePair', 'charge', 'partial', 'curved'],
  ['synthesis', 'distillation', 'separation', 'glassware', 'heating'],
  ['rxn', 'text'],
  ['erase'],
]);
const TOOLS = TOOL_GROUPS.flat();
/** The glassware tools: each puts down the piece chosen in its option window. @type {Record<string, string[]>} */
const FAMILIES = A.FAMILIES;
/** The tools on the rail in each mode: drawing a mechanism, or a lab set-up. @type {Record<'mechanism' | 'setup', string[]>} */
const MODE_TOOLS = {
  mechanism: TOOLS.filter((t) => !FAMILIES[t]),
  setup: ['select', ...Object.keys(FAMILIES), 'text', 'erase'],
};
const ELEMENTS = ['C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I', 'H'];
/** Text icon, shrunk to fit long labels such as CO₂H. */
const TEXT_ICON = (/** @type {string} */ t) => `<text x="11" y="15.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(13, 34 / t.length).toFixed(1)}" fill="currentColor">${t}</text>`;
/** @param {string} g a key of GROUPS */
const groupName = (g) => fr.groupNames[/** @type {keyof typeof fr.groupNames} */ (g)];
/** @param {string} kind a key of A.PIECES */
const pieceName = (kind) => fr.pieceNames[/** @type {keyof typeof fr.pieceNames} */ (kind)] ?? kind;
/** @param {string} v '3' to '8' or 'benzene' */
const ringOf = (v) => (v === 'benzene' ? { size: 6, aromatic: true } : { size: Number(v), aromatic: false });
/** A regular polygon, point up, with a circle inside for benzene. @param {{size: number, aromatic: boolean}} r */
const RING_ICON = (r) => {
  const pts = Array.from({ length: r.size }, (_, i) => {
    const a = (i / r.size - 0.25) * 2 * Math.PI;
    return `${(11 + 8 * Math.cos(a)).toFixed(1)},${(11 + 8 * Math.sin(a)).toFixed(1)}`;
  });
  const circle = r.aromatic ? '<circle cx="11" cy="11" r="4" fill="none" stroke="currentColor" stroke-width="1.3"/>' : '';
  return `<polygon points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>${circle}`;
};
/** @param {string} v a Bond tool choice: '1', '2', '3', 'wedge' or 'hash' */
const bondKind = (v) => (v === 'wedge' || v === 'hash' ? v : /** @type {1 | 2 | 3} */ (Number(v)));
/** A bond on the icons' diagonal, narrow end of a wedge at the bottom left. @param {string} v */
const BOND_ICON = (v) => {
  const seg = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ o) =>
    `<path d="M${(x - 0.65 * o).toFixed(2)} ${(y - 0.76 * o).toFixed(2)} L${(x + 0.65 * o).toFixed(2)} ${(y + 0.76 * o).toFixed(2)}" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`;
  if (v === 'wedge') return '<path d="M4 17 L16 2.7 L20 7.3 Z" fill="currentColor"/>';
  if (v === 'hash') return [0.2, 0.4, 0.6, 0.8, 1].map((t) => seg(4 + 14 * t, 17 - 12 * t, 3 * t)).join('');
  const offsets = { 1: [0], 2: [-1.6, 1.6], 3: [-2.6, 0, 2.6] }[/** @type {1 | 2 | 3} */ (Number(v))];
  return offsets.map((o) => `<path d="M${4 + 0.65 * o} ${17 + 0.76 * o} L${18 + 0.65 * o} ${5 + 0.76 * o}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`).join('');
};
/** A piece of glassware shrunk into a 22-pixel icon. @param {string} kind */
const PIECE_ICON = (kind) => {
  const { d, box } = A.PIECES[kind];
  const s = Math.max(box.r - box.l, box.b - box.t) + 8;
  const [x, y] = [(box.l + box.r - s) / 2, (box.t + box.b - s) / 2];
  return `<svg width="22" height="22" viewBox="${x} ${y} ${s} ${s}"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
};
const ICONS = {
  select: '<path d="M6 3 L6 17 L9.5 13.5 L12 19 L14 18 L11.5 12.5 L16 12.5 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  bond: '<path d="M4 17 L18 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  chain: '<path d="M2 15 L7 7 L12 15 L17 7 L21 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  ring: '<path d="M11 3 L18 7 L18 15 L11 19 L4 15 L4 7 Z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  atom: TEXT_ICON('N'),
  lonePair: '<circle cx="8" cy="11" r="2.2" fill="currentColor"/><circle cx="14" cy="11" r="2.2" fill="currentColor"/>',
  charge: '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 11 H14.5 M11 7.5 V14.5" stroke="currentColor" stroke-width="1.4"/>',
  partial: TEXT_ICON('δ'),
  group: TEXT_ICON('Ph'),
  rxn: '<path d="M3 11 H17" stroke="currentColor" stroke-width="1.6"/><path d="M15 7 L20 11 L15 15 Z" fill="currentColor"/>',
  text: TEXT_ICON('T'),
  curved: '<path d="M4 17 C5 6 15 4 17 13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14 12.5 L17.3 14.6 L18.6 10.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  erase: '<path d="M9 18 L3.5 12.5 L12 4 L19 11 L12 18 Z M7 9 L14 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  synthesis: PIECE_ICON('flask'),
  distillation: PIECE_ICON('head'),
  separation: PIECE_ICON('sepfunnel'),
  glassware: PIECE_ICON('erlenmeyer'),
  heating: PIECE_ICON('mantle'),
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
  /** @param {typeof TOOLS[number]} t */
  const tool = (t) => `<button type="button" class="tool" data-tool="${t}" aria-pressed="false" title="${fr.tools[t]} (${fr.toolKeys[t]})"><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">${ICONS[t]}</svg><span class="tool-name">${fr.tools[t]}</span><kbd>${fr.toolKeys[t]}</kbd></button>`;
  const tools = TOOL_GROUPS.map((g) => `<div class="tool-group">${g.map(tool).join('')}</div>`).join('');
  return `
  <header class="top">
    <b class="name">${fr.appName}</b>
    <div class="seg" role="group" aria-label="${fr.modeLabel}">
      <button type="button" data-mode="mechanism" aria-pressed="true"><svg width="16" height="16" viewBox="0 0 22 22" aria-hidden="true">${ICONS.curved}</svg>${fr.modes.mechanism}</button>
      <button type="button" data-mode="setup" aria-pressed="false"><svg width="16" height="16" viewBox="0 0 22 22" aria-hidden="true">${ICONS.synthesis}</svg>${fr.modes.setup}</button>
    </div>
    <div class="actions">
      <button type="button" id="btn-undo" class="icon" title="${fr.actions.undo} (Ctrl+Z)" aria-label="${fr.actions.undo}"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M6 3.5 L2.5 7 L6 10.5 M2.5 7 H11 A4.5 4.5 0 0 1 11 16 H7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button type="button" id="btn-redo" class="icon" title="${fr.actions.redo} (Ctrl+Y)" aria-label="${fr.actions.redo}"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M12 3.5 L15.5 7 L12 10.5 M15.5 7 H7 A4.5 4.5 0 0 0 7 16 H11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <span class="sep" aria-hidden="true"></span>
      <details class="menu" id="templates-menu"><summary>${fr.actions.templates}</summary><div>
        ${Object.keys(TEMPLATES).map((k) => `<button type="button" data-template="${k}">${fr.templateNames[/** @type {keyof typeof fr.templateNames} */ (k)]}</button>`).join('')}
        <p class="menu-head">${fr.actions.setups}</p>
        ${Object.keys(SETUP_TEMPLATES).map((k) => `<button type="button" data-setup="${k}">${fr.setupNames[/** @type {keyof typeof fr.setupNames} */ (k)]}</button>`).join('')}
      </div></details>
      <details class="menu" id="file-menu"><summary>${fr.actions.file}</summary><div>
        <button type="button" id="btn-clear">${fr.actions.clear}</button>
        <button type="button" id="btn-open">${fr.actions.open}<kbd>Ctrl+O</kbd></button>
        <button type="button" id="btn-save">${fr.actions.save}<kbd>Ctrl+S</kbd></button>
        <p class="menu-head">${fr.actions.export}</p>
        <button type="button" id="btn-png">${fr.actions.png}</button>
        <button type="button" id="btn-svg">${fr.actions.svg}</button>
      </div></details>
      <button type="button" id="btn-copy" class="primary" title="${fr.actions.copy} (Ctrl+C)"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 3.5 V3 Q10.5 1.5 9 1.5 H4 Q2.5 1.5 2.5 3 V9.5 Q2.5 11 4 11 H5.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>${fr.actions.copy}</button>
      <input type="file" id="file-input" accept=".json,.svg,application/json,image/svg+xml" hidden>
    </div>
  </header>
  <nav class="tools" aria-label="${fr.toolsLabel}">${tools}<div class="flyout" id="flyout" hidden></div></nav>
  <main class="stage">
    <svg id="canvas" role="application" aria-label="${fr.canvasLabel}">
      <defs><pattern id="hexp" width="69.282" height="120" patternUnits="userSpaceOnUse"><path class="hexline" d="M0,20 L34.641,0 L69.282,20 M0,20 L0,60 M0,60 L34.641,80 L69.282,60 M34.641,80 L34.641,120"/></pattern></defs>
      <rect id="bg" fill="url(#hexp)"/>
      <g id="content"></g>
    </svg>
    <div class="zoom-bar" role="group" aria-label="${fr.zoom.label}">
      <button type="button" id="btn-zoom-out" title="${fr.zoom.out}" aria-label="${fr.zoom.out}">−</button>
      <span id="zoom" class="zoom"></span>
      <button type="button" id="btn-zoom-in" title="${fr.zoom.in}" aria-label="${fr.zoom.in}">+</button>
      <button type="button" id="btn-fit"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6 V2 H6 M10 2 H14 V6 M14 10 V14 H10 M6 14 H2 V10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>${fr.actions.fit}</button>
    </div>
  </main>
  <aside class="panel" id="panel" aria-live="polite"></aside>
  <footer class="status"><span id="status"></span></footer>`;
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
    bond: '1',
    /** @type {'mechanism' | 'setup'} */ mode: 'mechanism',
    /** The piece each glassware tool puts down. @type {Record<string, string>} */
    piece: Object.fromEntries(Object.entries(FAMILIES).map(([f, kinds]) => [f, kinds[0]])),
    element: 'C',
    group: 'Ph',
    /** @type {{a: {x:number,y:number}, b: {x:number,y:number}, view: {x:number,y:number,w:number,h:number}} | null} */ pinch: null,
    /** @type {import('./checks.js').Warning[]} */ warnings: [],
    /** @type {any} */ layout: null,
    view: { x: 0, y: 0, w: 800, h: 500 },
    space: false,
    fieldSession: false,
    /** @type {string | null} */ lastField: null,
  };

  // ---------- drawing and view ----------

  function render() {
    S.warnings = checkDoc(S.doc);
    const r = renderDoc(S.doc, {
      selection: S.selection, hover: S.hover, preview: S.preview, marquee: S.marquee, warnings: S.warnings.flatMap((w) => w.ids),
    });
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
      case 'piece': return d.apparatus.some((g) => g.id === h.id);
      case 'group':
        h.ids = (h.ids ?? []).filter((id) => M.findAtom(d, id) || [...d.texts, ...d.reactionArrows, ...d.apparatus].some((o) => o.id === id));
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

  // Whether the drawing is kept in this browser, which the help line says when it has nothing else to say.
  let stored = true;
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, M.serialize(S.doc));
      stored = true;
    } catch {
      /* storage unavailable: the drawing still works, it is just not kept */
      stored = false;
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
      case 'piece': M.removePiece(d, h.id); break;
      case 'group': for (const id of h.ids ?? []) { M.removeAtom(d, id); M.removeText(d, id); M.removeReactionArrow(d, id); M.removePiece(d, id); } break;
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
    // On the empty canvas the start sits on a grid vertex: the first bond follows a grid edge.
    if (!D.moved) return [start, add(start, fromAngle(a ? nextBondAngle(existing) : D.start.up ? 330 : 30, STYLE.bond))];
    if (D.type === 'bond') {
      const target = a && atomUnder(e, a.id);
      return [start, target ?? add(start, fromAngle(snapAngle(angleOf(sub(p, start))), STYLE.bond))];
    }
    const v = sub(p, start);
    const n = Math.max(1, Math.round(Math.hypot(v.x, v.y) / (STYLE.bond * Math.cos(Math.PI / 6))));
    const dir = snapAngle(angleOf(v), 30);
    const clear = (/** @type {number} */ s) => Math.min(360, ...existing.map((x) => angleDiff(x, dir + 30 * s)));
    const onGrid = !a && hexEdges(D.start.up).includes(normDeg(dir - 30)) ? -1 : 1;
    return [start, ...zigzag(start, dir, n, STYLE.bond, a ? (clear(-1) > clear(1) ? -1 : 1) : onGrid)];
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
      points = ringAt(hexCenter(p, STYLE.bond), size, STYLE.bond);
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

  /** Pointers currently down, for two-finger gestures. @type {Map<number, {x: number, y: number}>} */
  const pointers = new Map();
  const TAP_TOOLS = new Set(['erase', 'ring', 'text', 'atom', 'group', 'lonePair', 'charge', 'partial', ...Object.keys(FAMILIES)]);

  /**
   * What a simple touch does with the current tool. It runs on release, and only if the pointer
   * did not move, so the first finger of a pinch changes nothing.
   * @param {Hit | null} hit @param {{x:number,y:number}} p @param {boolean} shift
   */
  function tap(hit, p, shift) {
    const tool = S.tool;
    if (tool === 'erase') { if (hit && hit.kind !== 'handle') commit((d) => deleteHit(d, hit)); return; }
    if (tool === 'bond') {
      // A single bond chosen: the click changes the order, as before; otherwise it gives the chosen kind.
      if (hit?.kind === 'bond') commit((d) => (S.bond === '1' ? M.cycleBondOrder(d, hit.id) : M.setBondKind(d, hit.id, bondKind(S.bond))));
      return;
    }
    if (tool === 'ring') { commit((d) => addRingAt(d, hit, p)); return; }
    if (FAMILIES[tool]) {
      // Touching near the free joint of a piece fits the new piece onto it.
      if (!hit || hit.kind === 'piece') {
        commit((d) => {
          const g = M.addPiece(d, { kind: S.piece[tool], x: Math.round(p.x), y: Math.round(p.y), angle: 0 });
          A.place(d, g.id, p);
          S.selection = { kind: 'piece', id: g.id };
        });
      }
      return;
    }
    if (tool === 'text') {
      if (hit?.kind === 'text') { S.selection = hit; render(); renderPanel(); }
      else if (!hit || hit.kind === 'piece') commit((d) => { S.selection = { kind: 'text', id: M.addText(d, { x: p.x, y: p.y, text: '+' }).id }; });
      return;
    }
    // Touching an atom's lone pair or charge counts as touching the atom.
    const id = hit?.kind === 'atom' || hit?.kind === 'charge' ? hit.id
      : hit?.kind === 'mark' ? S.doc.marks.find((m) => m.id === hit.id)?.atom : undefined;
    if (tool === 'atom') {
      if (id) commit((d) => M.setElement(d, id, S.element));
      else if (!hit) commit((d) => { const v = hexVertex(p, STYLE.bond); M.addAtom(d, { element: S.element, x: v.x, y: v.y }); });
      return;
    }
    if (!id) return;
    commit((d) => {
      if (tool === 'group') attachGroup(d, id, S.group, nextBondAngle(bondAngles(d, id)));
      else if (tool === 'lonePair') M.addMark(d, id, shift ? 'radical' : 'lonePair');
      else if (tool === 'charge') { const a = M.findAtom(d, id); if (a) a.charge += shift ? -1 : 1; }
      else if (tool === 'partial') M.cyclePartial(d, id);
    });
  }

  svg.addEventListener('pointerdown', (e) => {
    if (e.button === 2) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { svg.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    if (pointers.size === 2) {
      // A second finger drops whatever the first started: the two now zoom and pan.
      const [a, b] = [...pointers.values()];
      S.drag = null;
      S.preview = null;
      S.marquee = null;
      S.pinch = { a, b, view: { ...S.view } };
      userMovedView = true;
      render();
      return;
    }
    if (pointers.size > 2) return;
    const p = toDoc(e);
    const hit = hitOf(e.target);
    if (e.button === 1 || S.space) { startPan(e); return; }
    if (TAP_TOOLS.has(S.tool) || (S.tool === 'bond' && hit?.kind === 'bond')) {
      S.drag = { type: 'tap', hit, start: p, shift: e.shiftKey, moved: false };
      return;
    }
    if (S.tool === 'bond' || S.tool === 'chain') {
      if (hit?.kind === 'atom' || !hit) S.drag = { type: S.tool, atomId: hit?.id ?? null, start: hit ? p : hexVertex(p, STYLE.bond), moved: false };
      return;
    }
    if (S.tool === 'rxn') {
      if (!hit) S.drag = { type: 'rxnNew', start: p, moved: false };
      return;
    }
    if (S.tool === 'curved') {
      const from = arrowSource(hit, p);
      if (from) S.drag = { type: 'curved', from, start: p, moved: false };
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
    const movable = ['atom', 'text', 'rxn', 'piece'];
    if (movable.includes(hit.kind) && e.shiftKey) {
      const ids = sel?.kind === 'group' ? sel.ids ?? [] : sel && movable.includes(sel.kind) ? [sel.id] : [];
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
    } else if (hit.kind === 'rxn' || hit.kind === 'text' || (hit.kind === 'piece' && grouped)) {
      S.drag = { type: 'move', ids: grouped ? new Set(sel?.ids) : new Set([hit.id]), last: p, start: p, snap, moved: false };
    } else if (hit.kind === 'piece') {
      // A piece takes its whole set-up along, and snaps to a joint it comes near.
      const ids = A.assembly(S.doc, hit.id);
      const orig = new Map(S.doc.apparatus.filter((g) => ids.has(g.id)).map((g) => [g.id, { ...g }]));
      S.drag = { type: 'movePiece', ids, orig, start: p, snap, moved: false };
    }
    render();
    renderPanel();
    updateStatus();
  });

  svg.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (S.pinch) {
      if (pointers.size < 2) return;
      const [a, b] = [...pointers.values()];
      const v = pinchView(S.pinch.view, svg.getBoundingClientRect(), S.pinch.a, S.pinch.b, a, b);
      if (v.w >= 60 && v.w <= 6000) { S.view = v; applyView(); }
      return;
    }
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
        M.moveObjects(d, D.ids, p.x - D.last.x, p.y - D.last.y);
        D.last = p;
        break;
      case 'movePiece':
        for (const g of d.apparatus) {
          const o = D.orig.get(g.id);
          if (o) Object.assign(g, { x: o.x + p.x - D.start.x, y: o.y + p.y - D.start.y, angle: o.angle });
        }
        A.snap(d, D.ids);
        break;
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
    pointers.delete(e.pointerId);
    if (S.pinch) {
      if (pointers.size < 2) { S.pinch = null; endDrag(e); }
      return;
    }
    const D = endDrag(e);
    if (!D || D.type === 'pan') return;
    if (D.type === 'tap') {
      if (!D.moved) tap(D.hit, D.start, D.shift);
      else render();
      return;
    }
    const p = toDoc(e);
    if (D.type === 'bond' || D.type === 'chain') {
      const points = sketch(D, p, e);
      commit((d) => {
        const { bonds } = M.addPath(d, points);
        if (D.type === 'bond' && S.bond !== '1') for (const b of bonds) M.setBondKind(d, b.id, bondKind(S.bond));
      });
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
      const ids = r ? M.idsInRect(S.doc, r) : [];
      S.selection = ids.length ? { kind: 'group', id: 'group', ids } : null;
      render();
      renderPanel();
      return;
    }
    if (D.moved) afterChange();
    else { render(); renderPanel(); }
  });

  svg.addEventListener('pointercancel', (e) => {
    pointers.delete(e.pointerId);
    S.pinch = null;
    endDrag(e);
    render();
  });
  svg.addEventListener('pointerleave', () => {
    if (!S.drag && S.hover) { S.hover = null; render(); updateStatus(); }
  });

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    S.view = zoomView(S.view, toDoc(e), Math.exp(e.deltaY * 0.0015));
    applyView();
  }, { passive: false });

  // Keep the centre of the view when the canvas changes size; refit until the user moves the view.
  let userMovedView = false;
  svg.addEventListener('wheel', () => { userMovedView = true; }, { passive: true });
  // Zoom buttons, for a tablet or a mouse without a wheel: by 1.25 around the centre of the view.
  /** @param {number} k */
  const zoomCentre = (k) => {
    const v = S.view;
    S.view = zoomView(v, { x: v.x + v.w / 2, y: v.y + v.h / 2 }, k);
    userMovedView = true;
    applyView();
  };
  $('#btn-zoom-in').addEventListener('click', () => zoomCentre(1 / 1.25));
  $('#btn-zoom-out').addEventListener('click', () => zoomCentre(1.25));
  new ResizeObserver(() => {
    if (!userMovedView) { fit(); return; }
    const { w, h } = size();
    const cy = S.view.y + S.view.h / 2;
    S.view.h = (S.view.w * h) / w;
    S.view.y = cy - S.view.h / 2;
    applyView();
  }).observe(svg);

  // ---------- copy and paste ----------

  /** @type {M.Doc | null} */ let clipboard = null;
  let pastes = 0;

  /** The objects to copy: the whole molecule for an atom or a bond, the whole set-up for a piece. */
  function selectedIds() {
    const sel = S.selection;
    if (sel?.kind === 'group') return new Set(sel.ids);
    if (sel?.kind === 'atom') return M.component(S.doc, sel.id);
    if (sel?.kind === 'bond') { const b = M.findBond(S.doc, sel.id); return b ? M.component(S.doc, b.a) : null; }
    if (sel?.kind === 'rxn' || sel?.kind === 'text') return new Set([sel.id]);
    if (sel?.kind === 'piece') return A.assembly(S.doc, sel.id);
    return null;
  }

  /** Copies the selection; false when nothing copyable is selected. */
  function copySelection() {
    const ids = selectedIds();
    if (!ids) return false;
    clipboard = M.extract(S.doc, ids);
    pastes = 0;
    return true;
  }

  /** Pastes one bond length further down and right each time, on the grid, and selects the copy. */
  function pasteClipboard() {
    const part = clipboard;
    if (!part) return;
    pastes += 1;
    const step = STYLE.bond * pastes;
    const a = part.atoms[0];
    const v = a ? hexVertex({ x: a.x + step, y: a.y + step }, STYLE.bond) : null;
    const [dx, dy] = a && v ? [v.x - a.x, v.y - a.y] : [step, step];
    commit((d) => { S.selection = { kind: 'group', id: 'group', ids: M.paste(d, part, dx, dy) }; });
  }

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
    if (ctrl && k.toLowerCase() === 'c' && !String(window.getSelection())) { e.preventDefault(); if (!copySelection()) copyImage(); return; }
    if (ctrl && k.toLowerCase() === 'v' && clipboard) { e.preventDefault(); pasteClipboard(); return; }
    if (ctrl || e.altKey) return;
    if (k === ' ') { S.space = true; svg.classList.add('pannable'); e.preventDefault(); return; }
    if (k === 'Escape') { S.selection = null; showFlyout(null); render(); renderPanel(); return; }
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
      chooseOption('ring', k);
      showFlyout(null);
      return;
    }
    if (!target) {
      const tool = MODE_TOOLS[S.mode].find((t) => fr.toolKeys[/** @type {typeof TOOLS[number]} */ (t)].toLowerCase() === k.toLowerCase());
      if (tool) setTool(/** @type {typeof TOOLS[number]} */ (tool));
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
    showFlyout(tool);
    updateStatus();
    renderPanel();
  }

  /** Shows the tools of a mode: drawing a mechanism, or a lab set-up. @param {'mechanism' | 'setup'} mode */
  function setMode(mode) {
    S.mode = mode;
    for (const b of root.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b instanceof HTMLElement && b.dataset.mode === mode));
    for (const b of root.querySelectorAll('.tool')) {
      if (b instanceof HTMLElement) b.hidden = !MODE_TOOLS[mode].includes(b.dataset.tool ?? '');
    }
    // A group with no tool in this mode goes too, and with it its separating line.
    for (const g of root.querySelectorAll('.tool-group')) {
      if (g instanceof HTMLElement) g.hidden = !g.querySelector('.tool:not([hidden])');
    }
    setTool(MODE_TOOLS[mode].includes(S.tool) ? S.tool : 'select');
  }

  // Tool options (Bond: order or wedge, Atom: element, Ring: size, Group, glassware): a small vertical window beside the tool.
  /** @type {Record<string, {choices: string[], label: (v: string) => string, title: (v: string) => string, current: () => string, choose: (v: string) => void, icon: () => string}>} */
  const OPTIONS = {
    bond: {
      choices: ['1', '2', '3', 'wedge', 'hash'],
      label: (v) => `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">${BOND_ICON(v)}</svg>`,
      title: (v) => [fr.bondNames[/** @type {keyof typeof fr.bondNames} */ (v)], fr.bondHints[/** @type {keyof typeof fr.bondHints} */ (v)]].filter(Boolean).join(' : '),
      current: () => S.bond,
      choose: (v) => { S.bond = v; }, icon: () => BOND_ICON(S.bond),
    },
    atom: {
      choices: ELEMENTS, label: (v) => v, title: (v) => v, current: () => S.element,
      choose: (v) => { S.element = v; }, icon: () => TEXT_ICON(S.element),
    },
    ring: {
      choices: ['3', '4', '5', '6', '7', '8', 'benzene'],
      label: (v) => `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">${RING_ICON(ringOf(v))}</svg><span>${v === 'benzene' ? '' : v}</span>`,
      title: (v) => (v === 'benzene' ? fr.ringNames.benzene : fr.ringNames.size(Number(v))),
      current: () => (S.ring.aromatic ? 'benzene' : String(S.ring.size)),
      choose: (v) => { S.ring = ringOf(v); }, icon: () => RING_ICON(S.ring),
    },
    group: {
      choices: Object.keys(GROUPS), label: (v) => groupName(v), title: (v) => groupName(v), current: () => S.group,
      choose: (v) => { S.group = v; }, icon: () => TEXT_ICON(groupName(S.group)),
    },
    // A glassware tool keeps its family's icon: a tall piece such as a condenser is a mere bar at 22 pixels.
    ...Object.fromEntries(Object.entries(FAMILIES).map(([tool, kinds]) => [tool, {
      choices: kinds, label: (/** @type {string} */ v) => `${PIECE_ICON(v)}<span>${pieceName(v)}</span>`, title: pieceName,
      current: () => S.piece[tool], choose: (/** @type {string} */ v) => { S.piece[tool] = v; }, icon: () => PIECE_ICON(kinds[0]),
    }])),
  };
  /** @type {HTMLElement} */ const flyout = $('#flyout');
  /** @param {string} tool */
  const toolBtn = (tool) => /** @type {HTMLElement} */ ($(`[data-tool="${tool}"]`));
  /** @param {string | null} tool the tool whose options to show, or null to close */
  function showFlyout(tool) {
    const o = tool ? OPTIONS[tool] : null;
    flyout.hidden = !o;
    if (!o || !tool) return;
    flyout.dataset.for = tool;
    flyout.innerHTML = o.choices.map((v) => `<button type="button" data-choice="${v}" title="${o.title(v)}" aria-label="${o.title(v)}" aria-pressed="${v === o.current()}">${o.label(v)}</button>`).join('');
    // Beside the tool, or below it when the screen is too narrow (tools in a row, on a phone).
    const r = toolBtn(tool).getBoundingClientRect();
    const beside = r.right + 6 + flyout.offsetWidth <= innerWidth - 8;
    flyout.style.left = `${beside ? r.right + 6 : Math.max(8, innerWidth - flyout.offsetWidth - 8)}px`;
    flyout.style.top = `${Math.max(8, Math.min(beside ? r.top : r.bottom + 6, innerHeight - flyout.offsetHeight - 8))}px`;
  }
  /** @param {string} tool @param {string} v */
  function chooseOption(tool, v) {
    OPTIONS[tool].choose(v);
    const icon = toolBtn(tool).querySelector('svg');
    if (icon) icon.innerHTML = OPTIONS[tool].icon();
  }
  for (const tool of Object.keys(OPTIONS)) chooseOption(tool, OPTIONS[tool].current());
  flyout.addEventListener('click', (e) => {
    const v = /** @type {HTMLElement} */ (e.target).closest('button')?.dataset.choice;
    if (!v || !flyout.dataset.for) return;
    chooseOption(flyout.dataset.for, v);
    showFlyout(null);
    renderPanel();
  });
  document.addEventListener('pointerdown', (e) => {
    const t = /** @type {Node} */ (e.target);
    if (!flyout.hidden && !flyout.contains(t) && !toolBtn(flyout.dataset.for ?? '').contains(t)) showFlyout(null);
  });

  root.querySelector('.tools')?.addEventListener('click', (e) => {
    const b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-tool]'));
    if (b) setTool(/** @type {typeof TOOLS[number]} */ (b.dataset.tool));
  });
  $('.seg').addEventListener('click', (e) => {
    const mode = /** @type {HTMLElement} */ (e.target).closest('button')?.dataset.mode;
    if (mode === 'mechanism' || mode === 'setup') setMode(mode);
  });
  $('#btn-undo').addEventListener('click', doUndo);
  $('#btn-redo').addEventListener('click', doRedo);
  const refit = () => { userMovedView = false; fit(); };
  $('#btn-fit').addEventListener('click', refit);
  // An open menu shifts just enough to stay on screen: the buttons wrap, so it may sit near either edge.
  // On a short screen it scrolls rather than run off the bottom.
  for (const d of root.querySelectorAll('.top details')) {
    d.addEventListener('toggle', () => {
      const m = d.querySelector(':scope > div');
      if (!(d instanceof HTMLDetailsElement) || !d.open || !(m instanceof HTMLElement)) return;
      m.style.left = '0px';
      const r = m.getBoundingClientRect();
      m.style.left = `${Math.max(8 - r.left, Math.min(0, innerWidth - 8 - r.right))}px`;
      m.style.maxHeight = `${innerHeight - r.top - 8}px`;
    });
  }
  /** @type {HTMLDetailsElement} */ const templatesMenu = $('#templates-menu');
  templatesMenu.addEventListener('click', (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest('button');
    const key = b?.dataset.template;
    const setup = b?.dataset.setup;
    if (!key && !setup) return;
    templatesMenu.open = false;
    // A lab set-up opens in the Montage mode, a mechanism in the other.
    if (setup) replaceDoc(SETUP_TEMPLATES[/** @type {keyof typeof SETUP_TEMPLATES} */ (setup)]());
    else replaceDoc(TEMPLATES[/** @type {keyof typeof TEMPLATES} */ (key)]());
    setMode(setup ? 'setup' : 'mechanism');
    refit();
  });
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
    message(fr.files.saved);
  }

  async function copyImage() {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob() })]);
      message(fr.files.copied);
    } catch {
      message(fr.files.copyFailed);
    }
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      replaceDoc(docFromText(await file.text()));
      refit();
      message(fr.files.opened(file.name));
    } catch {
      message(fr.files.badFile);
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
  };
  $('#btn-copy').addEventListener('click', copyImage);
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
    // The help line is for what the pointer is over; how to use the tool is in the panel.
    const hovered = S.hover && ['select', 'bond', 'chain'].includes(S.tool) ? /** @type {Record<string, string>} */ (fr.status.hover)[S.hover.kind] : '';
    statusEl.classList.toggle('kept', !hovered && stored);
    statusEl.textContent = hovered || (stored ? fr.files.kept : '');
  }

  /** A message about files (saved, copied…), until the pointer moves over something. @param {string} text */
  function message(text) {
    statusEl.classList.remove('kept');
    statusEl.textContent = text;
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
    // Buttons for what the keyboard does, for tablets: copy, paste, delete.
    const pasteBtn = clipboard ? btn('paste', P.paste) : '';
    if (!sel) {
      // Nothing selected: how to use the chosen tool, then whether the mechanism holds together.
      const touch = matchMedia('(pointer: coarse)').matches;
      const key = S.tool !== 'select' ? S.tool : S.mode === 'setup' ? 'selectSetup' : touch ? 'selectTouch' : 'select';
      const steps = /** @type {Record<string, string[]>} */ (fr.steps)[key];
      const icon = root.querySelector(`.tool[data-tool="${S.tool}"] svg`)?.outerHTML ?? '';
      const check = S.mode === 'setup' ? `<p class="tip">${P.setupTip}</p>`
        : S.warnings.length ? `<h3>${P.checkTitle}</h3>${warningsBox(S.warnings)}`
        : d.atoms.length ? `<h3>${P.checkTitle}</h3><p class="ok">${fr.warnings.none}</p>` : '';
      html = `<h3>${P.toolTitle}</h3>
        <div class="card"><span class="card-icon">${icon}</span><h2>${fr.tools[S.tool]}</h2><kbd>${fr.toolKeys[S.tool]}</kbd></div>
        <p class="label">${P.howTo}</p><ol class="steps">${steps.map((x) => `<li>${x}</li>`).join('')}</ol>
        ${pasteBtn ? `<div class="row">${pasteBtn}</div>` : ''}${check}
        <div class="more"><p class="counts">${P.counts(d)}</p>
          <details data-k="shortcuts"><summary>${P.shortcutsTitle}</summary><ul class="small">${P.shortcuts.map((x) => `<li>${x}</li>`).join('')}</ul></details>
          <details data-k="news"><summary>${P.newsTitle}</summary><ul class="small">${P.phaseItems.map((x) => `<li>${x}</li>`).join('')}</ul><p class="muted small">${P.nextTitle} : ${P.nextItems.join(' ')}</p></details>
        </div>`;
    } else {
      // A selection: the same header and footer for every kind of object, its own settings between them.
      let icon = '', title = '', body = '', keys = '';
      if (sel.kind === 'group') {
        icon = svgIcon('<rect x="3.5" y="4.5" width="15" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 2"/>');
        title = P.group(sel.ids?.length ?? 0);
        body = `<p class="muted">${P.groupHint}</p>`;
      } else if (sel.kind === 'atom') {
        const a = M.findAtom(d, sel.id);
        if (a) {
          const pairs = d.marks.filter((m) => m.atom === a.id && m.kind === 'lonePair').length;
          icon = `<span class="sym">${esc(a.element)}</span>`;
          title = P.titles.atom;
          body = `<div><p class="label">${P.element}</p><div class="elements">${ELEMENTS.map((el) => btn(`el-${el}`, el, a.element === el)).join('')}</div></div>
            <div class="setting"><span>${P.charge}</span>${stepper('charge-1', P.chargeMinus, fr.chargeText(a.charge), 'charge+1', P.chargePlus)}</div>
            <div class="setting"><span>${P.lonePairs}</span>${stepper('lp-remove', P.removeLonePair, String(pairs), 'lp-add', P.addLonePair)}</div>
            <div class="setting"><span>${P.hydrogens}</span><output>${M.hydrogenCount(d, a)}</output></div>`;
          keys = P.keysAtom;
        }
      } else if (sel.kind === 'bond') {
        const b = M.findBond(d, sel.id);
        if (b) {
          const kind = b.stereo ?? String(b.order);
          icon = svgIcon(BOND_ICON(kind));
          title = P.titles.bond;
          body = `<div><p class="label">${P.bondKind}</p><div class="options">${OPTIONS.bond.choices.map((v) => {
            const hint = fr.bondHints[/** @type {keyof typeof fr.bondHints} */ (v)];
            return `<button type="button" class="opt" data-action="kind-${v}" aria-pressed="${v === kind}">${svgIcon(BOND_ICON(v))}${fr.bondNames[/** @type {keyof typeof fr.bondNames} */ (v)]}${hint ? `<small>${hint}</small>` : ''}</button>`;
          }).join('')}</div></div>`;
          keys = P.keysBond;
        }
      } else if (sel.kind === 'curved' || sel.kind === 'handle') {
        const c = d.curvedArrows.find((x) => x.id === sel.id);
        if (c) {
          icon = svgIcon(ICONS.curved);
          title = P.titles.curved;
          body = `<p class="label">${P.electrons}</p><div class="seg">${btn('electrons-2', P.electronsTwo, c.electrons === 2)}${btn('electrons-1', P.electronsOne, c.electrons === 1)}</div>
            <dl class="kv"><dt>${P.source}</dt><dd>${esc(describeAnchor(c.from))}</dd><dt>${P.target}</dt><dd>${esc(describeAnchor(c.to))}</dd></dl>
            <div class="col">${btn('bend-reset', P.resetBend)}</div>`;
        }
      } else if (sel.kind === 'rxn') {
        const r = d.reactionArrows.find((x) => x.id === sel.id);
        if (r) {
          const opts = Object.entries(fr.kinds).map(([k, label]) => `<option value="${k}"${r.kind === k ? ' selected' : ''}>${label}</option>`).join('');
          icon = svgIcon(ICONS.rxn);
          title = P.titles.rxn;
          body = `<label for="rx-kind">${P.kind}</label><select id="rx-kind">${opts}</select>
            <label for="rx-above">${P.above}</label><textarea id="rx-above" rows="2">${esc(r.above)}</textarea>
            <label for="rx-below">${P.below}</label><textarea id="rx-below" rows="2">${esc(r.below)}</textarea>
            <p class="muted small">${P.formatHint}</p>
            <p class="label">${P.insert}</p><div class="row">${['Δ', 'hν', '°C', '⁻', '→'].map((s) => `<button type="button" data-insert="${s}">${s}</button>`).join('')}</div>`;
        }
      } else if (sel.kind === 'mark') {
        const m = d.marks.find((x) => x.id === sel.id);
        if (m) {
          icon = svgIcon(m.kind === 'partial' ? TEXT_ICON(m.value ?? 'δ+') : m.kind === 'radical' ? '<circle cx="11" cy="11" r="2.2" fill="currentColor"/>' : ICONS.lonePair);
          title = `${P.markNames[m.kind]}${m.kind === 'partial' ? ` ${esc(m.value ?? 'δ+')}` : ''}`;
          body = `<p class="muted">${P.rotateHint}</p>`;
        }
      } else if (sel.kind === 'charge') {
        const a = M.findAtom(d, sel.id);
        if (a) {
          icon = svgIcon(ICONS.charge);
          title = P.titles.charge;
          body = `<dl class="kv"><dt>${P.charge}</dt><dd>${fr.chargeText(a.charge)}</dd></dl><div class="row">${btn('charge-1', '− 1')}${btn('charge+1', '+ 1')}</div><p class="muted">${P.rotateHint}</p>`;
        }
      } else if (sel.kind === 'piece') {
        const g = d.apparatus.find((x) => x.id === sel.id);
        if (g) {
          icon = PIECE_ICON(g.kind);
          title = pieceName(g.kind);
          body = `<p class="label">${P.rotate}</p><div class="row">${btn('turn-15', '↺ 15°')}${btn('turn+15', '↻ 15°')}</div>
            <div class="col">${btn('detach', P.detach)}</div><p class="muted">${P.pieceHint}</p>`;
        }
      } else if (sel.kind === 'text') {
        const t = d.texts.find((x) => x.id === sel.id);
        if (t) {
          icon = svgIcon(ICONS.text);
          title = P.titles.text;
          body = `<label for="tx-text">${P.textLabel}</label><input id="tx-text" type="text" autocomplete="off" value="${esc(t.text)}">
            <dl class="kv"><dt>${P.textSize}</dt><dd>${Math.round(t.size ?? STYLE.text)}</dd></dl><div class="row">${btn('size-2', '−')}${btn('size+2', '+')}</div>`;
        }
      }
      // The warnings about this selection; the others are in the panel of the tool.
      const shown = S.warnings.filter((w) => w.ids.includes(sel.id) || w.ids.some((id) => sel.ids?.includes(id)));
      if (title) {
        html = `<h3>${P.selectionTitle}</h3>
          <div class="card"><span class="card-icon">${icon}</span><div><h2>${title}</h2><p class="muted small">${P.escHint}</p></div></div>
          ${body}${warningsBox(shown)}
          <div class="btns">${selectedIds() ? btn('copy', P.copy) : ''}${pasteBtn}<button type="button" class="danger" data-action="delete">${P.remove}</button></div>
          ${keys ? `<p class="muted small">${keys}</p>` : ''}
          <button type="button" class="active-tool" data-action="deselect">${P.activeTool} <b>${fr.tools[S.tool]}</b> — ${P.seeHelp} <span aria-hidden="true">›</span></button>`;
      }
    }
    // Redrawing the panel after each change must not close what the student opened.
    const open = [...panel.querySelectorAll('details[open]')].map((x) => x.getAttribute('data-k'));
    panel.innerHTML = html;
    for (const k of open) panel.querySelector(`details[data-k="${k}"]`)?.setAttribute('open', '');
  }

  /** A 22-pixel icon for the panel's header. @param {string} inner */
  function svgIcon(inner) {
    return `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">${inner}</svg>`;
  }
  /** − value + buttons for a number. @param {string} less @param {string} lessLabel @param {string} value @param {string} more @param {string} moreLabel */
  function stepper(less, lessLabel, value, more, moreLabel) {
    return `<span class="stepper"><button type="button" data-action="${less}" aria-label="${lessLabel}">−</button><output>${value}</output><button type="button" data-action="${more}" aria-label="${moreLabel}">+</button></span>`;
  }

  /** @param {typeof S.warnings} list */
  function warningsBox(list) {
    if (!list.length) return '';
    return `<div class="warnings"><h3>${fr.warnings.title(list.length)}</h3><ul>${list.map((w) => `<li>${fr.warnings[w.code](/** @type {any} */ (w.params))}</li>`).join('')}</ul></div>`;
  }

  panel.addEventListener('click', (e) => {
    const b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('button'));
    if (!b) return;
    if (b.dataset.insert) { insertText(b.dataset.insert); return; }
    const act = b.dataset.action;
    if (act === 'copy') { copySelection(); renderPanel(); return; }
    if (act === 'paste') { pasteClipboard(); return; }
    if (act === 'deselect') { S.selection = null; render(); renderPanel(); return; }
    const sel = S.selection;
    if (!act || !sel) return;
    commit((d) => {
      if (act === 'delete') { deleteHit(d, sel); return; }
      if (act.startsWith('el-')) { M.setElement(d, sel.id, act.slice(3)); return; }
      if (act === 'turn-15' || act === 'turn+15') {
        const g = d.apparatus.find((x) => x.id === sel.id);
        if (g) A.turn(d, A.assembly(d, g.id), g, Number(act.slice(4)));
        return;
      }
      if (act === 'detach') { M.moveObjects(d, new Set([sel.id]), STYLE.bond, 0); return; }
      if (act === 'size-2' || act === 'size+2') { const t = d.texts.find((x) => x.id === sel.id); if (t) M.setTextSize(d, t.id, (t.size ?? STYLE.text) + Number(act.slice(4))); return; }
      if (act === 'charge-1' || act === 'charge+1') { const a = M.findAtom(d, sel.id); if (a) a.charge += act === 'charge+1' ? 1 : -1; return; }
      if (act === 'lp-add') { M.addMark(d, sel.id, 'lonePair'); return; }
      if (act === 'lp-remove') {
        const m = [...d.marks].reverse().find((x) => x.atom === sel.id && x.kind === 'lonePair');
        if (m) M.removeMark(d, m.id);
        return;
      }
      if (act.startsWith('kind-')) { M.setBondKind(d, sel.id, bondKind(act.slice(5))); return; }
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
  setMode('mechanism');
  renderPanel();
  updateButtons();
}
