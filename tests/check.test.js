import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fr } from '../src/i18n/fr.js';
import { fromSmiles } from '../src/naming/graph.js';
import { nameOf, wrongNames } from '../src/naming/namer.js';
import { checkName } from '../src/naming/check.js';

// The errors the textbook asks students to explain (« expliquez pourquoi leur nom est incorrect »),
// each found by breaking one rule at a time.
const rule = (/** @type {string} */ smiles, /** @type {string} */ typed) => wrongNames(fromSmiles(smiles)).find((w) => w.name === typed)?.rule;

test('2.5.1: a chain that is not the longest, or not the most branched', () => {
  assert.equal(rule('CCC(C)CCC', '2-éthylpentane'), 'chain');
  assert.equal(rule('CC(C)C(CC)CCC', '3-isopropylhexane'), 'branches');
});

test('2.5.1: numbering from the wrong end, by the sum of locants, or against the alphabet on a tie', () => {
  assert.equal(rule('CC(C)C(C)CC', '3,4-diméthylpentane'), 'numbering');
  assert.equal(rule('CC(C)CCCCC(C)(C)CC', '3,3,8-triméthylnonane'), 'sum');
  assert.equal(rule('CCC(CC)C(C)CC', '4-éthyl-3-méthylhexane'), 'alphabeticalNumbering');
});

test('2.5.1: prefixes out of alphabetical order, or identical ones not grouped', () => {
  assert.equal(rule('CC(C)(C)CC(CC)CC', '2,2-diméthyl-4-éthylhexane'), 'alphabetical');
  assert.equal(rule('CC(C)C(C)CC', '2-méthyl-3-méthylpentane'), 'multiplier');
  assert.equal(rule('CC(C)C(C)CC', '2,3-méthylpentane'), 'multiplier');
});

test('2.5.2 and 2.5.3: ring numbering, ring against chain, a locant that is left out', () => {
  assert.equal(rule('BrC1CCCC(C)C1', '1-bromo-5-méthylcyclohexane'), 'numbering');
  assert.equal(rule('BrC1CCCC(C)C1', '3-bromo-1-méthylcyclohexane'), 'alphabeticalNumbering');
  assert.equal(rule('CCCCC1CCCCC1', '1-cyclohexylbutane'), 'ringChain');
  assert.equal(rule('CC1CCCCC1', '1-méthylcyclohexane'), 'locant');
});

test('the right name is never among the wrong ones, and every rule has its message', () => {
  for (const s of ['CCC(C)CCC', 'CC(C)CCCCC(C)(C)CC', 'BrC1CCCC(C)C1', 'CCCCC1CCCCC1', 'FC(F)(F)C(Cl)Br']) {
    const right = nameOf(fromSmiles(s)).name;
    for (const w of wrongNames(fromSmiles(s))) {
      assert.notEqual(w.name, right);
      assert.ok(/** @type {Record<string, string>} */ (fr.naming.rules)[w.rule], w.rule);
    }
  }
});

const wrong = wrongNames(fromSmiles('CC(C)C(C)CC'));
const check = (/** @type {string} */ typed) => checkName(typed, ['2,3-diméthylpentane'], wrong);

test('a right name counts, whatever its case, spaces or final period', () => {
  assert.deepEqual(check(' 2,3-Diméthylpentane. '), { verdict: 'right', remarks: [] });
  assert.deepEqual(check('2, 3-diméthylpentane'), { verdict: 'right', remarks: [] });
});

test('a right name without its accents or with its punctuation off counts, with a remark (2.5.1)', () => {
  assert.deepEqual(check('2,3-dimethylpentane'), { verdict: 'right', remarks: ['accents'] });
  assert.deepEqual(check('2-3-diméthylpentane'), { verdict: 'right', remarks: ['commas'] });
  assert.deepEqual(check('2,3diméthylpentane'), { verdict: 'right', remarks: ['hyphens'] });
  assert.deepEqual(check('2-3-dimethylpentane'), { verdict: 'right', remarks: ['commas', 'accents'] });
});

test('a wrong name gives the rule it breaks, even mistyped; another number is another name', () => {
  assert.deepEqual(check('2-méthyl-3-méthylpentane'), { verdict: 'wrong', remarks: [], rule: 'multiplier' });
  assert.deepEqual(check('3-4-dimethylpentane'), { verdict: 'wrong', remarks: [], rule: 'numbering' });
  assert.deepEqual(check('23-diméthylpentane'), { verdict: 'wrong', remarks: [] });
  assert.deepEqual(check(''), { verdict: 'empty', remarks: [] });
});
