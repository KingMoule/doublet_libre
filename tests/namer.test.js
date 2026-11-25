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

test('2.5.6 (P-22.1.3): one substituent on a benzene ring takes no locant; a methyl makes it toluène', () => {
  assert.deepEqual(['c1ccccc1', 'CCc1ccccc1', 'Brc1ccccc1', 'O=N(=O)c1ccccc1', 'Cc1ccccc1'].map(name), ['benzène', 'éthylbenzène', 'bromobenzène', 'nitrobenzène', 'toluène']);
});

test('2.5.6: toluène is numbered from its methyl; with several methyls, the parent is benzène again', () => {
  assert.equal(name('Cc1cccc(Br)c1'), '3-bromotoluène');
  assert.equal(name('Cc1c(CC)cc(CC)cc1'), '2,4-diéthyltoluène');
  assert.equal(name('Cc1ccc(cc1)N(=O)=O'), '4-nitrotoluène');
  assert.equal(name('Brc1ccc(C)cc1C'), '1-bromo-2,4-diméthylbenzène');
});

test('2.5.6 (P-31.1.4): benzène takes the lowest locants, the first cited taking 1 on a tie', () => {
  assert.equal(name('Clc1ccc(cc1)N(=O)=O'), '1-chloro-4-nitrobenzène');
  assert.equal(name('Brc1ccccc1I'), '1-bromo-2-iodobenzène');
});

test('2.5.6, tableau 2.6: a benzene ring shorter than the chain is a phényl; benzyl is CH₂ and a phényl', () => {
  assert.equal(name('CCCCCCCc1ccccc1'), '1-phénylheptane');
  assert.equal(name('CCCCc1ccccc1'), 'butylbenzène');
  assert.equal(name('CCCC(Cc1ccccc1)CCCC'), '4-benzyloctane');
});

test('2.5.7, tableau 2.8 (P-63.2.2.1): an ether is an alkoxy on the longest chain: méthoxy to butoxy, then pentyloxy', () => {
  assert.deepEqual(['COCCCC', 'CC(OC)CC', 'CCOCC', 'CCCCCCCOCCCCC'].map(name), ['1-méthoxybutane', '2-méthoxybutane', 'éthoxyéthane', '1-pentyloxyheptane']);
  assert.equal(name('CCCCCCCOc1ccccc1'), '1-phényloxyheptane');
});

test('2.5.7, 2.5.6 (tableau 2.7): a methoxy alone on a benzene ring makes it anisole', () => {
  assert.deepEqual(['COc1ccccc1', 'COc1ccc(Br)cc1'].map(name), ['anisole', '4-bromoanisole']);
  assert.equal(reason('Cc1ccc(OC)cc1'), 'undecided'); // toluène or anisole: same rank, the textbook does not say
});

test('2.5.7: a simple ether also takes its radicofunctional name, groups in alphabetical order', () => {
  const also = (/** @type {string} */ s) => nameOf(fromSmiles(s)).also.map((a) => a.name);
  assert.ok(also('CCOCC').includes('oxyde de diéthyle'));
  assert.ok(also('CCOC').includes('oxyde d’éthyle et de méthyle'));
  assert.ok(also('CCOC(C)C').includes('oxyde d’éthyle et d’isopropyle'));
  assert.equal(reason('C1CCOC1'), 'scope'); // cyclic ethers are left out
});

test('2.5.8 (P-63.1.2): -ol replaces the e of -ane, the OH takes the lowest locant; méthanol, éthanol and a lone ring OH need none', () => {
  assert.deepEqual(['CO', 'CCO', 'CCCO', 'CC(O)C', 'CCC(O)CCCC', 'OC1CCCCC1'].map(name), ['méthanol', 'éthanol', 'propan-1-ol', 'propan-2-ol', 'heptan-3-ol', 'cyclohexanol']);
  assert.equal(name('CC(C)(C)O'), '2-méthylpropan-2-ol');
  assert.equal(name('CC1CCCCC1O'), '2-méthylcyclohexanol');
  assert.equal(name('OCCc1ccccc1'), '2-phényléthanol');
});

test('2.5.8 (P-31.1.4.2.4): the OH before the multiple bonds; -ène and -yne lose their e before -ol', () => {
  assert.equal(name('CC=CCC(C)O'), 'hex-4-én-2-ol');
  assert.equal(name('C#CCC(C)O'), 'pent-4-yn-2-ol');
  assert.equal(name('C#CCO'), 'prop-2-yn-1-ol'); // with an OH, a short chain's multiple bond needs its locant
});

test('2.5.8: several OH take -diol, -triol, and the chain keeps its e; tétrol loses its a', () => {
  assert.equal(name('CC(O)CCC(O)CC'), 'heptane-2,5-diol');
  assert.equal(name('CC(O)C=CC(O)CC'), 'hept-3-ène-2,5-diol');
  assert.equal(name('OCC(O)C(O)CO'), 'butane-1,2,3,4-tétrol');
});

test('2.5.6, 2.5.8: an OH on a benzene ring makes it phénol, before toluène and anisole', () => {
  assert.deepEqual(['Oc1ccccc1', 'CCCc1cccc(O)c1', 'Cc1ccc(O)cc1'].map(name), ['phénol', '3-propylphénol', '4-méthylphénol']);
});

test('2.5.9 (P-66.6.1.1): -al on carbon 1, never with its locant; -dial keeps the e of the chain', () => {
  assert.deepEqual(['C=O', 'CC=O', 'CCCC=O', 'CCC(Br)CC=O', 'C=C(C)C=O'].map(name), ['méthanal', 'éthanal', 'butanal', '3-bromopentanal', '2-méthylprop-2-énal']);
  assert.deepEqual(['O=CCCCC=O', 'O=CC=CC=O'].map(name), ['pentanedial', 'but-2-ènedial']);
});

test('2.5.9: before an aldehyde, an alcohol is a hydroxy prefix', () => {
  assert.equal(name('CCCC(O)C(CC)C=O'), '2-éthyl-3-hydroxyhexanal');
});

test('2.5.9, 2.5.6: an aldehyde on a ring is a -carbaldéhyde; on a benzene ring, benzaldéhyde, before phénol', () => {
  assert.deepEqual(['O=CC1CCCCC1', 'O=Cc1ccccc1', 'O=Cc1ccc(O)cc1'].map(name), ['cyclohexanecarbaldéhyde', 'benzaldéhyde', '4-hydroxybenzaldéhyde']);
});

test('2.5.10, figure 2.44 (P-64.2.1): -one with the lowest locant; -dione keeps the e; -én and -yn before -one', () => {
  assert.deepEqual(['CCCC(=O)C', 'CCC(=O)CC', 'CCC(I)C(=O)CCC'].map(name), ['pentan-2-one', 'pentan-3-one', '3-iodoheptan-4-one']);
  assert.deepEqual(['CC(=O)CC(=O)C', 'CC(=O)C(C(C)C)CCC(=O)C'].map(name), ['pentane-2,4-dione', '3-isopropylheptane-2,6-dione']);
  assert.deepEqual(['C#CCC(=O)C', 'CCC#CC(=O)C', 'CC(=O)C=CC(=O)C=C'].map(name), ['pent-4-yn-2-one', 'hex-3-yn-2-one', 'hepta-3,6-diène-2,5-dione']);
});

test('2.5.10, figure 2.44: no locant where the C=O has one place only (propanone, butanone) or alone in a ring', () => {
  assert.deepEqual(['CC(=O)C', 'CCC(=O)C', 'O=C1CCC1', 'O=C1CC(Br)CC1', 'O=C1CCCC(=O)C1'].map(name), ['propanone', 'butanone', 'cyclobutanone', '3-bromocyclopentanone', 'cyclohexane-1,3-dione']);
  // « L’indice de position peut être omis » : with it, the name counts too.
  assert.ok(nameOf(fromSmiles('CC(=O)C')).also.some((a) => a.name === 'propan-2-one' && !a.remark));
  // Beside a -yn-3- the locant stays in the name shown, so that 3 is not read as the ketone's; without it, it counts.
  assert.equal(name('C#CC(=O)C'), 'but-3-yn-2-one');
  assert.ok(nameOf(fromSmiles('C#CC(=O)C')).also.some((a) => a.name === 'but-3-ynone'));
});

test('2.5.10, exemple 2.10, figure 2.45: a ketone before an alcohol (hydroxy-); under an aldehyde, an oxo- prefix', () => {
  assert.equal(name('CC(=O)CC(O)C=C'), '4-hydroxyhex-5-én-2-one');
  assert.deepEqual(['O=CCCCC(=O)C', 'O=CC(C)=CC(=O)CC(=O)C#C', 'O=CCCCC(=O)C(C)CCCl'].map(name), ['5-oxohexanal', '2-méthyl-4,6-dioxooct-2-én-7-ynal', '8-chloro-6-méthyl-5-oxooctanal']);
});

test('2.5.6, 2.5.10: an acetyl on a benzene ring makes it acétophénone, numbered from it', () => {
  assert.deepEqual(['CC(=O)c1ccccc1', 'CC(=O)c1ccc(Br)cc1'].map(name), ['acétophénone', '4-bromoacétophénone']);
  assert.ok(nameOf(fromSmiles('CC(=O)c1ccccc1')).also.some((a) => a.name === '1-phényléthanone' && a.remark === 'retained'));
  assert.equal(name('CCC(=O)c1ccccc1'), '1-phénylpropan-1-one');
});

test('what the textbook leaves to later sections or never asks is out of scope for now', () => {
  assert.equal(reason('CC(=O)O'), 'scope'); // acids: annexe C
  assert.equal(reason('C=C=O'), 'scope'); // a ketene is not a ketone
  assert.equal(reason('CCCCCC(CC(C)CC)CCCCC'), 'scope'); // a branch named in parentheses (Enrichissement)
});

test('the name comes with its parent chain in numbering order, to number the solution', () => {
  const { parent } = nameOf(fromSmiles('CC(C)CC'));
  assert.equal(parent.length, 4);
  assert.equal(parent[1], 1);
});
