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

test('2.5.4: the double bond numbered after the branches, both its carbons written, the a left out, a ring numbered across it', () => {
  assert.equal(rule('CC=CC(C)(C)C', '2,2-diméthylpent-3-ène'), 'unsaturationFirst');
  assert.equal(rule('CC=CCC', 'pent-2,3-ène'), 'bothLocants');
  assert.equal(rule('CC=CC=CC', 'hex-2,4-diène'), 'euphony');
  assert.equal(rule('CC1=CCCCC1C', '1,2-diméthylcyclohexène'), 'ringDoubleBond');
});

test('2.5.5: the triple bond before the double one on a tie, -ène kept before a single -yne, both carbons, the a', () => {
  assert.equal(rule('C#CCCC=C', 'hex-5-én-1-yne'), 'eneFirst');
  assert.equal(rule('C=CCCC#CC', 'hept-1-ène-5-yne'), 'enElision');
  assert.equal(rule('CC#CCCCCC', 'oct-2,3-yne'), 'bothLocants');
  assert.equal(rule('CCC#CC#CCC', 'oct-3,5-diyne'), 'euphony');
});

test('the right name is never among the wrong ones, and every rule has its message', () => {
  for (const s of ['CCC(C)CCC', 'CC(C)CCCCC(C)(C)CC', 'BrC1CCCC(C)C1', 'CCCCC1CCCCC1', 'FC(F)(F)C(Cl)Br', 'CC=CC(C)(C)C', 'CC1=CCCCC1C', 'CC=CC=CC', 'C#CCCC=C', 'C=CCCC#CC', 'CCC#CC#CCC']) {
    const right = nameOf(fromSmiles(s)).name;
    for (const w of wrongNames(fromSmiles(s))) {
      assert.notEqual(w.name, right);
      assert.ok(/** @type {Record<string, string>} */ (fr.naming.rules)[w.rule], w.rule);
    }
  }
});

test('2.5.6: o-, m- and p- count; the systematic name of a toluène counts with a remark', () => {
  const accepted = (/** @type {string} */ s) => { const n = nameOf(fromSmiles(s)); return [n.name, ...n.also]; };
  const bromotoluene = accepted('Cc1cccc(Br)c1');
  assert.equal(checkName('m-bromotoluène', bromotoluene).verdict, 'right');
  assert.equal(checkName('méta-bromotoluène', bromotoluene).verdict, 'right');
  assert.deepEqual(checkName('1-bromo-3-méthylbenzène', bromotoluene), { verdict: 'right', remarks: ['retained'] });
  assert.equal(checkName('o-dibromobenzène', accepted('Brc1ccccc1Br')).verdict, 'right');
  assert.equal(checkName('p-chloronitrobenzène', accepted('Clc1ccc(cc1)N(=O)=O')).verdict, 'right');
  assert.equal(rule('Cc1cccc(Br)c1', '5-bromotoluène'), 'numbering');
  assert.equal(rule('Brc1ccccc1', '1-bromobenzène'), 'locant');
});

test('2.5.7: the short side as the parent chain, méthyloxy for méthoxy, pentoxy for pentyloxy', () => {
  assert.equal(rule('COCCCC', 'butoxyméthane'), 'chain');
  assert.equal(rule('COCCCC', '1-méthyloxybutane'), 'alkoxy');
  assert.equal(rule('CCCCCCCOCCCCC', '1-pentoxyheptane'), 'alkoxy');
});

test('2.5.8: the double bond numbered before the OH, -an- dropped, -ène kept before -ol, -an- before -diol, a familiar name', () => {
  assert.equal(rule('CC=CCC(C)O', 'hex-2-én-5-ol'), 'principalFirst');
  assert.equal(rule('CCC(O)CCCC', 'hept-3-ol'), 'olStem');
  assert.equal(rule('CC=CCC(C)O', 'hex-4-ène-2-ol'), 'olElision');
  assert.equal(rule('CC(O)CCC(O)CC', 'heptan-2,5-diol'), 'diolStem');
  assert.equal(rule('CC(C)O', 'alcool isopropylique'), 'familiar');
});

test('2.5.9: -al with its locant 1, -dial without its e, a ring carbon taken for the CHO, a familiar name', () => {
  assert.equal(rule('CCCC=O', 'butan-1-al'), 'alLocant');
  assert.equal(rule('O=CCCCC=O', 'pentandial'), 'dialStem');
  assert.equal(rule('O=CC1CCCCC1', 'cyclohexanal'), 'carbaldehyde');
  assert.equal(rule('CC=O', 'acétaldéhyde'), 'familiar');
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
