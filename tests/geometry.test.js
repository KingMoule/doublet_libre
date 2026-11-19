import { test } from 'node:test';
import assert from 'node:assert/strict';
import { angleOf, fromAngle, snapAngle, angleDiff, angularGaps, nextBondAngle, boxExit } from '../src/geometry.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} should be close to ${b}`);

test('angles turn counter-clockwise on screen, 0° pointing right', () => {
  close(angleOf({ x: 1, y: 0 }), 0);
  close(angleOf({ x: 0, y: -1 }), 90);
  close(angleOf({ x: -1, y: 0 }), 180);
  const v = fromAngle(30, 40);
  close(v.x, 34.641016, 1e-5);
  close(v.y, -20);
});

test('angles snap to 15° steps and differences stay between 0 and 180', () => {
  assert.equal(snapAngle(37), 30);
  assert.equal(snapAngle(38), 45);
  assert.equal(snapAngle(-10), 345);
  close(angleDiff(350, 10), 20);
});

test('the largest free sector comes first', () => {
  const g = angularGaps([0, 90]);
  close(g[0].size, 270);
  close(g[0].mid, 225);
});

test('a new bond continues the 120° zigzag (GR-3.2.1)', () => {
  assert.equal(nextBondAngle([]), 30);
  assert.equal(nextBondAngle([210]), 330);
  assert.equal(nextBondAngle([150]), 30);
  assert.equal(nextBondAngle([150, 30]), 270);
});

test('distance from a box centre to its edge', () => {
  close(boxExit({ x: 1, y: 0 }, 5, 8), 5);
  close(boxExit({ x: 0, y: 1 }, 5, 8), 8);
});
