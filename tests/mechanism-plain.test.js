import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { LEVELS, series, stylesOf } from '../src/mechanism/generate.js';
import { checkMechanism } from '../src/mechanism/check.js';
import { answerMechanism, answerReagents, solution } from '../src/mechanism/exercise.js';
import { fr } from '../src/i18n/fr.js';

/**
 * The reactions of the textbook's chapter 7 whose mechanism the course leaves out (SPEC, Exercices de mécanisme):
 * a numéro is their global reaction, with its products to draw (Produit) or its alkene (Substrat).
 * @typedef {import('../src/mechanism/generate.js').Item} Item
 */
const PLAIN = ['hydroboration', 'hydrogenation', 'dihydroxylation', 'epoxidation', 'ozonolysis', 'cleavage'];
const plain = PLAIN.flatMap((r) => [1, 2].flatMap((s) => series(`${r}-progressive`, s).items));
/** The first item of a level that passes a test, over a few seeds. @param {string} level @param {(i: Item) => boolean} f */
const find = (level, f) => /** @type {Item} */ ([1, 2, 3, 4, 5, 6].flatMap((s) => series(level, s, 30).items).find(f));

test('a reaction without a mechanism has three styles: the product, the conditions, the substrate', () => {
  for (const r of PLAIN) {
    assert.deepEqual(stylesOf(r), ['progressive', 'product', 'reagents', 'substrate'], r);
    assert.ok(LEVELS.includes(`${r}-substrate`) && !LEVELS.includes(`${r}-arrows`), r);
    assert.deepEqual(series(`${r}-progressive`, 3).items.map((i) => i.style), [...Array(4).fill('product'), ...Array(3).fill('reagents'), ...Array(3).fill('substrate')], r);
  }
  assert.deepEqual(stylesOf('hx'), ['progressive', 'arrows', 'structures', 'complete', 'product']);
});

test('each item is right drawn as expected; its alkene has 8 carbons at most', () => {
  for (const item of plain) {
    assert.equal(answerMechanism(item, item.answer.doc).verdict, 'right', `${item.reaction} ${item.alkene}`);
    assert.ok(item.substrate.atoms.filter((a) => a.element === 'C').length <= 8, item.alkene);
  }
});

test('items are drawn as the app draws them: bonds of 40, nothing on top of anything', () => {
  for (const { answer: { doc }, alkene, reaction } of plain) {
    const at = (/** @type {string} */ id) => /** @type {M.Atom} */ (M.findAtom(doc, id));
    for (const b of doc.bonds) assert.ok(Math.abs(Math.hypot(at(b.a).x - at(b.b).x, at(b.a).y - at(b.b).y) - 40) < 0.5, `${reaction} ${alkene}`);
    for (const [i, p] of doc.atoms.entries()) for (const q of doc.atoms.slice(i + 1)) assert.ok(Math.hypot(p.x - q.x, p.y - q.y) > 30, `${reaction} ${alkene}`);
  }
});

test('the global reaction is written as the textbook writes it: its conditions over and under the arrow', () => {
  const arrow = (/** @type {string} */ r) => { const [a] = series(`${r}-product`, 1).items[0].answer.doc.reactionArrows; return [a.above, a.below]; };
  assert.deepEqual(arrow('hydroboration'), ['1) BH₃', '2) H₂O₂, OH⁻']); // figure 7.15
  assert.deepEqual(arrow('hydrogenation'), ['H₂', 'Pt']); // figure 7.19
  assert.deepEqual(arrow('dihydroxylation'), ['KMnO₄', 'H₂O, OH⁻']); // exercise 7.23
  assert.deepEqual(arrow('epoxidation'), ['MCPBA', '']); // figure 7.31
  assert.deepEqual(arrow('ozonolysis'), ['1) O₃', '2) Zn, H₃O⁺']); // figure 7.30
  // The oxidative ozonolysis gives what KMnO₄ concentrated gives (figure 7.30): both are written.
  const both = new Set(series('cleavage-product', 1).items.map((i) => i.answer.doc.reactionArrows[0].above));
  assert.deepEqual([...both].sort(), ['1) O₃', 'KMnO₄ conc.']);
});

test('the product style hides the products, the substrate style the alkene', () => {
  for (const item of plain) {
    const { states } = M.regions(item.given);
    if (item.style === 'product') {
      const [first] = checkMechanism(item.given, item.answer);
      assert.ok(states[0].length && !states[1].length && first.code === 'missingSpecies' && first.step === 1, item.alkene);
    } else if (item.style === 'substrate') {
      assert.ok(!states[0].length && states[1].length, item.alkene);
      assert.match(answerMechanism(item, item.given).lines[0], /^Réactifs : Dessinez un alcène/, item.alkene);
    }
  }
});

test('a substrate is right when the reaction turns it into the products, whichever alkene it is', () => {
  // Hydrogenation: the C=C moved along the skeleton gives the same alkane.
  const item = find('hydrogenation-substrate', (i) => /^(pent|hex)-1-ène$/.test(i.alkene));
  const mine = structuredClone(item.answer.doc);
  const pi = /** @type {M.Bond} */ (mine.bonds.find((b) => b.order === 2));
  const next = /** @type {M.Bond} */ (mine.bonds.find((b) => b !== pi && [b.a, b.b].includes(pi.b === b.a || pi.b === b.b ? pi.b : pi.a) && M.findAtom(mine, b.a)?.element === 'C' && M.findAtom(mine, b.b)?.element === 'C' && M.regions(mine).states[0].includes(b.a)));
  M.setBondOrder(mine, pi.id, 1);
  M.setBondOrder(mine, next.id, 2);
  assert.equal(answerMechanism(item, mine).verdict, 'right', item.alkene);
  // An ozonolysis substrate that gives something else: what it would give is said.
  const ozo = find('ozonolysis-substrate', (i) => i.alkene === 'propène' || /^(but|pent|hex)-1-ène$/.test(i.alkene));
  const wrong = structuredClone(ozo.answer.doc);
  const end = /** @type {M.Atom} */ (wrong.atoms.find((a) => a.element === 'C' && M.hydrogenCount(wrong, a) === 3 && M.regions(wrong).states[0].includes(a.id)));
  M.removeAtom(wrong, end.id);
  assert.match(answerMechanism(ozo, wrong).lines[0], /^Réactifs : Votre alcène donnerait : .*méthanal.*\.$/, ozo.alkene);
  // Two C=C, or none: an alkene is asked for.
  const two = structuredClone(ozo.answer.doc);
  two.bonds.filter((b) => b.order === 1 && M.regions(two).states[0].includes(b.a)).slice(0, 1).forEach((b) => M.setBondOrder(two, b.id, 2));
  assert.match(answerMechanism(ozo, two).lines[0], /^Réactifs : Dessinez un alcène/);
});

test('a substrate whose two carbons would give two products is told so', () => {
  // Hydroboration of pent-2-ène puts the OH on C2 or on C3: the textbook would not decide.
  const item = find('hydroboration-substrate', () => true);
  const d = M.emptyDoc();
  const ids = [0, 1, 2, 3, 4].map((k) => M.addAtom(d, { element: 'C', x: -400 + 35 * k, y: 20 * (k % 2) }).id);
  ids.slice(1).forEach((id, k) => M.addBond(d, ids[k], id, k === 1 ? 2 : 1));
  const drawn = structuredClone(item.given);
  M.paste(drawn, d, 0, 0);
  assert.match(answerMechanism(item, drawn).lines[0], /^Réactifs : Cet alcène donnerait deux produits/);
});

test('a product that another reaction gives is told apart: hydroboration against hydration', () => {
  // 2-Méthylpropène (figure 7.15): the OH on the tertiary carbon, where hydroboration puts it on the CH₂.
  const item = find('hydroboration-product', (i) => i.alkene === '2-méthylpropène');
  assert.ok(item, 'a 2-méthylpropène in the series');
  const d = structuredClone(item.answer.doc);
  const o = /** @type {M.Atom} */ (d.atoms.find((a) => a.element === 'O'));
  const [ch2] = M.neighbors(d, o.id);
  const tertiary = /** @type {string} */ (M.neighbors(d, ch2).find((n) => n !== o.id));
  M.removeBond(d, /** @type {M.Bond} */ (M.bondBetween(d, o.id, ch2)).id);
  M.addBond(d, o.id, tertiary);
  assert.equal(answerMechanism(item, d).lines[0], 'Produit : Votre produit : 2-méthylpropan-2-ol. C’est le produit de l’hydratation acide, pas celui de l’hydroboration-oxydation.');
});

test('an isomer is told by the rule of its reaction: anti-Markovnikov for hydroboration', () => {
  const said = (/** @type {string} */ reaction) => fr.mechanism.findings.isomer({ name: 'propan-2-ol', group: 'O', reaction });
  assert.equal(said('hydration'), 'Votre produit : propan-2-ol. Le groupe OH se lie au carbone le plus substitué, celui du carbocation (Markovnikov).');
  assert.equal(said('hydroboration'), 'Votre produit : propan-2-ol. Le groupe OH se lie au carbone de la double liaison qui porte le plus de H (anti-Markovnikov).');
  assert.match(said('dihydroxylation'), /deux carbones de la double liaison/);
});

test('products the namer leaves out are said by what they are; a product forgotten is said among the products', () => {
  const cut = find('cleavage-product', (i) => i.answer.doc.atoms.some((a) => a.element === 'O' && !M.neighbors(i.answer.doc, a.id).length));
  assert.ok(cut, 'a cleavage giving CO₂ and H₂O');
  assert.match(cut.product, /CO₂/);
  const d = structuredClone(cut.answer.doc);
  M.removeAtom(d, /** @type {M.Atom} */ (d.atoms.find((a) => a.element === 'O' && !M.neighbors(d, a.id).length)).id);
  assert.equal(answerMechanism(cut, d).lines[0], 'Produit : Il manque H₂O parmi les produits.');
  assert.equal(series('epoxidation-product', 1).items[0].product, 'un oxirane');
  assert.match(find('cleavage-product', (i) => i.product.includes('acide')).product, /un acide carboxylique/);
});

test('the solution says what the reaction does, and for a substrate how to go back', () => {
  for (const item of plain) {
    const { steps: said } = solution(item);
    assert.equal(said.length, item.style === 'substrate' ? 2 : 1, item.alkene);
    if (item.style === 'substrate') assert.ok(said[1].includes(item.alkene), item.alkene);
    else if (item.product) assert.ok(said[0].includes(item.product), item.alkene);
  }
  assert.match(solution(series('ozonolysis-substrate', 1).items[0]).steps[1], /double liaison/);
});

test('the Réactifs style asks for the conditions among four: the reaction’s, and three that give something else', () => {
  for (const item of PLAIN.flatMap((r) => [1, 2].flatMap((s) => series(`${r}-reagents`, s).items))) {
    const ids = item.choices?.map((c) => c.reaction) ?? [];
    assert.equal(new Set(ids).size, 4, item.alkene);
    assert.ok(ids.includes(item.reaction), item.alkene);
    assert.equal(answerReagents(item, item.reaction).verdict, 'right', item.alkene);
    for (const r of ids.filter((x) => x !== item.reaction)) assert.equal(answerReagents(item, r).verdict, 'wrong', `${item.alkene} ${r}`);
    // The whole reaction is given, a « ? » over its arrow.
    const { states } = M.regions(item.given);
    assert.ok(states[0].length && states[1].length, item.alkene);
    assert.deepEqual([item.given.reactionArrows[0].above, item.given.reactionArrows[0].below], ['?', ''], item.alkene);
  }
  // The right answer is not always in the same place.
  assert.ok(new Set(series('ozonolysis-reagents', 1).items.map((i) => i.choices?.findIndex((c) => c.reaction === 'ozonolysis'))).size > 1);
  // A wrong choice says what it would give: KMnO₄ concentrated where the dilute was used.
  const item = find('dihydroxylation-reagents', (i) => !!i.choices?.some((c) => c.reaction === 'cleavage'));
  assert.match(answerReagents(item, 'cleavage').lines[0], /^Avec ces conditions, on obtiendrait : .+\.$/);
  // Each choice is written as the textbook writes the conditions.
  assert.ok(series('hydroboration-reagents', 1).items[0].choices?.some((c) => c.text === '1) BH₃ 2) H₂O₂, OH⁻'));
});
