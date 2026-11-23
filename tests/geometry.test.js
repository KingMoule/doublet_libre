import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  angleOf, fromAngle, snapAngle, angleDiff, angularGaps, nextBondAngle, boxExit, dist, sub,
  ringAt, ringOnBond, ringOnAtom, zigzag, pinchView, zoomView, hexVertex, hexCenter, hexEdges,
} from '../src/geometry.js';

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

/** @param {{x:number,y:number}[]} ring */
const edgesAll = (ring, L) => ring.forEach((p, i) => close(dist(p, ring[(i + 1) % ring.length]), L, 1e-9));

test('isolated rings: vertical sides for six atoms (GR-3.4.2), flat bottom otherwise (GR-3.4.3)', () => {
  const six = ringAt({ x: 0, y: 0 }, 6, 40);
  assert.equal(six.length, 6);
  edgesAll(six, 40);
  assert.ok(six.some((p, i) => Math.abs(p.x - six[(i + 1) % 6].x) < 1e-9), 'a vertical edge');
  const five = ringAt({ x: 0, y: 0 }, 5, 40);
  edgesAll(five, 40);
  const bottom = Math.max(...five.map((p) => p.y));
  assert.equal(five.filter((p) => Math.abs(p.y - bottom) < 1e-9).length, 2, 'flat bottom');
});

test('a ring on a bond shares it and lies on the requested side', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 40, y: 0 };
  const r = ringOnBond(a, b, 6, 1);
  assert.deepEqual(r.slice(0, 2), [a, b]);
  edgesAll(r, 40);
  assert.ok(r.slice(2).every((p) => p.y > 0), 'side 1 is below a rightward bond');
  assert.ok(ringOnBond(a, b, 5, -1).slice(2).every((p) => p.y < 0));
});

test('a ring on an atom keeps it as a vertex and grows in the given direction', () => {
  const r = ringOnAtom({ x: 0, y: 0 }, 0, 5, 40);
  assert.deepEqual(r[0], { x: 0, y: 0 });
  edgesAll(r, 40);
  close(r.reduce((t, p) => t + p.y, 0) / 5, 0);
  assert.ok(r.reduce((t, p) => t + p.x, 0) / 5 > 0);
});

test('a chain zigzags at 120° along its direction (GR-3.2.1)', () => {
  const pts = zigzag({ x: 0, y: 0 }, 0, 4, 40, 1);
  assert.equal(pts.length, 4);
  close(angleOf(sub(pts[0], { x: 0, y: 0 })), 30);
  close(angleOf(sub(pts[1], pts[0])), 330);
  close(pts[3].x, 4 * 34.641016, 1e-4);
  close(pts[3].y, 0);
});

test('pinching: fingers twice as far apart halve the view, the point between them stays put', () => {
  const view = { x: 0, y: 0, w: 400, h: 300 };
  const rect = { left: 0, top: 0, width: 800, height: 600 };
  const v = pinchView(view, rect, { x: 300, y: 300 }, { x: 500, y: 300 }, { x: 200, y: 300 }, { x: 600, y: 300 });
  close(v.w, 200);
  close(v.h, 150);
  // the midpoint (400, 300) on screen showed doc (200, 150) before, and still does
  close(v.x + (400 / 800) * v.w, 200);
  close(v.y + (300 / 600) * v.h, 150);
});

test('zooming keeps the aimed point where it is on the screen', () => {
  const view = { x: 0, y: 0, w: 400, h: 300 };
  const p = { x: 100, y: 75 }; // a quarter of the way across and down
  const v = zoomView(view, p, 0.5);
  close(v.w, 200);
  close(v.h, 150);
  close((p.x - v.x) / v.w, 0.25);
  close((p.y - v.y) / v.h, 0.25);
});

test('zooming stops at 60 and 6000 units across', () => {
  const view = { x: 0, y: 0, w: 400, h: 300 };
  const p = { x: 200, y: 150 };
  close(zoomView(view, p, 0.01).w, 60);
  close(zoomView(view, p, 100).w, 6000);
  close(zoomView(view, p, 100).h, 4500);
});

test('two fingers moving together pan the view', () => {
  const view = { x: 0, y: 0, w: 400, h: 300 };
  const rect = { left: 0, top: 0, width: 800, height: 600 };
  const v = pinchView(view, rect, { x: 300, y: 300 }, { x: 500, y: 300 }, { x: 400, y: 400 }, { x: 600, y: 400 });
  close(v.w, 400);
  close(v.x, -50, 1e-9);
  close(v.y, -50, 1e-9);
});

test('the hexagonal paper: nearest vertex and its kind, nearest cell centre', () => {
  const v = hexVertex({ x: 30, y: 4 }, 40);
  close(v.x, 34.641016, 1e-5);
  close(v.y, 0);
  assert.equal(v.up, true, 'this vertex has an edge going up');
  const b = hexVertex({ x: -3, y: 22 }, 40);
  assert.deepEqual([Math.round(b.x), Math.round(b.y), b.up], [0, 20, false]);
  const c = hexCenter({ x: 40, y: 45 }, 40);
  close(c.x, 34.641016, 1e-5);
  close(c.y, 40);
});

test('a zigzag started on a grid vertex stays on the grid', () => {
  const L = 40;
  for (const p of [{ x: 12, y: 18 }, { x: 40, y: 3 }]) {
    const start = hexVertex(p, L);
    let prev = { x: start.x, y: start.y };
    let angle = start.up ? 330 : 30;
    assert.ok(hexEdges(start.up).includes(angle));
    for (let k = 0; k < 6; k++) {
      const next = { x: prev.x + 40 * Math.cos((angle * Math.PI) / 180), y: prev.y - 40 * Math.sin((angle * Math.PI) / 180) };
      const snapped = hexVertex(next, L);
      close(dist(next, snapped), 0, 1e-6);
      angle = nextBondAngle([angleOf(sub(prev, next))]);
      prev = next;
    }
  }
});

test('a hexagon centred on a cell lies exactly on the grid', () => {
  for (const p of ringAt(hexCenter({ x: 100, y: 90 }, 40), 6, 40)) close(dist(p, hexVertex(p, 40)), 0, 1e-6);
});

test('distance from a box centre to its edge', () => {
  close(boxExit({ x: 1, y: 0 }, 5, 8), 5);
  close(boxExit({ x: 0, y: 1 }, 5, 8), 8);
});
