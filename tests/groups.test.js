import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { GROUPS, attachGroup } from '../src/groups.js';
import { checkDoc } from '../src/checks.js';

/** Ethane, with its right-hand carbon as the attachment point. */
function ethane() {
  const d = M.emptyDoc();
  const a = M.addAtom(d, { x: 0, y: 0 });
  const b = M.addAtom(d, { x: 34.64, y: -20 });
  M.addBond(d, a.id, b.id);
  return { d, at: b.id };
}

const formula = (d, before) => d.atoms.slice(before).map((a) => a.element + (a.charge > 0 ? '+' : a.charge < 0 ? '−' : '')).sort().join(' ');

test('every group attaches with a standard first bond and raises no warning', () => {
  for (const name of Object.keys(GROUPS)) {
    const { d, at } = ethane();
    const ids = attachGroup(d, at, name, 330);
    assert.ok(ids.length > 0, name);
    const first = M.findAtom(d, ids[0]);
    const host = M.findAtom(d, at);
    assert.ok(Math.abs(Math.hypot(first.x - host.x, first.y - host.y) - 40) < 1e-9, `${name}: bond length`);
    assert.deepEqual(M.validateDoc(d), [], name);
    assert.deepEqual(checkDoc(d), [], name);
  }
});

test('groups carry the right atoms', () => {
  const cases = { Ph: 'C C C C C C', OMe: 'C O', CO2H: 'C O O', CN: 'C N', NO2: 'N+ O O−', Boc: 'C C C C C O O' };
  for (const [name, expected] of Object.entries(cases)) {
    const { d, at } = ethane();
    attachGroup(d, at, name, 330);
    assert.equal(formula(d, 2), expected, name);
  }
});

test('a group never fuses with a neighbouring molecule', () => {
  const { d, at } = ethane();
  const host = M.findAtom(d, at);
  // A bromide sitting exactly where the ring's far vertex will land (120 along 330°).
  const far = M.addAtom(d, { element: 'Br', x: host.x + 120 * Math.cos(Math.PI / 6), y: host.y + 120 * Math.sin(Math.PI / 6), charge: -1 });
  const ids = attachGroup(d, at, 'Ph', 330);
  assert.equal(ids.length, 6);
  assert.ok(!ids.includes(far.id));
  assert.equal(M.bondsOf(d, far.id).length, 0, 'the bromide stays alone');
});

test('the phenyl ring is Kekulé and nitro is charge-separated (GR-8.1)', () => {
  let { d, at } = ethane();
  attachGroup(d, at, 'Ph', 330);
  assert.equal(d.bonds.filter((b) => b.order === 2).length, 3);
  ({ d, at } = ethane());
  attachGroup(d, at, 'NO2', 330);
  assert.deepEqual(d.atoms.map((a) => a.charge).filter(Boolean).sort(), [-1, 1]);
});
