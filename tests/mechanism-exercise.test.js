import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { LEVELS, series } from '../src/mechanism/generate.js';
import { atomsOf, checkMechanism } from '../src/mechanism/check.js';
import { answerMechanism, solution } from '../src/mechanism/exercise.js';

const SEEDS = [1, 2, 3, 4, 5];
const hx = SEEDS.flatMap((s) => series('hx-progressive', s).items);
const water = SEEDS.flatMap((s) => series('hydration-progressive', s).items);
const all = [...hx, ...water];
const steps = (/** @type {M.Doc} */ d) => d.reactionArrows.length;

test('a level is a reaction and a style; a series is ten different alkenes, the same for the same seed', () => {
  assert.deepEqual(LEVELS.slice(0, 2), ['hx-progressive', 'hx-arrows']);
  assert.ok(LEVELS.includes('hydration-product'));
  for (const level of LEVELS) assert.equal(series(level, 42).items.length, 10);
  const names = (/** @type {number} */ s) => series('hydration-progressive', s).items.map((i) => i.alkene);
  assert.deepEqual(names(7), names(7));
  assert.equal(new Set(names(7)).size, 10);
  assert.deepEqual(series('hx-progressive', 7).items.map((i) => i.style), ['arrows', 'arrows', 'arrows', 'structures', 'structures', 'structures', 'complete', 'complete', 'product', 'product']);
  assert.ok(series('hydration-product', 7).items.every((i) => i.style === 'product' && i.reaction === 'hydration'));
});

test('each expected mechanism passes its own check', () => {
  for (const item of all) assert.deepEqual(checkMechanism(item.answer.doc, item.answer), [], item.alkene);
});

test('the H goes on the carbon of the C=C with more H, and the carbocation never rearranges (Markovnikov)', () => {
  for (const { answer: { doc, forms }, alkene } of all.filter((i) => i.style !== 'product')) {
    // The π arrow is drawn to the H; the bond it forms says on which carbon.
    const pi = doc.curvedArrows[0];
    assert.ok('atom' in pi.to && M.findAtom(doc, pi.to.atom)?.element === 'H', alkene);
    const [p, q] = atomsOf(doc, pi.from);
    const carbon = /** @type {Record<string, [string, string]>} */ (forms)[pi.id][0];
    const other = carbon === p ? q : p;
    const hs = (/** @type {string} */ id) => M.hydrogenCount(doc, /** @type {M.Atom} */ (M.findAtom(doc, id)));
    assert.ok(hs(carbon) >= hs(other), alkene);
    // A secondary C⁺ next to a carbon with three carbons would take its H or CH₃ (a 1,2-shift).
    const cation = /** @type {M.Atom} */ (doc.atoms.find((a) => a.element === 'C' && a.charge === 1));
    const carbons = (/** @type {string} */ id) => M.neighbors(doc, id).filter((n) => M.findAtom(doc, n)?.element === 'C');
    if (carbons(cation.id).length === 2) assert.ok(carbons(cation.id).every((n) => carbons(n).length < 3), alkene);
  }
});

test('each style takes away what it asks for', () => {
  const only = (/** @type {M.Doc} */ d, /** @type {number[]} */ states) => M.regions(d).states.every((s, k) => states.includes(k) === s.length > 0);
  for (const item of all) {
    const { given, style, answer } = item;
    const first = checkMechanism(given, item.answer, item.steps)[0];
    const at = `${first.code}${first.role ? `:${first.role}` : ''}@${first.step}`;
    const every = [...Array(steps(answer.doc) + 1).keys()];
    if (style === 'arrows') assert.ok(!given.curvedArrows.length && only(given, every) && at === 'missingArrow:pi@1', item.alkene);
    if (style === 'structures') assert.ok(given.curvedArrows.length === 2 && only(given, [0]) && at === 'missingSpecies@1', item.alkene);
    if (style === 'complete') assert.ok(!given.curvedArrows.length && only(given, [0]) && at === 'missingArrow:pi@1', item.alkene);
    if (style === 'product') assert.ok(given.reactionArrows.length === 1 && only(given, [0]) && at === 'missingSpecies@1', item.alkene);
  }
});

test('mechanisms are drawn as the app draws them: bonds of 40, nothing on top of anything', () => {
  for (const { answer: { doc }, alkene } of all) {
    const at = (/** @type {string} */ id) => /** @type {M.Atom} */ (M.findAtom(doc, id));
    for (const b of doc.bonds) assert.ok(Math.abs(Math.hypot(at(b.a).x - at(b.b).x, at(b.a).y - at(b.b).y) - 40) < 0.5, alkene);
    for (const [i, p] of doc.atoms.entries()) for (const q of doc.atoms.slice(i + 1)) assert.ok(Math.hypot(p.x - q.x, p.y - q.y) > 30, alkene);
  }
});

test('HX is drawn as the textbook draws it (figure 7.6): δ+ on the H and δ− on X, slow then fast step', () => {
  for (const { answer: { doc }, style, given, alkene } of hx) {
    const partial = (/** @type {string} */ el) => doc.marks.find((m) => m.kind === 'partial' && M.findAtom(doc, m.atom)?.element === el && M.neighbors(doc, m.atom).some((n) => M.findAtom(doc, n)?.element !== 'C'))?.value;
    assert.equal(partial('H'), 'δ+', alkene);
    assert.ok(['Cl', 'Br', 'I'].some((x) => partial(x) === 'δ−'), alkene);
    assert.deepEqual(doc.reactionArrows.map((r) => r.above), style === 'product' ? [''] : ['Étape lente', 'Étape rapide'], alkene);
    assert.equal(given.marks.filter((m) => m.kind === 'partial').length, 2, alkene); // the reactants as given keep them
  }
});

test('acid hydration is drawn as the textbook draws it (figures 7.13 and 7.14)', () => {
  for (const { answer: { doc, roles }, style, alkene, product } of water) {
    if (style === 'product') {
      // The global reaction: the alkene and water, H₂SO₄ over the arrow, the alcohol.
      assert.deepEqual(doc.reactionArrows.map((r) => [r.kind, r.above]), [['forward', 'H₂SO₄']], alkene);
      assert.match(product, /ol$/, alkene);
      continue;
    }
    // Four states; H₃O⁺ with its three H and a lone pair; the oxonium's H drawn; the last step an equilibrium.
    assert.deepEqual(doc.reactionArrows.map((r) => r.kind), ['forward', 'forward', 'equilibrium'], alkene);
    const hydronium = doc.atoms.filter((a) => a.element === 'O' && a.charge === 1 && M.neighbors(doc, a.id).every((n) => M.findAtom(doc, n)?.element === 'H'));
    assert.equal(hydronium.length, 2, alkene); // given in the reactants, regenerated with the alcohol
    for (const o of hydronium) assert.equal(M.neighbors(doc, o.id).length, 3, alkene);
    const oxonium = doc.atoms.find((a) => a.element === 'O' && a.charge === 1 && M.neighbors(doc, a.id).some((n) => M.findAtom(doc, n)?.element === 'C'));
    assert.ok(oxonium && M.neighbors(doc, oxonium.id).filter((n) => M.findAtom(doc, n)?.element === 'H').length === 2, alkene);
    assert.deepEqual(Object.values(roles), ['pi', 'leaving', 'attack', 'base', 'leaving'], alkene);
    assert.match(product, /ol$/, alkene);
  }
});

test('the δ the textbook writes are not asked of the student', () => {
  const item = series('hx-arrows', 3).items[0];
  const without = structuredClone(item.answer.doc);
  without.marks = without.marks.filter((m) => m.kind !== 'partial');
  assert.deepEqual(checkMechanism(without, item.answer), []);
});

test('the answer says where the first mistake is, and the solution how the mechanism goes', () => {
  const item = series('hx-progressive', 1).items[0];
  assert.deepEqual(answerMechanism(item, item.answer.doc), { verdict: 'right', title: 'Bonne réponse', lines: [], ids: [] });
  const wrong = answerMechanism(item, item.given);
  assert.equal(wrong.verdict, 'wrong');
  assert.match(wrong.lines[0], /^Étape 1 : Il manque la flèche du doublet π vers le H de H(Cl|Br|I)\.$/);
  const product = series('hx-product', 1).items[0];
  assert.match(answerMechanism(product, product.given).lines[0], /^Produit : Il manque/);
  const { doc, steps: said } = solution(item);
  assert.equal(doc.curvedArrows.length, 3);
  assert.ok(said[0].includes('Markovnikov') && said[1].includes(item.product));
  // Who gives and who takes the electrons, as the textbook labels them.
  assert.ok(said[0].includes('nucléophile') && said[0].includes('électrophile') && said[1].includes('nucléophile'));
  // Hydration: three steps, H₃O⁺ from H₂SO₄, the oxonium, water as the base, the acid given back.
  const hydration = series('hydration-arrows', 1).items[0];
  assert.match(answerMechanism(hydration, hydration.given).lines[0], /^Étape 1 : Il manque la flèche du doublet π vers le H de H₃O⁺\.$/);
  const three = solution(hydration).steps;
  assert.equal(three.length, 3);
  assert.ok(three[0].includes('H₂SO₄') && three[1].includes('oxonium') && three[2].includes('base') && three[2].includes(hydration.product));
});
