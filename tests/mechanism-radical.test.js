import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { TEMPLATES, builder } from '../src/templates.js';
import { checkMechanism, label } from '../src/mechanism/check.js';
import { toGraph } from '../src/naming/graph.js';
import { fr } from '../src/i18n/fr.js';

/**
 * The radical addition of HBr to propène, as figure 7.12 draws it: a mechanism on lines, one equation each, with
 * half arrows (one electron each). Amorçage: RO–OR → 2 RO• (the O–O bond breaks, an electron to each O).
 * Propagation 1: RO• + H–Br → RO–H + Br•. Propagation 2: Br• + the alkene → the more stable radical, Br on the
 * carbon with more H; then that radical takes the H of H–Br, Br• again. The new bonds are drawn as forming
 * (between two atoms), as the half arrows of the textbooks go.
 */
function radical() {
  const b = builder();
  // Amorçage.
  const [r1, o1, o2, r2] = [['R', 0], ['O', 40], ['O', 80], ['R', 120]].map(([el, x]) => b.atom(/** @type {string} */ (el), /** @type {number} */ (x), 0, 0, el === 'O' ? 2 : 0));
  b.bond(r1, o1); const oo = b.bond(o1, o2); b.bond(o2, r2);
  b.step(160, 230);
  b.bond(b.atom('R', 270, 0), b.atom('O', 310, 0, 0, 2, 1));
  b.plus(350);
  b.bond(b.atom('O', 390, 0, 0, 2, 1), b.atom('R', 430, 0));
  // Propagation 1.
  const ro = b.atom('O', 40, 160, 0, 2, 1);
  b.bond(b.atom('R', 0, 160), ro);
  b.plus(80, 160);
  const h1 = b.atom('H', 120, 160), br1 = b.atom('Br', 160, 160, 0, 3);
  const hbr1 = b.bond(h1, br1);
  b.step(200, 270, '', '', 160);
  const o6 = b.atom('O', 350, 160, 0, 2);
  b.bond(b.atom('R', 310, 160), o6); b.bond(o6, b.atom('H', 390, 160));
  b.plus(430, 160);
  b.atom('Br', 470, 160, 0, 3, 1);
  // Propagation 2: Br• on the CH₂, the radical on the CH.
  const br3 = b.atom('Br', 0, 320, 0, 3, 1);
  b.plus(40, 320);
  const c1 = b.atom('C', 80, 330), c2 = b.atom('C', 114.64, 310), c3 = b.atom('C', 149.28, 330);
  const pi = b.bond(c1, c2, 2); b.bond(c2, c3);
  b.step(190, 260, '', '', 320);
  const k = [b.atom('Br', 290, 310, 0, 3), b.atom('C', 324.64, 330), b.atom('C', 359.28, 310, 0, 0, 1), b.atom('C', 393.92, 330)];
  k.slice(1).forEach((a, i) => b.bond(k[i], a));
  // The radical takes the H of H–Br.
  const m = [b.atom('Br', 0, 470, 0, 3), b.atom('C', 34.64, 490), b.atom('C', 69.28, 470, 0, 0, 1), b.atom('C', 103.92, 490)];
  m.slice(1).forEach((a, i) => b.bond(m[i], a));
  b.plus(140, 480);
  const h3 = b.atom('H', 180, 480), br6 = b.atom('Br', 220, 480, 0, 3);
  const hbr3 = b.bond(h3, br6);
  b.step(260, 330, '', '', 480);
  const n = [b.atom('Br', 370, 470, 0, 3), b.atom('C', 404.64, 490), b.atom('C', 439.28, 470), b.atom('C', 473.92, 490)];
  n.slice(1).forEach((a, i) => b.bond(n[i], a));
  b.plus(510, 480);
  b.atom('Br', 550, 480, 0, 3, 1);
  // Eleven half arrows.
  b.arrow({ bond: oo }, { atom: o1.id }, 1, 1);
  b.arrow({ bond: oo }, { atom: o2.id }, -1, 1);
  b.arrow({ mark: ro.rad[0] }, { between: [ro.id, h1.id] }, 1, 1);
  b.arrow({ bond: hbr1 }, { between: [ro.id, h1.id] }, -1, 1);
  b.arrow({ bond: hbr1 }, { atom: br1.id }, 1, 1);
  b.arrow({ mark: br3.rad[0] }, { between: [br3.id, c1.id] }, 1, 1);
  b.arrow({ bond: pi }, { between: [br3.id, c1.id] }, -1, 1);
  b.arrow({ bond: pi }, { atom: c2.id }, 1, 1);
  b.arrow({ mark: m[2].rad[0] }, { between: [m[2].id, h3.id] }, 1, 1);
  b.arrow({ bond: hbr3 }, { between: [m[2].id, h3.id] }, -1, 1);
  b.arrow({ bond: hbr3 }, { atom: br6.id }, 1, 1);
  const doc = b.done();
  const roles = ['homolysis', 'homolysis', 'radical', 'half', 'homolysis', 'radical', 'half', 'homolysis', 'radical', 'half', 'homolysis'];
  return { doc, roles: Object.fromEntries(doc.curvedArrows.map((c, i) => [c.id, roles[i]])), ids: { c1: c1.id, c2: c2.id, br3: br3.id, k, br1: br1.id } };
}
const answer = radical();
const found = (/** @type {(d: M.Doc) => void} */ f) => { const d = structuredClone(answer.doc); f(d); return checkMechanism(d, answer); };
const at = (/** @type {import('../src/mechanism/check.js').Finding} */ x) => `${x.code}${x.role ? `:${x.role}` : ''}@${x.step}`;
const F = /** @type {Record<string, any>} */ (fr.mechanism.findings);
const arrow = (/** @type {M.Doc} */ d, /** @type {number} */ k) => d.curvedArrows[k];

test('a mechanism on four lines: each line is an equation, its states and its step', () => {
  const { arrows, states, steps, line } = M.regions(answer.doc);
  assert.equal(arrows.length, 4);
  assert.deepEqual(steps, [{ from: 0, to: 1 }, { from: 2, to: 3 }, { from: 4, to: 5 }, { from: 6, to: 7 }]);
  assert.deepEqual(line, [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.equal(states[4].length, 4); // Br• and the three carbons of propène
  // On one line, nothing changes: n arrows, n + 1 states, each arrow from one to the next.
  const one = M.regions(TEMPLATES.electrophilicAddition());
  assert.deepEqual([one.states.length, one.steps], [3, [{ from: 0, to: 1 }, { from: 1, to: 2 }]]);
});

test('figure 7.12 is right as drawn; its species have their names', () => {
  assert.deepEqual(found(() => {}), []);
  const name = (/** @type {string} */ id) => label(toGraph(answer.doc, M.component(answer.doc, id)));
  assert.equal(name(answer.ids.br3), 'Br•');
  assert.equal(name(answer.doc.atoms[0].id), 'ROOR');
  assert.equal(name(answer.doc.atoms.find((a) => a.element === 'O' && a.y === 160 && a.x === 40)?.id ?? ''), 'RO•');
  assert.equal(name(answer.doc.atoms.find((a) => a.element === 'O' && a.x === 350)?.id ?? ''), 'ROH');
  assert.equal(name(answer.ids.k[2].id), 'un radical');
});

test('a half arrow where one electron moves, a full one where two do: both are told', () => {
  const [full] = found((d) => { arrow(d, 0).electrons = 2; });
  assert.equal(at(full), 'halfArrow:homolysis@1');
  assert.match(F.halfArrow(full.params), /Un seul électron/);
  assert.match(F.halfArrow({ electrons: 2 }), /^Deux électrons/);
});

test('each half arrow missing is said by what it does', () => {
  const [homolysis] = found((d) => M.removeCurvedArrow(d, arrow(d, 1).id));
  assert.equal(at(homolysis), 'missingArrow:homolysis@1');
  assert.match(F.missingArrow.homolysis(homolysis.params), /^Il manque la demi-flèche de la liaison O–O vers l’oxygène/);
  const [single] = found((d) => M.removeCurvedArrow(d, arrow(d, 2).id));
  assert.equal(at(single), 'missingArrow:radical@2');
  assert.match(F.missingArrow.radical(single.params), /électron célibataire de RO•/);
  const [half] = found((d) => M.removeCurvedArrow(d, arrow(d, 3).id));
  assert.equal(at(half), 'missingArrow:half@2');
  assert.match(F.missingArrow.half(half.params), /liaison H–Br vers la liaison en formation/);
  const [pi] = found((d) => M.removeCurvedArrow(d, arrow(d, 7).id));
  assert.match(F.missingArrow.homolysis(pi.params), /liaison C=C vers le carbone/);
});

test('Br• goes to the carbon with more H, so that the more substituted radical forms (anti-Markovnikov)', () => {
  const [wrong] = found((d) => { arrow(d, 5).to = { between: [answer.ids.br3, answer.ids.c2] }; arrow(d, 6).to = { between: [answer.ids.br3, answer.ids.c2] }; arrow(d, 7).to = { atom: answer.ids.c1 }; });
  assert.equal(at(wrong), 'wrongTarget:radical@3');
  assert.match(F.wrongTarget.radical(wrong.params), /radical le plus substitué/);
});

test('the dot of a radical forgotten, or on the wrong carbon, is told; a state is named by its line', () => {
  const [dot] = found((d) => { d.marks = d.marks.filter((m) => !(m.kind === 'radical' && m.atom === answer.ids.k[2].id)); });
  assert.equal(at(dot), 'radical@5');
  assert.match(F.radical(dot.params), /électron célibataire/);
  const [moved] = found((d) => { const mk = /** @type {M.Mark} */ (d.marks.find((x) => x.kind === 'radical' && x.atom === answer.ids.k[2].id)); mk.atom = answer.ids.k[3].id; });
  assert.equal(at(moved), 'radicalPosition@5');
  assert.match(F.radicalPosition(moved.params), /plus substitué/);
  const { steps } = M.regions(answer.doc);
  assert.equal(fr.mechanism.state(5, steps), 'Après l’étape 3');
  assert.equal(fr.mechanism.state(4, steps), 'Réactifs de l’étape 3');
  // One line keeps its words.
  const one = [{ from: 0, to: 1 }, { from: 1, to: 2 }];
  assert.deepEqual([0, 1, 2].map((k) => fr.mechanism.state(k, one)), ['Réactifs', 'Après l’étape 1', 'Produit']);
  assert.match(F.steps({ n: 4, lines: 4 }), /4 étapes, sur 4 lignes/);
});
