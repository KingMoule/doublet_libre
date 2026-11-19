import { test } from 'node:test';
import assert from 'node:assert/strict';
import { implicitHydrogens, formatChem } from '../src/chem.js';

test('implicit hydrogens follow valence and charge', () => {
  assert.equal(implicitHydrogens('O', 1), 1, 'alcohol: OH');
  assert.equal(implicitHydrogens('O', 0, -1), 1, 'hydroxide: HO−');
  assert.equal(implicitHydrogens('O', 0), 2, 'water');
  assert.equal(implicitHydrogens('N', 1), 2, 'amine: NH2');
  assert.equal(implicitHydrogens('N', 1, 1), 3, 'ammonium: NH3+');
  assert.equal(implicitHydrogens('N', 4, 1), 0, 'quaternary ammonium');
  assert.equal(implicitHydrogens('C', 2), 2);
  assert.equal(implicitHydrogens('C', 3, 1), 0, 'carbocation');
  assert.equal(implicitHydrogens('C', 3, 0, 1), 0, 'radical');
  assert.equal(implicitHydrogens('Br', 1), 0);
  assert.equal(implicitHydrogens('Br', 0, -1), 0, 'bromide');
  assert.equal(implicitHydrogens('B', 3, -1), 1, 'borate');
  assert.equal(implicitHydrogens('Xx', 0), 0, 'unknown element');
});

test('digits right after a symbol become subscripts', () => {
  assert.deepEqual(formatChem('H2O'), [
    { text: 'H', mode: 'normal' }, { text: '2', mode: 'sub' }, { text: 'O', mode: 'normal' },
  ]);
  assert.deepEqual(formatChem('(CH3)3N').map((s) => s.mode), ['normal', 'sub', 'normal', 'sub', 'normal']);
});

test('step numbers, temperatures and durations stay on the line', () => {
  assert.deepEqual(formatChem('1. NaOH, 25 °C, 2 h'), [{ text: '1. NaOH, 25 °C, 2 h', mode: 'normal' }]);
});

test('^ makes a superscript, with a real minus sign', () => {
  assert.deepEqual(formatChem('H3O^+').map((s) => s.mode), ['normal', 'sub', 'normal', 'sup']);
  assert.equal(formatChem('OH^-').at(-1).text, '−');
});
