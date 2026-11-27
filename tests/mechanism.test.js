import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { TEMPLATES, builder } from '../src/templates.js';
import { checkMechanism } from '../src/mechanism/check.js';
import { fr } from '../src/i18n/fr.js';

/**
 * The expected mechanism: propène + HBr from the Modèles menu, three states between two reaction arrows.
 * Its π arrow is drawn to the H, and forms the C–H bond on the CH₂ (Markovnikov): that tells the other carbon apart.
 * Atoms: a1 CH₂, a2 CH, a3 CH₃, a4 H, a5 Br; a6 to a8 the carbocation (a7 C⁺), a9 Br⁻; a10 to a13 the product.
 */
function propene() {
  const doc = TEMPLATES.electrophilicAddition();
  const [pi, leaving, attack] = doc.curvedArrows;
  return { doc, roles: { [pi.id]: 'pi', [leaving.id]: 'leaving', [attack.id]: 'attack' }, forms: { [pi.id]: /** @type {[string, string]} */ (['a1', 'a4']) } };
}
const answer = propene();
/** A student's drawing: the right mechanism, changed by f. @param {(d: M.Doc) => void} [f] */
const drawn = (f) => { const d = structuredClone(answer.doc); f?.(d); return d; };
/** What the check finds: code, role, step. @param {M.Doc} d */
const found = (d) => checkMechanism(d, answer).map((x) => `${x.code}${x.role ? `:${x.role}` : ''}@${x.step}`);
/** The findings themselves, with their params. @param {M.Doc} d */
const found2 = (d) => checkMechanism(d, answer);
const arrow = (/** @type {M.Doc} */ d, /** @type {number} */ k) => d.curvedArrows[k];

test('the right mechanism has nothing to say, wherever it is drawn', () => {
  assert.deepEqual(found(drawn()), []);
  assert.deepEqual(found(drawn((d) => M.moveObjects(d, new Set([...d.atoms, ...d.reactionArrows, ...d.texts].map((o) => o.id)), 40, 80))), []);
});

test('an arrow from π to the H stands for the C–H bond it forms, and the other way round', () => {
  assert.deepEqual(found(drawn((d) => { arrow(d, 0).to = { between: ['a1', 'a4'] }; })), []);
  assert.deepEqual(found(drawn((d) => { arrow(d, 2).to = { between: ['a9', 'a7'] }; })), []);
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

/**
 * Propène + H₃O⁺ in water, as the textbook draws ethene's (figure 7.14): π to an H of H₃O⁺ and H–O to O;
 * H₂O to C⁺ (oxonium); the solvent's H₂O, a base, takes an H of the oxonium, O–H to O⁺ (⇌); 2-propanol and H₃O⁺.
 */
function hydration() {
  const b = builder();
  const hydronium = (/** @type {number} */ x) => {
    const o = b.atom('O', x, 0, 1, 1);
    const hs = [[x - 40, 0], [x + 40, 0], [x, 40]].map(([hx, hy]) => b.atom('H', hx, hy));
    return { o, hs, bonds: hs.map((h) => b.bond(h, o)) };
  };
  const propene = (/** @type {number} */ x, /** @type {number} */ charge = 0) => [[x, 20], [x + 34.64, 0], [x + 69.28, 20]].map(([cx, cy], i) => b.atom('C', cx, cy, i === 1 ? charge : 0));
  const [c1, c2, c3] = propene(0);
  const pi = b.bond(c1, c2, 2);
  b.bond(c2, c3);
  const acid = hydronium(150);
  b.step(230, 300);
  const k = propene(330, 1);
  b.bond(k[0], k[1]); b.bond(k[1], k[2]);
  const water = b.atom('O', 440, 0, 0, 2);
  b.step(480, 550);
  const x = propene(580);
  b.bond(x[0], x[1]); b.bond(x[1], x[2]);
  const ox = b.atom('O', 614.64, -40, 1, 1);
  b.bond(x[1], ox);
  const oh = [b.atom('H', 580, -60), b.atom('H', 649.28, -60)];
  const ohBonds = oh.map((h) => b.bond(h, ox));
  const base = b.atom('O', 700, 0, 0, 2);
  b.step(740, 810);
  const p = propene(840);
  b.bond(p[0], p[1]); b.bond(p[1], p[2]);
  b.bond(p[1], b.atom('O', 874.64, -40, 0, 2));
  hydronium(970);
  b.arrow({ bond: pi }, { atom: acid.hs[0].id });
  b.arrow({ bond: acid.bonds[0] }, { atom: acid.o.id });
  b.arrow({ mark: water.lp[0] }, { atom: k[1].id });
  b.arrow({ mark: base.lp[0] }, { atom: oh[1].id });
  b.arrow({ bond: ohBonds[1] }, { atom: ox.id });
  const doc = b.done();
  doc.reactionArrows[2].kind = 'equilibrium';
  const [ca1] = doc.curvedArrows;
  return {
    doc, ids: { c1: c1.id, c2: c2.id, acid, ox: ox.id, product: p },
    roles: Object.fromEntries(doc.curvedArrows.map((c, i) => [c.id, ['pi', 'leaving', 'attack', 'base', 'leaving'][i]])),
    forms: { [ca1.id]: /** @type {[string, string]} */ ([c1.id, acid.hs[0].id]) },
  };
}

test('acid hydration (figure 7.14): three steps, any H of H₃O⁺, the solvent as the base', () => {
  const water = hydration();
  const check = (/** @type {(d: M.Doc) => void} */ f) => { const d = structuredClone(water.doc); f(d); return checkMechanism(d, water); };
  assert.deepEqual(check(() => {}), []);
  // The π bond to another H of H₃O⁺, and that H–O bond to O: the three H are the same.
  assert.deepEqual(check((d) => { d.curvedArrows[0].to = { atom: water.ids.acid.hs[2].id }; d.curvedArrows[1].from = { bond: water.ids.acid.bonds[2] }; }), []);
  const [noBase] = check((d) => M.removeCurvedArrow(d, d.curvedArrows[3].id));
  assert.equal(`${noBase.code}:${noBase.role}@${noBase.step}`, 'missingArrow:base@3');
  assert.match(fr.mechanism.findings.missingArrow.base(/** @type {any} */ (noBase.params)), /H₂O/);
  const [noPlus] = check((d) => { /** @type {M.Atom} */ (M.findAtom(d, water.ids.ox)).charge = 0; });
  assert.equal(`${noPlus.code}@${noPlus.step}`, 'charge@2');
  assert.match(fr.mechanism.findings.charge(/** @type {any} */ (noPlus.params)), /oxonium/);
  // 1-propanol: the OH on the carbon with more H.
  const [anti] = check((d) => { const [p1, p2] = water.ids.product; const o = /** @type {M.Bond} */ (d.bonds.find((x) => x.a === p2.id && M.findAtom(d, x.b)?.element === 'O')); M.removeBond(d, o.id); M.addBond(d, p1.id, o.b); });
  assert.equal(`${anti.code}@${anti.step}`, 'antiMarkovnikov@3');
  assert.match(fr.mechanism.findings.antiMarkovnikov(/** @type {any} */ (anti.params)), /Le groupe OH/);
});

test('messages name the species of the mechanism: HBr and Br⁻, the bromine, the carbocation', () => {
  const F = fr.mechanism.findings;
  const [pi] = found2(drawn((d) => M.removeCurvedArrow(d, arrow(d, 0).id)));
  assert.equal(F.missingArrow.pi(/** @type {any} */ (pi.params)), 'Il manque la flèche du doublet π vers le H de HBr.');
  const [leaving] = found2(drawn((d) => M.removeCurvedArrow(d, arrow(d, 1).id)));
  assert.match(F.missingArrow.leaving(/** @type {any} */ (leaving.params)), /liaison H–Br vers le brome/);
  const [attack] = found2(drawn((d) => M.removeCurvedArrow(d, arrow(d, 2).id)));
  assert.match(F.missingArrow.attack(/** @type {any} */ (attack.params)), /doublet de Br⁻ vers le carbocation/);
});

test('every finding has its message, and each arrow its own by role', () => {
  const F = /** @type {Record<string, any>} */ (fr.mechanism.findings);
  for (const code of ['steps', 'missingSpecies', 'extraSpecies', 'cationPosition', 'charge', 'antiMarkovnikov', 'otherSpecies', 'reversed', 'markovnikovArrow', 'halfArrow', 'extraArrow']) {
    assert.equal(typeof F[code], 'function', code);
  }
  for (const code of ['missingArrow', 'wrongTarget']) for (const role of ['pi', 'leaving', 'attack', 'base']) assert.equal(typeof F[code][role], 'function', `${code}.${role}`);
});
