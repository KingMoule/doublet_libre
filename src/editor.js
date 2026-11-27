// @ts-check
import { fr } from './i18n/fr.js';
import * as M from './model.js';
import { renderDoc, defaultBend, bendFromControl, docBounds, esc, layout, STYLE } from './render.js';
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
import { LEVELS, series } from './naming/generate.js';
import { answerDrawing, answerName, solution } from './naming/exercise.js';
import { LEVELS as MECHANISM_LEVELS, series as mechanismSeries } from './mechanism/generate.js';
import { answerMechanism, solution as mechanismSolution } from './mechanism/exercise.js';

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
/** @typedef {'mechanism' | 'setup' | 'exercise'} Mode */
/** The tools on the rail when drawing a mechanism or a lab set-up; an exercise has its own (KINDS). */
const MODE_TOOLS = {
  mechanism: TOOLS.filter((t) => !FAMILIES[t]),
  setup: ['select', ...Object.keys(FAMILIES), 'text', 'erase'],
};
/**
 * The two exercises of the Exercice menu, behind one panel. Each gives its series, its link, its tools, where
 * an item starts (typed: a name to type, the drawing given), how a drawing or a name is checked, its solution,
 * and the words that change. An item is a nomenclature one (naming/generate.js) or a mechanism one (mechanism/generate.js).
 * @typedef {'naming' | 'mechanism'} Kind
 */
const X = fr.exercise, MX = fr.mechanism;
const KINDS = {
  naming: {
    levels: LEVELS, series, link: 'exercice', title: X.title, seriesOf: X.seriesOf, clear: X.clear,
    tools: ['select', 'bond', 'chain', 'ring', 'atom', 'erase'],
    /** @param {string} l */ levelName: (l) => /** @type {Record<string, string>} */ (X.levels)[l],
    /** @param {any} it */ typed: (it) => it.dir === 'name',
    /** @param {any} it */ start: (it) => (it.dir === 'name' ? it.doc : M.emptyDoc()),
    /** @param {any} it @param {M.Doc} doc @param {string} name */ answer: (it, doc, name) => (it.dir === 'name' ? answerName(it, name) : answerDrawing(it, doc)),
    /** @param {any} it */ solution: (it) => solution(it),
    /** @param {any} it */ tool: (it) => 'chain',
    /** @param {any} it what to draw, its words, and how the recap says it */
    ask: (it) => ({ prompt: X.drawIt, target: it.name, help: X.drawHelp, how: it.dir === 'name' ? X.nameDir : X.drawDir }),
  },
  mechanism: {
    levels: MECHANISM_LEVELS, series: mechanismSeries, link: 'mecanisme', title: MX.title, seriesOf: MX.seriesOf, clear: MX.restart,
    tools: ['select', 'bond', 'chain', 'ring', 'atom', 'lonePair', 'charge', 'curved', 'erase'],
    /** @param {string} l */ levelName: (l) => { const [r, s] = l.split('-'); return `${/** @type {Record<string, string>} */ (MX.reactions)[r]} · ${/** @type {Record<string, string>} */ (MX.levels)[s]}`; },
    typed: () => false,
    /** @param {any} it */ start: (it) => it.given,
    /** @param {any} it @param {M.Doc} doc */ answer: (it, doc) => answerMechanism(it, doc),
    /** @param {any} it */ solution: (it) => mechanismSolution(it),
    /** @param {any} it */ tool: (it) => (it.style === 'arrows' ? 'curved' : 'chain'),
    /** @param {any} it */
    ask: (it) => ({ prompt: /** @type {Record<string, string>} */ (MX.prompts)[it.style], target: MX.reaction(it.alkene, it.reagent), help: MX.help, how: /** @type {Record<string, string>} */ (MX.levels)[it.style] }),
  },
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
/** The kinds of reaction arrow, drawn as render.js draws them: one line, two half arrows, two heads, an open double line, a crossed arrow. */
const RXN_ICONS = {
  forward: ICONS.rxn,
  equilibrium: '<path d="M3 9 H18 L14.5 6 M19 13 H4 L7.5 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  resonance: '<path d="M7 11 H15" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 11 L7 7.5 L7 14.5 Z M19.5 11 L15 7.5 L15 14.5 Z" fill="currentColor"/>',
  retro: '<path d="M3 8.5 H16 M3 13.5 H16 M13.5 5.5 L19 11 L13.5 16.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  noReaction: `${ICONS.rxn}<path d="M8 7.5 L12 14.5 M12 7.5 L8 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
};
/** Tools with two variants, chosen in their option window; Shift + click gives the other one. Each: [value, icon]. */
const VARIANTS = {
  lonePair: [['lonePair', ICONS.lonePair], ['radical', '<circle cx="11" cy="11" r="2.2" fill="currentColor"/>']],
  charge: [['+1', ICONS.charge], ['-1', '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 11 H14.5" stroke="currentColor" stroke-width="1.4"/>']],
  partial: [['δ+', TEXT_ICON('δ+')], ['δ−', TEXT_ICON('δ−')]],
  curved: [['2', ICONS.curved], ['1', '<path d="M4 17 C5 6 15 4 17 13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14 12.5 L17.3 14.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>']],
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
      <details class="menu" id="exercise-menu"><summary><svg width="16" height="16" viewBox="0 0 22 22" aria-hidden="true">${ICONS.chain}</svg>${fr.modes.exercise}</summary><div>
        ${Object.entries(fr.exercise.kinds).map(([k, name]) => `<button type="button" data-exercise="${k}">${name}</button>`).join('')}
      </div></details>
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
    /** @type {Mode} */ mode: 'mechanism',
    /** The exercise of the Exercice menu shown. @type {Kind} */ kind: 'naming',
    /**
     * The series of each exercise, kept while the student goes to the other one or back to the other modes.
     * @type {Record<Kind, {kind: Kind, level: string, seed: number, items: any[], cur: number,
     *   res: ('ok' | 'remark' | 'wrong')[], answers: string[], drafts: M.Doc[], showSol: boolean,
     *   fb: {verdict: string, title: string, lines: string[], ids?: string[]} | null} | null>}
     */
    exs: { naming: null, mechanism: null },
    /** The series shown. */
    get ex() { return this.exs[this.kind]; },
    /**
     * While an exercise is shown, the drawing of the other modes waits here with its undo history; it is
     * the only one stored in this browser.
     * @type {{doc: M.Doc, history: ReturnType<typeof M.createHistory>} | null}
     */
    aside: null,
    /** The piece each glassware tool puts down. @type {Record<string, string>} */
    piece: Object.fromEntries(Object.entries(FAMILIES).map(([f, kinds]) => [f, kinds[0]])),
    element: 'C',
    group: 'Ph',
    /** The kind of the next reaction arrow. @type {import('./model.js').ReactionArrow['kind']} */
    rxnKind: 'forward',
    /** The variant each two-variant tool puts down. @type {Record<string, string>} */
    variant: Object.fromEntries(Object.entries(VARIANTS).map(([tool, choices]) => [tool, choices[0][0]])),
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
    // An exercise's verdict outlines what it is about, as a warning does.
    const outlined = [...S.warnings.flatMap((w) => w.ids), ...(S.mode === 'exercise' ? S.ex?.fb?.ids ?? [] : [])];
    const r = renderDoc(S.doc, {
      selection: S.selection, hover: S.hover, preview: S.preview, marquee: S.marquee, warnings: outlined,
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
    // A mechanism to complete is framed whole: the room left to draw in counts, not only what is given,
    // with two bonds more on the right for a product drawn longer than expected.
    const it = S.mode === 'exercise' && S.ex?.kind === 'mechanism' ? S.ex.items[S.ex.cur] : null;
    const answer = it && docBounds(it.answer.doc, layout(it.answer.doc));
    const [own, whole] = [docBounds(S.doc, S.layout), answer && { ...answer, r: answer.r + 2 * STYLE.bond }];
    const b = own && whole ? { l: Math.min(own.l, whole.l), t: Math.min(own.t, whole.t), r: Math.max(own.r, whole.r), b: Math.max(own.b, whole.b) } : own ?? whole;
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
    if (readOnly()) return;
    M.record(S.history, S.doc);
    fn(S.doc);
    afterChange();
  }

  /** In the Exercice mode, only what is to be drawn can be changed; a molecule to name or a solution cannot. */
  function readOnly() {
    const ex = S.ex;
    const it = S.mode === 'exercise' && ex ? ex.items[ex.cur] : null;
    return S.mode === 'exercise' && (!it || KINDS[S.kind].typed(it) || /** @type {NonNullable<typeof ex>} */ (ex).showSol);
  }

  /** A template, a file or a blank page replaces the drawing of the other modes, so it leaves the exercise first. @param {M.Doc} doc */
  function replaceDoc(doc) {
    if (S.mode === 'exercise') setMode('mechanism');
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
    if (S.mode === 'exercise') return; // the exercise drawing is not the student's document
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

  /** What a two-variant tool puts down: the chosen variant, or the other one with Shift. @param {keyof typeof VARIANTS} tool @param {boolean} shift */
  function variantOf(tool, shift) {
    const [a, b] = VARIANTS[tool].map((x) => x[0]);
    return (S.variant[tool] === a) !== shift ? a : b;
  }

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
      else if (tool === 'lonePair') M.addMark(d, id, /** @type {'lonePair' | 'radical'} */ (variantOf('lonePair', shift)));
      else if (tool === 'charge') { const a = M.findAtom(d, id); if (a) a.charge += Number(variantOf('charge', shift)); }
      else if (tool === 'partial') M.setPartial(d, id, variantOf('partial', shift));
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
          if (o) Object.assign(g, o); // from where it started, as a snap may have turned it
        }
        M.moveObjects(d, D.ids, p.x - D.start.x, p.y - D.start.y);
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
        const ra = M.addReactionArrow(d, { x1: D.start.x, y1: D.start.y, x2: end.x, y2: end.y, kind: S.rxnKind, above: '', below: '' });
        S.selection = { kind: 'rxn', id: ra.id };
      });
      return;
    }
    if (D.type === 'curved') {
      const to = D.moved ? arrowTarget(e, p, D.from) : null;
      if (!to) { render(); return; }
      const single = variantOf('curved', e.shiftKey) === '1' || ('mark' in D.from && S.doc.marks.find((m) => m.id === D.from.mark)?.kind === 'radical');
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
      // Only a tool shown on the rail: those of the mode, or of the exercise.
      const shown = [...root.querySelectorAll('.tool:not([hidden])')].map((b) => /** @type {HTMLElement} */ (b).dataset.tool ?? '');
      const tool = shown.find((t) => fr.toolKeys[/** @type {typeof TOOLS[number]} */ (t)].toLowerCase() === k.toLowerCase());
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

  /**
   * Shows a mode: drawing a mechanism, a lab set-up, or an exercise (nomenclature or mechanisms). The exercise
   * has its own drawing; the other one waits aside, with its undo history, until the student comes back.
   * @param {Mode} mode
   */
  function setMode(mode) {
    const leaving = S.mode === 'exercise' && mode !== 'exercise';
    if (leaving && S.aside) {
      keepDraft();
      ({ doc: S.doc, history: S.history } = S.aside);
      S.aside = null;
      S.selection = S.hover = null;
      try { window.history.replaceState(null, '', location.pathname + location.search); } catch { /* no history to edit */ }
    }
    if (mode === 'exercise' && S.mode !== 'exercise') S.aside = { doc: S.doc, history: S.history };
    S.mode = mode;
    for (const b of root.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b instanceof HTMLElement && b.dataset.mode === mode));
    $('#exercise-menu').classList.toggle('on', mode === 'exercise');
    if (mode === 'exercise') { if (S.ex) showItem(); else startSeries(KINDS[S.kind].levels[0], newSeed()); return; }
    showTools(MODE_TOOLS[mode]);
    setTool(MODE_TOOLS[mode].includes(S.tool) ? S.tool : 'select');
    if (leaving) { render(); userMovedView = false; fit(); updateButtons(); }
  }

  /** @param {string[]} tools the tools shown on the rail */
  function showTools(tools) {
    for (const b of root.querySelectorAll('.tool')) {
      if (b instanceof HTMLElement) b.hidden = !tools.includes(b.dataset.tool ?? '');
    }
    // A group with no tool in this mode goes too, and with it its separating line.
    for (const g of root.querySelectorAll('.tool-group')) {
      if (g instanceof HTMLElement) g.hidden = !g.querySelector('.tool:not([hidden])');
    }
  }

  // ---------- exercises ----------

  const newSeed = () => 1000 + Math.floor(Math.random() * 9000);

  /** Opens an exercise of the Exercice menu, its series where the student left it. @param {Kind} kind */
  function openExercise(kind) {
    keepDraft();
    S.kind = kind;
    setMode('exercise');
  }

  /** A new series of the level; its link (level and seed) gives the same series to anyone. @param {string} level @param {number} seed */
  function startSeries(level, seed) {
    S.exs[S.kind] = { kind: S.kind, level, seed, items: KINDS[S.kind].series(level, seed).items, cur: 0, res: [], answers: [], drafts: [], showSol: false, fb: null };
    showItem();
  }

  /** The student's drawing of the current item, kept when they move on or leave the exercise. */
  function keepDraft() {
    const ex = S.ex;
    const it = ex?.items[ex.cur];
    if (ex && it && S.mode === 'exercise' && !ex.showSol && !KINDS[ex.kind].typed(it)) ex.drafts[ex.cur] = S.doc;
  }

  /** Puts the current item on the canvas: the molecule to name, the student's drawing or what is given, or the solution. */
  function showItem() {
    const ex = /** @type {NonNullable<typeof S.ex>} */ (S.ex);
    const K = KINDS[ex.kind];
    const it = ex.items[ex.cur];
    try { window.history.replaceState(null, '', `#${K.link}-${ex.level}-${ex.seed}`); } catch { /* no history to edit */ }
    S.history = M.createHistory();
    S.selection = S.hover = null;
    S.doc = !it ? M.emptyDoc() : ex.showSol ? K.solution(it).doc : (!K.typed(it) && ex.drafts[ex.cur]) || structuredClone(K.start(it));
    showTools(readOnly() ? ['select'] : K.tools);
    setTool(readOnly() ? 'select' : K.tools.includes(S.tool) && S.tool !== 'select' ? S.tool : /** @type {typeof TOOLS[number]} */ (K.tool(it)));
    render();
    userMovedView = false;
    fit();
    updateButtons();
    updateStatus();
  }

  /** @param {string} act a button of the exercise panel */
  function exerciseAction(act) {
    const ex = /** @type {NonNullable<typeof S.ex>} */ (S.ex);
    const K = KINDS[ex.kind];
    const it = ex.items[ex.cur];
    if (act === 'check') {
      const input = /** @type {HTMLInputElement | null} */ (panel.querySelector('#ex-answer'));
      const a = K.answer(it, S.doc, input?.value ?? '');
      ex.fb = a;
      if (a.verdict !== 'empty' && !ex.res[ex.cur]) ex.res[ex.cur] = a.verdict === 'wrong' ? 'wrong' : K.typed(it) && a.lines.length ? 'remark' : 'ok';
      render();
      renderPanel();
      /** @type {HTMLInputElement | null} */ (panel.querySelector('#ex-answer'))?.focus();
    } else if (act === 'clear') {
      // Back to the start: the empty canvas, or what a mechanism gives.
      M.record(S.history, S.doc);
      S.doc = structuredClone(K.start(it));
      ex.fb = null;
      afterChange();
    } else if (act === 'solution') {
      if (!ex.res[ex.cur]) ex.res[ex.cur] = 'wrong';
      keepDraft();
      ex.showSol = true;
      showItem();
    } else if (act === 'next') {
      keepDraft();
      ex.cur++;
      ex.showSol = false;
      ex.fb = null;
      showItem();
      /** @type {HTMLInputElement | null} */ (panel.querySelector('#ex-answer'))?.focus();
    } else if (act === 'restart' || act === 'new') {
      startSeries(ex.level, act === 'new' ? newSeed() : ex.seed);
    }
  }

  // Tool options (Bond: order or wedge, Atom: element, Ring: size, Group, glassware, two-variant tools): a small vertical window beside the tool.
  // `named`: each choice has a name beside its icon, so the window lines them up on the left.
  /** @type {Record<string, {choices: string[], label: (v: string) => string, title: (v: string) => string, current: () => string, choose: (v: string) => void, icon: () => string, named?: boolean}>} */
  const OPTIONS = {
    ...Object.fromEntries(Object.entries(VARIANTS).map(([tool, pairs]) => {
      const icons = Object.fromEntries(pairs);
      const name = (/** @type {string} */ v) => /** @type {Record<string, Record<string, string>>} */ (fr.variants)[tool][v];
      return [tool, {
        choices: pairs.map((x) => x[0]), named: true, title: name,
        label: (/** @type {string} */ v) => `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">${icons[v]}</svg><span>${name(v)}</span>`,
        current: () => S.variant[tool], choose: (/** @type {string} */ v) => { S.variant[tool] = v; }, icon: () => icons[S.variant[tool]],
      }];
    })),
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
    rxn: {
      choices: Object.keys(RXN_ICONS), named: true, title: (v) => fr.kinds[/** @type {keyof typeof fr.kinds} */ (v)],
      label: (v) => `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">${RXN_ICONS[/** @type {keyof typeof RXN_ICONS} */ (v)]}</svg><span>${fr.kinds[/** @type {keyof typeof fr.kinds} */ (v)]}</span>`,
      current: () => S.rxnKind, choose: (v) => { S.rxnKind = /** @type {typeof S.rxnKind} */ (v); }, icon: () => RXN_ICONS[S.rxnKind],
    },
    // A glassware tool keeps its family's icon: a tall piece such as a condenser is a mere bar at 22 pixels.
    ...Object.fromEntries(Object.entries(FAMILIES).map(([tool, kinds]) => [tool, {
      choices: kinds, named: true, label: (/** @type {string} */ v) => `${PIECE_ICON(v)}<span>${pieceName(v)}</span>`, title: pieceName,
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
    flyout.classList.toggle('named', !!o.named);
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
    const b = /** @type {HTMLElement} */ (e.target).closest('button');
    const mode = b?.dataset.mode, kind = b?.dataset.exercise;
    if (mode === 'mechanism' || mode === 'setup') setMode(mode);
    // The Exercice menu: nomenclature or mechanisms.
    if (kind === 'naming' || kind === 'mechanism') { /** @type {HTMLDetailsElement} */ ($('#exercise-menu')).open = false; openExercise(kind); }
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
    const ex = S.ex;
    if (S.mode === 'exercise' && ex) {
      const level = KINDS[ex.kind].levelName(ex.level);
      statusEl.classList.remove('kept');
      const good = ex.res.filter((r) => r !== 'wrong').length;
      statusEl.textContent = ex.cur < ex.items.length ? X.status(ex.cur + 1, ex.items.length, level, ex.seed) : X.scoreStatus(good, ex.items.length);
      return;
    }
    // The help line is for what the pointer is over; how to use the tool is in the panel.
    const h = S.hover;
    const loose = h?.kind === 'piece' && A.loose(S.doc.apparatus.find((g) => g.id === h.id)?.kind ?? '');
    const hovered = h && ['select', 'bond', 'chain'].includes(S.tool) ? /** @type {Record<string, string>} */ (fr.status.hover)[loose ? 'loosePiece' : h.kind] : '';
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

  /** The exercise panel: the question, the answer, Vérifier, Solution, Suivant; at the end, the score. */
  function exercisePanel() {
    const ex = /** @type {NonNullable<typeof S.ex>} */ (S.ex);
    const K = KINDS[ex.kind];
    const n = ex.items.length;
    // data-r: the result of each item, ok, remark or wrong.
    const dots = `<div class="dots" aria-hidden="true">${ex.items.map((_, i) => `<i${ex.res[i] ? ` data-r="${ex.res[i]}"` : ''}${i === ex.cur ? ' class="cur"' : ''}></i>`).join('')}</div>`;
    let h = `<div class="card"><span class="card-icon"><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">${ex.kind === 'mechanism' ? ICONS.curved : ICONS.chain}</svg></span>
      <div><h2>${K.title}</h2><p class="muted small">${K.seriesOf(n)}</p></div></div>
      <label for="ex-level">${X.level}</label>
      <select id="ex-level">${K.levels.map((l) => `<option value="${l}"${l === ex.level ? ' selected' : ''}>${K.levelName(l)}</option>`).join('')}</select>`;
    if (ex.cur >= n) {
      const good = ex.res.filter((r) => r !== 'wrong').length;
      return `${h}<h2>${X.done}</h2><p class="score">${good} / ${n}</p>${dots}
        <ul class="recap">${ex.items.map((it, i) => `<li><span class="mark" data-r="${ex.res[i] ?? 'wrong'}">${ex.res[i] === 'wrong' ? '✗' : '✓'}</span>
          <span><span class="chem">${esc(K.ask(it).target)}</span> <span class="muted small">· ${K.ask(it).how}${ex.res[i] === 'remark' ? `, ${X.withRemark}` : ''}</span></span></li>`).join('')}</ul>
        <div class="row"><button type="button" class="primary" data-ex="restart">${X.again}</button><button type="button" data-ex="new">${X.newSeries}</button></div>`;
    }
    const it = ex.items[ex.cur];
    const ask = K.ask(it);
    // A mechanism: the reaction, then what to draw; a molecule: « Dessinez : » and its name.
    const question = ex.kind === 'mechanism'
      ? `<p><strong class="chem">${esc(ask.target)}</strong></p><p>${ask.prompt}</p>`
      : `<p>${ask.prompt} <strong class="chem">${esc(ask.target)}</strong></p>`;
    h += `<div class="progress"><span class="count">${X.question(ex.cur + 1, n)}</span>${dots}</div>`;
    h += K.typed(it)
      ? `<p>${X.nameIt}</p><label for="ex-answer">${X.answer}</label>
        <div class="row"><input id="ex-answer" class="grow" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${X.placeholder}" value="${esc(ex.answers[ex.cur] ?? '')}"><button type="button" class="primary" data-ex="check">${X.check}</button></div>`
      : `${question}<p class="muted small">${ask.help}</p>
        <div class="row"><button type="button" class="primary" data-ex="check"${ex.showSol ? ' disabled' : ''}>${X.check}</button><button type="button" data-ex="clear"${ex.showSol ? ' disabled' : ''}>${K.clear}</button></div>`;
    const fb = ex.fb;
    if (fb) h += fb.verdict === 'empty' ? `<p class="muted small">${fb.title}</p>`
      : `<div class="fb" data-r="${fb.verdict === 'wrong' ? 'wrong' : fb.title === X.remark ? 'remark' : 'ok'}"><b>${esc(fb.title)}</b>${fb.lines.map((l) => `<span>${esc(l)}</span>`).join('')}</div>`;
    h += `<div class="row"><button type="button" data-ex="solution"${ex.showSol ? ' disabled' : ''}>${X.solution}</button>
      <button type="button" data-ex="next"${ex.res[ex.cur] ? '' : ' disabled'}>${ex.cur === n - 1 ? X.score : X.next}</button></div>`;
    if (ex.showSol) h += `<h3>${X.solution}</h3><ol class="steps">${K.solution(it).steps.map((/** @type {string} */ s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
    else if (!ex.res[ex.cur]) h += `<p class="muted small">${X.firstCheck}</p>`;
    return h;
  }

  function renderPanel() {
    if (S.mode === 'exercise' && S.ex) { panel.innerHTML = exercisePanel(); return; }
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
        <div class="more"><p class="counts">${S.mode === 'setup' ? P.setupCounts(d) : P.counts(d)}</p>
          <details data-k="shortcuts"><summary>${P.shortcutsTitle}</summary><ul class="small">${P.shortcuts.map((x) => `<li>${x}</li>`).join('')}</ul></details>
          <details data-k="news"><summary>${P.newsTitle}</summary><ul class="small">${P.phaseItems.map((x) => `<li>${x}</li>`).join('')}</ul><p class="muted small">${P.nextTitle} : ${P.nextItems.join(' ')}</p></details>
        </div>`;
    } else {
      // A selection: the same header and footer for every kind of object, its own settings between them.
      const part = selectionParts(sel);
      // The warnings about this selection; the others are in the panel of the tool.
      const shown = S.warnings.filter((w) => w.ids.includes(sel.id) || w.ids.some((id) => sel.ids?.includes(id)));
      if (part) {
        html = `<h3>${P.selectionTitle}</h3>
          <div class="card"><span class="card-icon">${part.icon}</span><div><h2>${part.title}</h2><p class="muted small">${P.escHint}</p></div></div>
          ${part.body}${warningsBox(shown)}
          <div class="btns">${selectedIds() ? btn('copy', P.copy) : ''}${pasteBtn}<button type="button" class="danger" data-action="delete">${P.remove}</button></div>
          ${part.keys ? `<p class="muted small">${part.keys}</p>` : ''}
          <button type="button" class="active-tool" data-action="deselect">${P.activeTool} <b>${fr.tools[S.tool]}</b> — ${P.seeHelp} <span aria-hidden="true">›</span></button>`;
      }
    }
    // Redrawing the panel after each change must not close what the student opened.
    const open = [...panel.querySelectorAll('details[open]')].map((x) => x.getAttribute('data-k'));
    panel.innerHTML = html;
    for (const k of open) panel.querySelector(`details[data-k="${k}"]`)?.setAttribute('open', '');
  }

  /**
   * What the panel shows of a selection between the common header and footer, in the same few widgets:
   * a list for one choice among several, − value + for a number, a field for text.
   * @param {Hit} sel @returns {{icon: string, title: string, body: string, keys?: string} | null}
   */
  function selectionParts(sel) {
    const P = fr.panel;
    const d = S.doc;
    switch (sel.kind) {
      case 'group':
        return {
          icon: svgIcon('<rect x="3.5" y="4.5" width="15" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 2"/>'),
          title: P.group(sel.ids?.length ?? 0), body: `<p class="muted">${P.groupHint}</p>`,
        };
      case 'atom': {
        const a = M.findAtom(d, sel.id);
        if (!a) return null;
        const pairs = d.marks.filter((m) => m.atom === a.id && m.kind === 'lonePair').length;
        return {
          icon: `<span class="sym">${esc(a.element)}</span>`, title: P.titles.atom, keys: P.keysAtom,
          body: `<div><p class="label">${P.element}</p><div class="elements">${ELEMENTS.map((el) => btn(`el-${el}`, el, a.element === el)).join('')}</div></div>
            <div class="setting"><span>${P.charge}</span>${stepper('charge-1', P.chargeMinus, fr.chargeText(a.charge), 'charge+1', P.chargePlus)}</div>
            <div class="setting"><span>${P.lonePairs}</span>${stepper('lp-remove', P.removeLonePair, String(pairs), 'lp-add', P.addLonePair)}</div>
            <div class="setting"><span>${P.hydrogens}</span><output>${M.hydrogenCount(d, a)}</output></div>`,
        };
      }
      case 'bond': {
        const b = M.findBond(d, sel.id);
        if (!b) return null;
        const kind = b.stereo ?? String(b.order);
        return {
          icon: svgIcon(BOND_ICON(kind)), title: P.titles.bond, keys: P.keysBond,
          body: options(P.bondKind, OPTIONS.bond.choices.map((v) => opt(`kind-${v}`, BOND_ICON(v), fr.bondNames[/** @type {keyof typeof fr.bondNames} */ (v)], v === kind, fr.bondHints[/** @type {keyof typeof fr.bondHints} */ (v)]))),
        };
      }
      case 'curved': case 'handle': {
        const c = d.curvedArrows.find((x) => x.id === sel.id);
        if (!c) return null;
        const [[, full], [, half]] = VARIANTS.curved;
        return {
          icon: svgIcon(ICONS.curved), title: P.titles.curved,
          body: `${options(P.electrons, [opt('electrons-2', full, P.electronsTwo, c.electrons === 2, fr.variants.curved[2]), opt('electrons-1', half, P.electronsOne, c.electrons === 1, fr.variants.curved[1])])}
            <dl class="kv"><dt>${P.source}</dt><dd>${esc(describeAnchor(c.from))}</dd><dt>${P.target}</dt><dd>${esc(describeAnchor(c.to))}</dd></dl>
            <div class="col">${btn('bend-reset', P.resetBend)}</div><p class="muted small">${P.bendHint}</p>`,
        };
      }
      case 'rxn': {
        const r = d.reactionArrows.find((x) => x.id === sel.id);
        if (!r) return null;
        return {
          icon: svgIcon(RXN_ICONS[r.kind]), title: P.titles.rxn,
          body: `${options(P.kind, Object.entries(RXN_ICONS).map(([k, icon]) => opt(`rxkind-${k}`, icon, fr.kinds[/** @type {keyof typeof fr.kinds} */ (k)], r.kind === k)))}
            <label for="rx-above">${P.above}</label><textarea id="rx-above" rows="2">${esc(r.above)}</textarea>
            <label for="rx-below">${P.below}</label><textarea id="rx-below" rows="2">${esc(r.below)}</textarea>
            <p class="muted small">${P.formatHint}</p>
            <p class="label">${P.insert}</p><div class="row">${['Δ', 'hν', '°C', '⁻', '→'].map((s) => `<button type="button" data-insert="${s}">${s}</button>`).join('')}</div>`,
        };
      }
      case 'mark': {
        const m = d.marks.find((x) => x.id === sel.id);
        if (!m) return null;
        const rotate = `<p class="muted">${P.rotateHint}</p>`;
        if (m.kind === 'partial') {
          const value = m.value ?? 'δ+';
          return {
            icon: svgIcon(TEXT_ICON(value)), title: P.markNames.partial,
            body: options(P.sign, VARIANTS.partial.map(([v, icon]) => opt(`partial-${v}`, icon, fr.variants.partial[/** @type {'δ+'} */ (v)], v === value))) + rotate,
          };
        }
        return { icon: svgIcon(VARIANTS.lonePair[m.kind === 'radical' ? 1 : 0][1]), title: P.markNames[m.kind], body: rotate };
      }
      case 'charge': {
        const a = M.findAtom(d, sel.id);
        if (!a) return null;
        return {
          icon: svgIcon(ICONS.charge), title: P.titles.charge,
          body: `<div class="setting"><span>${P.charge}</span>${stepper('charge-1', P.chargeMinus, fr.chargeText(a.charge), 'charge+1', P.chargePlus)}</div><p class="muted">${P.rotateHint}</p>`,
        };
      }
      case 'piece': {
        const g = d.apparatus.find((x) => x.id === sel.id);
        if (!g) return null;
        const angle = ((Math.round(g.angle) % 360) + 360) % 360;
        return {
          icon: PIECE_ICON(g.kind), title: pieceName(g.kind),
          body: `<div class="setting"><span>${P.rotate}</span>${stepper('turn-15', P.turnLeft, `${angle}°`, 'turn+15', P.turnRight, ['↺', '↻'])}</div>
            ${A.loose(g.kind) ? `<p class="muted">${P.looseHint}</p>` : `<div class="col">${btn('detach', P.detach)}</div><p class="muted">${P.pieceHint}</p>`}`,
        };
      }
      case 'text': {
        const t = d.texts.find((x) => x.id === sel.id);
        if (!t) return null;
        return {
          icon: svgIcon(ICONS.text), title: P.titles.text,
          body: `<label for="tx-text">${P.textLabel}</label><input id="tx-text" type="text" autocomplete="off" value="${esc(t.text)}">
            <div class="setting"><span>${P.textSize}</span>${stepper('size-2', P.smaller, String(Math.round(t.size ?? STYLE.text)), 'size+2', P.bigger)}</div>
            <p class="muted small">${P.textHint}</p>`,
        };
      }
      default: return null;
    }
  }

  /** A 22-pixel icon for the panel's header. @param {string} inner */
  function svgIcon(inner) {
    return `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">${inner}</svg>`;
  }
  /** A labelled list of choices, one of them pressed. @param {string} label @param {string[]} items */
  function options(label, items) {
    return `<div><p class="label">${label}</p><div class="options">${items.join('')}</div></div>`;
  }
  /** One choice of such a list: icon, name, and a hint on the right. @param {string} action @param {string} icon @param {string} name @param {boolean} on @param {string} [hint] */
  function opt(action, icon, name, on, hint = '') {
    return `<button type="button" class="opt" data-action="${action}" aria-pressed="${on}">${svgIcon(icon)}${name}${hint ? `<small>${hint}</small>` : ''}</button>`;
  }
  /**
   * − value + buttons for a number.
   * @param {string} less @param {string} lessLabel @param {string} value @param {string} more @param {string} moreLabel @param {string[]} [signs]
   */
  function stepper(less, lessLabel, value, more, moreLabel, signs = ['−', '+']) {
    return `<span class="stepper"><button type="button" data-action="${less}" aria-label="${lessLabel}">${signs[0]}</button><output>${value}</output><button type="button" data-action="${more}" aria-label="${moreLabel}">${signs[1]}</button></span>`;
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
      if (act.startsWith('rxkind-')) {
        const r = d.reactionArrows.find((x) => x.id === sel.id);
        if (r) r.kind = /** @type {M.ReactionArrow['kind']} */ (act.slice(7));
        return;
      }
      if (act.startsWith('partial-')) { const m = d.marks.find((x) => x.id === sel.id); if (m) m.value = act.slice(8); return; }
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
    if (id === 'rx-above') r.above = value;
    if (id === 'rx-below') r.below = value;
  }

  // The exercise panel: its buttons, Enter in the answer, the level.
  panel.addEventListener('click', (e) => {
    const b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-ex]'));
    if (b && S.ex && !(/** @type {HTMLButtonElement} */ (b).disabled)) exerciseAction(b.dataset.ex ?? '');
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && /** @type {HTMLElement} */ (e.target).id === 'ex-answer') { e.preventDefault(); exerciseAction('check'); }
  });
  panel.addEventListener('change', (e) => {
    const el = /** @type {HTMLSelectElement} */ (e.target);
    if (el.id === 'ex-level') startSeries(el.value, newSeed());
  });

  panel.addEventListener('input', (e) => {
    const el = /** @type {HTMLInputElement | HTMLTextAreaElement} */ (e.target);
    if (S.mode === 'exercise') { if (S.ex && el.id === 'ex-answer') S.ex.answers[S.ex.cur] = el.value; return; }
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
  // A series' link (#exercice-alkanes-4821, #mecanisme-progressive-4821) opens that series, the same for everyone,
  // on load or pasted later.
  const openLink = () => {
    const link = /^#(exercice|mecanisme)-(\w+)-(\d+)$/.exec(location.hash);
    const kind = /** @type {Kind} */ (link?.[1] === 'mecanisme' ? 'mechanism' : 'naming');
    if (!link || !KINDS[kind].levels.includes(link[2])) return;
    const [level, seed] = [link[2], Number(link[3])];
    if (S.mode === 'exercise' && S.kind === kind && S.ex?.level === level && S.ex.seed === seed) return;
    openExercise(kind);
    startSeries(level, seed);
  };
  openLink();
  window.addEventListener('hashchange', openLink);
  renderPanel();
  updateButtons();
}
