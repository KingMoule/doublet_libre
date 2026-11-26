import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { LEVELS, series } from '../src/mechanism/generate.js';
import { atomsOf, checkMechanism } from '../src/mechanism/check.js';
import { answerMechanism, solution } from '../src/mechanism/exercise.js';

const SEEDS = [1, 2, 3, 4, 5];
const all = SEEDS.flatMap((s) => series('progressive', s).items);

test('a series is ten different alkenes, the same for the same seed, from arrows to whole mechanisms', () => {
  for (const level of LEVELS) assert.equal(series(level, 42).items.length, 10);
  const names = (/** @type {number} */ s) => series('progressive', s).items.map((i) => i.alkene);
  assert.deepEqual(names(7), names(7));
  assert.equal(new Set(names(7)).size, 10);
  assert.deepEqual(series('progressive', 7).items.map((i) => i.style), ['arrows', 'arrows', 'arrows', 'structures', 'structures', 'structures', 'complete', 'complete', 'product', 'product']);
  assert.ok(series('product', 7).items.every((i) => i.style === 'product'));
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
    const { given, style } = item;
    const first = checkMechanism(given, item.answer, item.steps)[0];
    const at = `${first.code}${first.role ? `:${first.role}` : ''}@${first.step}`;
    if (style === 'arrows') assert.ok(!given.curvedArrows.length && only(given, [0, 1, 2]) && at === 'missingArrow:pi@1');
    if (style === 'structures') assert.ok(given.curvedArrows.length === 2 && only(given, [0]) && at === 'missingSpecies@1');
    if (style === 'complete') assert.ok(!given.curvedArrows.length && only(given, [0]) && at === 'missingArrow:pi@1');
    if (style === 'product') assert.ok(given.reactionArrows.length === 1 && only(given, [0]) && at === 'missingSpecies@1');
  }
});

test('mechanisms are drawn as the app draws them: bonds of 40, nothing on top of anything', () => {
  for (const { answer: { doc }, alkene } of all) {
    const at = (/** @type {string} */ id) => /** @type {M.Atom} */ (M.findAtom(doc, id));
    for (const b of doc.bonds) assert.ok(Math.abs(Math.hypot(at(b.a).x - at(b.b).x, at(b.a).y - at(b.b).y) - 40) < 0.5, alkene);
    for (const [i, p] of doc.atoms.entries()) for (const q of doc.atoms.slice(i + 1)) assert.ok(Math.hypot(p.x - q.x, p.y - q.y) > 30, alkene);
  }
});

test('the answer says where the first mistake is, and the solution how the mechanism goes', () => {
  const item = series('progressive', 1).items[0];
  assert.deepEqual(answerMechanism(item, item.answer.doc), { verdict: 'right', title: 'Bonne réponse', lines: [], ids: [] });
  const wrong = answerMechanism(item, item.given);
  assert.equal(wrong.verdict, 'wrong');
  assert.match(wrong.lines[0], /^Étape 1 : Il manque la flèche du doublet π vers le H de H(Cl|Br|I)\.$/);
  const product = series('product', 1).items[0];
  assert.match(answerMechanism(product, product.given).lines[0], /^Produit : Il manque/);
  const { doc, steps } = solution(item);
  assert.equal(doc.curvedArrows.length, 3);
  assert.ok(steps[0].includes('Markovnikov') && steps[1].includes(item.product));
});
