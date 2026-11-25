import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromSmiles } from '../src/naming/graph.js';
import { nameOf } from '../src/naming/namer.js';

// Rules of the course's textbook (Girouard et al., Chimie organique, 3e éd., ch. 2, section 2.5),
// with the IUPAC 2013 rule (P-x) beside each, and the gap where the textbook differs.
const name = (/** @type {string} */ smiles) => nameOf(fromSmiles(smiles)).name;
const reason = (/** @type {string} */ smiles) => { try { nameOf(fromSmiles(smiles)); return 'named'; } catch (e) { return /** @type {any} */ (e).reason; } };

test('2.5.1, tableau 2.3 (P-21.2.1): straight chains take the name of their number of carbons', () => {
  assert.deepEqual(['C', 'CC', 'CCC', 'CCCC', 'CCCCCCCCCC'].map(name), ['méthane', 'éthane', 'propane', 'butane', 'décane']);
});

test('2.5.1, règle 2 (P-31.1.4): the chain is numbered to give the branches the lowest locants', () => {
  assert.equal(name('CC(C)CC'), '2-méthylbutane');
});

test('2.5.1, règle 3b (P-14.2.1): identical branches take a multiplying prefix', () => {
  assert.equal(name('CC(C)C(C)CC'), '2,3-diméthylpentane');
});

test('2.5.1, règle 2 (P-14.3.5): locants compared at the first point of difference, never added up', () => {
  assert.equal(name('CC(C)CCCCC(C)(C)CC'), '2,7,7-triméthylnonane'); // 2,7,7 beats 3,3,8 although 16 > 14
});

test('2.5.1, règle 2 (P-31.1.4.3.4): on equal locants, the branch cited first takes the lowest', () => {
  assert.equal(name('CCC(CC)C(C)CC'), '3-éthyl-4-méthylhexane');
});

test('2.5.1, règle 1 (P-44.3, P-45.2.1): the longest chain, and among those the most branched', () => {
  assert.equal(name('CC(C)C(CC)CCC'), '3-éthyl-2-méthylhexane'); // not 3-isopropylhexane
  assert.equal(name('CCCC(CC(C)C)CCCC'), '2-méthyl-4-propyloctane'); // not 4-isobutyloctane
});

test('2.5.1, règle 3d (P-14.5.2): alphabetical order without multiplying prefixes', () => {
  assert.equal(name('CC(C)(C)CC(CC)CC'), '4-éthyl-2,2-diméthylhexane');
});

test('2.5.1, tableau 2.6 (P-29.6): isopropyl, isobutyl, sec-butyl and tert-butyl branches', () => {
  assert.equal(name('CCCC(C(C)C)CCC'), '4-isopropylheptane');
  assert.equal(name('CCCC(C(C)(C)C)CCC'), '4-tert-butylheptane');
  assert.equal(name('CCCCC(C(C)CC)CCCC'), '5-sec-butylnonane');
  assert.equal(name('CC(C)CC1CCCCC1'), 'isobutylcyclohexane');
});

test('2.5.2 (P-31.1.4): a ring that is the longest chain is the parent, numbered for the lowest locants', () => {
  assert.equal(name('CC1CCCC1'), 'méthylcyclopentane');
  assert.equal(name('CC1CCCCC1C'), '1,2-diméthylcyclohexane');
  assert.equal(name('CC1C(C)CC(C)CC1'), '1,2,4-triméthylcyclohexane');
});

test('2.5.2 (P-14.5.2, P-31.1.4.3.4): on a ring, locant 1 goes to the first cited, sec- and tert- ignored', () => {
  assert.equal(name('CCC1CC(C)CC1'), '1-éthyl-3-méthylcyclopentane');
  assert.equal(name('CC(C)(C)C1CCCC(C(C)C)C1'), '1-tert-butyl-3-isopropylcyclohexane');
});

// IUPAC 2013 (P-52.2.8) always prefers the ring; the textbook compares their sizes.
test('2.5.2: a ring shorter than the chain becomes a cycloalkyl; the textbook does not decide a tie', () => {
  assert.equal(name('CCCCC1CCCCC1'), 'butylcyclohexane');
  assert.equal(name('CCCCCCCC1CC1'), '1-cyclopropylheptane');
  assert.equal(reason('CCCCCCC1CCCCC1'), 'undecided');
});

test('2.5.3 (P-61.3.1): halogens are prefixes of the same rank as the branches', () => {
  assert.equal(name('CC(Br)CC'), '2-bromobutane');
  assert.equal(name('ClCC(C)C'), '1-chloro-2-méthylpropane');
  assert.equal(name('FC(F)(F)C(Cl)Br'), '2-bromo-2-chloro-1,1,1-trifluoroéthane');
  assert.equal(name('BrC1CCCC(C)C1'), '1-bromo-3-méthylcyclohexane');
  assert.deepEqual(['CCl', 'CCCl'].map(name), ['chlorométhane', 'chloroéthane']);
});

test('2.5.4 (P-31.1.4.2.4): -ène with the locant of its first carbon, numbered from the nearest end', () => {
  assert.deepEqual(['C=CCCC', 'CC=CCC', 'CC=CC(C)C'].map(name), ['pent-1-ène', 'pent-2-ène', '4-méthylpent-2-ène']);
});

test('2.5.4 (P-31.1.4.2.4): the double bond takes the lowest locant before the branches', () => {
  assert.equal(name('CC=CC(C)(C)C'), '4,4-diméthylpent-2-ène');
});

test('2.5.4: no locant for two or three carbons, nor for a ring with one double bond', () => {
  assert.deepEqual(['C=C', 'C=CC', 'CC(C)=C', 'C=CCl', 'C1=CCCCC1'].map(name), ['éthène', 'propène', '2-méthylpropène', 'chloroéthène', 'cyclohexène']);
});

test('2.5.4: in a ring the double bond is C1=C2, then the branches take the lowest locants', () => {
  assert.equal(name('CC1C=CCCC1'), '3-méthylcyclohexène');
  assert.equal(name('CC1=CCCCC1C'), '1,6-diméthylcyclohexène');
});

test('2.5.4 (P-31.1.4.2.4): several double bonds take a multiplying prefix, and the chain an a before it', () => {
  assert.deepEqual(['C=CC=C', 'CC=CCC=CC', 'C1=CC=CCC1'].map(name), ['buta-1,3-diène', 'hepta-2,5-diène', 'cyclohexa-1,3-diène']);
});

// IUPAC 2013 (P-44.4.1.1) takes the longest chain first; the textbook the one with the most double bonds.
test('2.5.4: the parent chain holds the most double bonds, even when it is shorter', () => {
  assert.equal(name('C=CC(CCC)CCCCC'), '3-propyloct-1-ène');
});

test('2.5.5 (P-31.1.4.2.4): -yne like -ène, with no locant on two or three carbons', () => {
  assert.deepEqual(['C#C', 'CC#C', 'CC#CCCCCC', 'C#CCC(C)C', 'CCC#CC#CCC'].map(name), ['éthyne', 'propyne', 'oct-2-yne', '4-méthylpent-1-yne', 'octa-3,5-diyne']);
});

test('2.5.5 (P-31.1.4.2.4, P-31.1.4.3.4): double and triple bonds together take the lowest locants, the double bond first on a tie', () => {
  assert.equal(name('C=CCCC#CC'), 'hept-1-én-5-yne');
  assert.equal(name('C#CCCC=C'), 'hex-1-én-5-yne');
});

test('2.5.5: -én before -yne, an a only when -ène is multiplied, -ène kept before -diyne', () => {
  assert.equal(name('C=CC=CCC#C'), 'hepta-1,3-dién-6-yne');
  assert.equal(name('C#CCC=CCCC#CC'), 'déc-4-ène-1,8-diyne');
});

test('what the textbook leaves to later sections or never asks is out of scope for now', () => {
  assert.equal(reason('CC=O'), 'scope'); // aldehydes: 2.5.9
  assert.equal(reason('CCCCCC(CC(C)CC)CCCCC'), 'scope'); // a branch named in parentheses (Enrichissement)
});

test('the name comes with its parent chain in numbering order, to number the solution', () => {
  const { parent } = nameOf(fromSmiles('CC(C)CC'));
  assert.equal(parent.length, 4);
  assert.equal(parent[1], 1);
});
