import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { TEMPLATES, builder } from '../src/templates.js';
import { checkMechanism } from '../src/mechanism/check.js';
import { fr } from '../src/i18n/fr.js';

/**
 * The expected mechanism: propène + HBr from the Modèles menu, three states between two reaction arrows.
 * Its π arrow is aimed at the C–H bond it forms on the CH₂ (Markovnikov), so that the other carbon can be told apart.
 * Atoms: a1 CH₂, a2 CH, a3 CH₃, a4 H, a5 Br; a6 to a8 the carbocation (a7 C⁺), a9 Br⁻; a10 to a13 the product.
 */
function propene() {
  const doc = TEMPLATES.electrophilicAddition();
  const [pi, leaving, attack] = doc.curvedArrows;
  pi.to = { between: ['a1', 'a4'] };
  return { doc, roles: { [pi.id]: 'pi', [leaving.id]: 'leaving', [attack.id]: 'attack' } };
}
const answer = propene();
/** A student's drawing: the right mechanism, changed by f. @param {(d: M.Doc) => void} [f] */
const drawn = (f) => { const d = structuredClone(answer.doc); f?.(d); return d; };
/** What the check finds: code, role, step. @param {M.Doc} d */
const found = (d) => checkMechanism(d, answer).map((x) => `${x.code}${x.role ? `:${x.role}` : ''}@${x.step}`);
const arrow = (/** @type {M.Doc} */ d, /** @type {number} */ k) => d.curvedArrows[k];

test('the right mechanism has nothing to say, wherever it is drawn', () => {
  assert.deepEqual(found(drawn()), []);
  assert.deepEqual(found(drawn((d) => M.moveObjects(d, new Set([...d.atoms, ...d.reactionArrows, ...d.texts].map((o) => o.id)), 40, 80))), []);
});

test('an arrow from π to the H stands for the C–H bond it forms, as drawn in the Modèles menu', () => {
  assert.deepEqual(found(TEMPLATES.electrophilicAddition()), []);
});

test('a missing arrow is named by what it does', () => {
  assert.deepEqual(found(drawn((d) => M.removeCurvedArrow(d, arrow(d, 2).id))), ['missingArrow:attack@2']);
  assert.deepEqual(found(drawn((d) => M.removeCurvedArrow(d, arrow(d, 1).id))), ['missingArrow:leaving@1']);
});

test('an arrow from the right electrons to the wrong place, or the other way round', () => {
  assert.deepEqual(found(drawn((d) => { arrow(d, 0).to = { atom: 'a5' }; })), ['wrongTarget:pi@1']); // π to Br
  assert.deepEqual(found(drawn((d) => { arrow(d, 1).to = { atom: 'a4' }; })), ['wrongTarget:leaving@1']); // H–Br to H
  assert.deepEqual(found(drawn((d) => { arrow(d, 1).from = { mark: 'm1' }; arrow(d, 1).to = { atom: 'a4' }; })), ['reversed:leaving@1']); // Br to H
  assert.deepEqual(found(drawn((d) => { arrow(d, 2).to = { atom: 'a6' }; })), ['wrongTarget:attack@2']); // Br⁻ to the CH₃
});

test('the H bonded to the wrong carbon of the C=C, a half arrow, an arrow too many', () => {
  assert.deepEqual(found(drawn((d) => { arrow(d, 0).to = { between: ['a2', 'a4'] }; })), ['markovnikovArrow:pi@1']);
  assert.deepEqual(found(drawn((d) => { arrow(d, 0).electrons = 1; })), ['halfArrow:pi@1']);
  assert.deepEqual(found(drawn((d) => { M.addCurvedArrow(d, { mark: 'm4' }, { atom: 'a7' }); })), ['extraArrow@2']);
});

test('a wrong species: the + on the other carbon, a charge left out, the anti-Markovnikov product, Br⁻ forgotten', () => {
  const first = (/** @type {M.Doc} */ d) => found(d)[0];
  assert.equal(first(drawn((d) => { /** @type {M.Atom} */ (M.findAtom(d, 'a7')).charge = 0; /** @type {M.Atom} */ (M.findAtom(d, 'a6')).charge = 1; })), 'cationPosition@1');
  assert.equal(first(drawn((d) => { /** @type {M.Atom} */ (M.findAtom(d, 'a7')).charge = 0; })), 'charge@1');
  assert.equal(first(drawn((d) => { M.removeBond(d, /** @type {M.Bond} */ (M.bondBetween(d, 'a10', 'a13')).id); M.addBond(d, 'a11', 'a13'); })), 'antiMarkovnikov@2');
  assert.equal(first(drawn((d) => M.removeAtom(d, 'a9'))), 'missingSpecies@1');
});

test('a step too many or too few', () => {
  assert.deepEqual(found(drawn((d) => M.addReactionArrow(d, { x1: 680, y1: 0, x2: 750, y2: 0, kind: 'forward', above: '', below: '' }))), ['steps@0']);
});

test('a symmetric alkene: the H on either carbon of but-2-ène is the same answer', () => {
  // but-2-ène + HBr: the π arrow aimed at the C–H bond on C3; the student aims it at C2, the same by symmetry.
  const b = builder();
  const [c1, c2, c3, c4] = [[0, 20], [34.64, 0], [69.28, 20], [103.92, 0]].map(([x, y]) => b.atom('C', x, y));
  b.bond(c1, c2);
  const pi = b.bond(c2, c3, 2);
  b.bond(c3, c4);
  const h = b.atom('H', 150, -20);
  const br = b.atom('Br', 190, -20, 0, 3);
  const hBr = b.bond(h, br);
  b.step(230, 300);
  const k = [[330, 20], [364.64, 0], [399.28, 20], [433.92, 0]].map(([x, y], i) => b.atom('C', x, y, i === 1 ? 1 : 0));
  for (let i = 0; i < 3; i++) b.bond(k[i], k[i + 1]);
  const bromide = b.atom('Br', 480, 0, -1, 4);
  b.step(520, 590);
  const p = [[620, 20], [654.64, 0], [689.28, 20], [723.92, 0]].map(([x, y]) => b.atom('C', x, y));
  for (let i = 0; i < 3; i++) b.bond(p[i], p[i + 1]);
  b.bond(p[1], b.atom('Br', 654.64, -40, 0, 3));
  b.arrow({ bond: pi }, { between: [c3.id, h.id] });
  b.arrow({ bond: hBr }, { atom: br.id });
  b.arrow({ mark: bromide.lp[3] }, { atom: k[1].id });
  const doc = b.done();
  const symmetric = { doc, roles: Object.fromEntries(doc.curvedArrows.map((c, i) => [c.id, ['pi', 'leaving', 'attack'][i]])) };
  const student = structuredClone(doc);
  student.curvedArrows[0].to = { between: [c2.id, h.id] };
  assert.deepEqual(checkMechanism(student, symmetric), []);
});

test('every finding has its message, and each arrow its own by role', () => {
  const F = /** @type {Record<string, any>} */ (fr.mechanism.findings);
  for (const code of ['steps', 'missingSpecies', 'extraSpecies', 'cationPosition', 'charge', 'antiMarkovnikov', 'otherSpecies', 'reversed', 'markovnikovArrow', 'halfArrow', 'extraArrow']) {
    assert.equal(typeof F[code], 'function', code);
  }
  for (const code of ['missingArrow', 'wrongTarget']) for (const role of ['pi', 'leaving', 'attack']) assert.equal(typeof F[code][role], 'function', `${code}.${role}`);
});
