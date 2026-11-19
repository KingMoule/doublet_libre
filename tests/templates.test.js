import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { TEMPLATES, SETUP_TEMPLATES } from '../src/templates.js';
import { PIECES, assembly } from '../src/apparatus.js';
import { checkDoc } from '../src/checks.js';
import { layout } from '../src/render.js';

test('every mechanism template is valid, warning-free and fully drawn', () => {
  for (const [name, make] of Object.entries(TEMPLATES)) {
    const d = make();
    assert.deepEqual(M.validateDoc(d), [], name);
    assert.deepEqual(checkDoc(d), [], name);
    assert.ok(d.curvedArrows.length > 0 && d.reactionArrows.length > 0, `${name}: arrows`);
    const L = layout(d);
    for (const c of d.curvedArrows) assert.ok(L.curved.get(c.id), `${name}: arrow ${c.id} anchored`);
  }
});

test('the six mechanisms of the course are there', () => {
  assert.deepEqual(Object.keys(TEMPLATES), ['sn2', 'sn1', 'e2', 'e1', 'electrophilicAddition', 'carbonylAddition']);
});

test('multi-step templates have one reaction arrow per step', () => {
  assert.equal(TEMPLATES.sn1().reactionArrows.length, 2);
  assert.equal(TEMPLATES.e1().reactionArrows.length, 2);
  assert.equal(TEMPLATES.electrophilicAddition().reactionArrows.length, 2);
});

test('each set-up template is one assembled set-up: every piece with joints fits the others', () => {
  assert.deepEqual(Object.keys(SETUP_TEMPLATES), ['reflux', 'distillation', 'deanStark']);
  for (const [name, make] of Object.entries(SETUP_TEMPLATES)) {
    const d = make();
    assert.deepEqual(M.validateDoc(d), [], name);
    const glass = d.apparatus.filter((g) => PIECES[g.kind].joints.length);
    assert.equal(assembly(d, glass[0].id).size, glass.length, name);
    assert.ok(d.texts.length >= 2, `${name}: water in and out labelled`);
  }
});
