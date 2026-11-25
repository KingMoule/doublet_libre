import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fr } from '../src/i18n/fr.js';
import { LEVELS, series } from '../src/naming/generate.js';
import { toGraph } from '../src/naming/graph.js';
import { nameOf } from '../src/naming/namer.js';

const names = (/** @type {string} */ level, /** @type {number} */ seed) => series(level, seed).items.map((i) => i.name);
const SEEDS = [1, 2, 3, 4, 5];

test('a series is ten different molecules, the same for the same seed', () => {
  for (const level of LEVELS) {
    assert.equal(series(level, 42).items.length, 10);
    assert.deepEqual(names(level, 42), names(level, 42));
    assert.equal(new Set(names(level, 42)).size, 10, level);
  }
  assert.notDeepEqual(names('alkanes', 1), names('alkanes', 2));
});

test('a series alternates a molecule to name and a name to draw', () => {
  assert.deepEqual(series('alkanes', 7).items.map((i) => i.dir).slice(0, 4), ['name', 'draw', 'name', 'draw']);
});

test('each molecule is drawn as named, with the wrong names that break one rule', () => {
  for (const item of series('cycloalkanes', 3).items) {
    assert.equal(nameOf(toGraph(item.doc)).name, item.name);
    assert.ok(item.wrong.length > 0, item.name);
  }
});

test('each level draws what its section of the textbook names (2.5.1 to 2.5.3)', () => {
  const halo = Object.values(fr.naming.halo);
  const isHalo = (/** @type {{name: string}} */ p) => halo.includes(p.name);
  const isCyclo = (/** @type {{name: string}} */ p) => p.name.startsWith(fr.naming.cyclo);
  for (const seed of SEEDS) {
    for (const { naming } of series('alkanes', seed).items) {
      assert.ok(!naming.ring && naming.prefixes.length > 0 && !naming.prefixes.some((p) => isHalo(p) || isCyclo(p)), naming.name);
    }
    for (const { naming } of series('cycloalkanes', seed).items) {
      assert.ok((naming.ring || naming.prefixes.some(isCyclo)) && !naming.prefixes.some(isHalo), naming.name);
    }
    for (const { naming } of series('halogens', seed).items) assert.ok(naming.prefixes.some(isHalo), naming.name);
    for (const { naming } of series('alkenes', seed).items) assert.ok(naming.doubles.length > 0 && !naming.prefixes.some(isHalo), naming.name);
  }
});

test('parent chains stay within the exercises of the textbook: ten carbons at most (décane)', () => {
  for (const level of LEVELS) for (const seed of SEEDS) for (const { naming } of series(level, seed).items) assert.ok(naming.parent.length <= 10, naming.name);
});

test('molecules are drawn as the app draws them: bonds of 40, nothing on top of anything', () => {
  const cross = (/** @type {{x: number, y: number}[]} */ [a, b, c, d]) => {
    const side = (/** @type {{x: number, y: number}} */ p, /** @type {{x: number, y: number}} */ q, /** @type {{x: number, y: number}} */ r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
    return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
  };
  for (const level of LEVELS) for (const seed of SEEDS) for (const { doc, name } of series(level, seed).items) {
    const at = (/** @type {string} */ id) => /** @type {{x: number, y: number}} */ (doc.atoms.find((a) => a.id === id));
    for (const b of doc.bonds) assert.ok(Math.abs(Math.hypot(at(b.a).x - at(b.b).x, at(b.a).y - at(b.b).y) - 40) < 0.5, name);
    for (const [i, p] of doc.atoms.entries()) for (const q of doc.atoms.slice(i + 1)) assert.ok(Math.hypot(p.x - q.x, p.y - q.y) > 30, name);
    for (const [i, b] of doc.bonds.entries()) for (const c of doc.bonds.slice(i + 1)) {
      if ([b.a, b.b].some((x) => x === c.a || x === c.b)) continue;
      assert.ok(!cross([at(b.a), at(b.b), at(c.a), at(c.b)]), name);
    }
  }
});
