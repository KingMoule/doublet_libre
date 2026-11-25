import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { series } from '../src/naming/generate.js';
import { answerDrawing, answerName, solution } from '../src/naming/exercise.js';

const item = series('alkanes', 1).items[4]; // 3-méthylhexane

test('a typed name: right, right with a remark, or wrong with the rule it breaks', () => {
  assert.equal(item.name, '3-méthylhexane');
  assert.equal(answerName(item, '3-méthylhexane').verdict, 'right');
  const accents = answerName(item, '3-methylhexane');
  assert.equal(accents.verdict, 'right');
  assert.ok(accents.lines.some((l) => /accents/.test(l)));
  const wrong = answerName(item, '4-méthylhexane');
  assert.equal(wrong.verdict, 'wrong');
  assert.ok(wrong.lines.some((l) => /plus petits indices/.test(l)));
  assert.equal(answerName(item, '  ').verdict, 'empty');
});

test('a drawing: the same molecule wherever it is drawn, or the name of what was drawn', () => {
  const moved = structuredClone(item.doc);
  M.moveObjects(moved, new Set(moved.atoms.map((a) => a.id)), 120, -80);
  assert.equal(answerDrawing(item, moved).verdict, 'right');
  const other = series('alkanes', 1).items[7].doc; // 2-méthyloctane
  const wrong = answerDrawing(item, other);
  assert.equal(wrong.verdict, 'wrong');
  assert.ok(wrong.lines.some((l) => l.includes('2-méthyloctane')));
  assert.equal(answerDrawing(item, M.emptyDoc()).verdict, 'empty');
});

test('an alkene: the solution names its parent with its double bond, a wrong drawing hears about its double bonds', () => {
  const alkene = series('alkenes', 1).items[1];
  assert.equal(alkene.name, '4-méthylhept-1-ène');
  assert.ok(solution(alkene).steps[0].includes('hept-1-ène'));
  const saturated = structuredClone(alkene.doc);
  for (const b of saturated.bonds) b.order = 1;
  assert.ok(answerDrawing(alkene, saturated).lines.some((l) => /liaisons doubles/.test(l)));
});

test('the solution numbers the parent chain on the drawing and says how the name is built', () => {
  const s = solution(item);
  assert.deepEqual(s.doc.texts.map((t) => t.text), ['1', '2', '3', '4', '5', '6']);
  assert.equal(s.doc.atoms.length, item.doc.atoms.length);
  assert.ok(s.steps[s.steps.length - 1].includes('3-méthylhexane'));
});
