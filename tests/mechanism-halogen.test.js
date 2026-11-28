import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { builder } from '../src/templates.js';
import { checkMechanism } from '../src/mechanism/check.js';
import { fr } from '../src/i18n/fr.js';
import { series } from '../src/mechanism/generate.js';
import { answerMechanism, solution } from '../src/mechanism/exercise.js';

/**
 * The bromination of 2-méthylpropène as the textbook draws it (figure 7.24, after figure 7.23 for éthène). Step 1:
 * the π bond attacks the nearer Br of Br₂, polarised by induction; the Br–Br bond goes to the farther Br; a lone
 * pair of the nearer Br closes the bridge on the other carbon: the bromonium ion (a ring of three, Br⁺) and Br⁻.
 * Step 2: Br⁻ attacks the more substituted carbon of the bridge, which opens toward Br⁺. Atoms: c1 CH₂, c2 C(CH₃)₂.
 */
function bromination() {
  const b = builder();
  const alkene = (/** @type {number} */ x) => [[x, 20], [x + 34.64, 0], [x + 69.28, 20], [x + 34.64, -40]].map(([cx, cy]) => b.atom('C', cx, cy));
  const [c1, c2, c3, c4] = alkene(0);
  const pi = b.bond(c1, c2, 2);
  b.bond(c2, c3); b.bond(c2, c4);
  const near = b.atom('Br', 130, 0, 0, 3), far = b.atom('Br', 170, 0, 0, 3);
  const brbr = b.bond(near, far);
  b.step(220, 290);
  // The bromonium ion: the bridge under the C–C bond, at the top of an equilateral triangle.
  const k = alkene(320);
  b.bond(k[0], k[1]); b.bond(k[1], k[2]); b.bond(k[1], k[3]);
  const bridge = b.atom('Br', 354.64, 40, 1, 2);
  b.bond(k[0], bridge);
  const opens = b.bond(k[1], bridge);
  const bromide = b.atom('Br', 440, 0, -1, 4);
  b.step(480, 550);
  const p = alkene(600);
  b.bond(p[0], p[1]); b.bond(p[1], p[2]); b.bond(p[1], p[3]);
  b.bond(p[0], b.atom('Br', 565.36, 0, 0, 3));
  b.bond(p[1], b.atom('Br', 634.64, 40, 0, 3));
  b.arrow({ bond: pi }, { atom: near.id });
  b.arrow({ bond: brbr }, { atom: far.id });
  b.arrow({ mark: near.lp[0] }, { atom: c2.id });
  b.arrow({ mark: bromide.lp[0] }, { atom: k[1].id });
  b.arrow({ bond: opens }, { atom: bridge.id });
  const doc = b.done();
  const [, , closes] = doc.curvedArrows;
  return {
    doc, ids: { c1: c1.id, c2: c2.id, near, far, k, bridge: bridge.id, bromide: bromide.id },
    roles: Object.fromEntries(doc.curvedArrows.map((c, i) => [c.id, ['pi', 'leaving', 'bridge', 'open', 'leaving'][i]])),
    // The bridge closes on either carbon of the double bond: the π bond made the bond to the other.
    either: { [closes.id]: [c1.id] },
  };
}
const answer = bromination();
/** What the check finds, changed by f: code, role, step. @param {(d: M.Doc) => void} f */
const found = (f) => { const d = structuredClone(answer.doc); f(d); return checkMechanism(d, answer); };
const at = (/** @type {import('../src/mechanism/check.js').Finding} */ x) => `${x.code}${x.role ? `:${x.role}` : ''}@${x.step}`;
const F = /** @type {Record<string, any>} */ (fr.mechanism.findings);
const arrow = (/** @type {M.Doc} */ d, /** @type {number} */ k) => d.curvedArrows[k];

test('the bromination of figure 7.24 is right as drawn, the bridge closing on either carbon', () => {
  assert.deepEqual(found(() => {}), []);
  assert.deepEqual(found((d) => { arrow(d, 2).to = { atom: answer.ids.c1 }; }), []);
  // The π bond drawn to the C–Br bond it forms, on either carbon.
  assert.deepEqual(found((d) => { arrow(d, 0).to = { between: [answer.ids.c2, answer.ids.near.id] }; }), []);
});

test('each arrow missing is said by what it does: the π bond to the nearer Br, Br–Br to the farther, the bridge', () => {
  const [pi] = found((d) => M.removeCurvedArrow(d, arrow(d, 0).id));
  assert.equal(at(pi), 'missingArrow:pi@1');
  assert.equal(F.missingArrow.pi(pi.params), 'Il manque la flèche du doublet π vers le Br le plus proche de Br₂ (δ+).');
  const [leaving] = found((d) => M.removeCurvedArrow(d, arrow(d, 1).id));
  assert.equal(at(leaving), 'missingArrow:leaving@1');
  assert.equal(F.missingArrow.leaving(leaving.params), 'Il manque la flèche de la liaison Br–Br vers le brome : sans elle, le Br aurait deux liaisons.');
  const [bridge] = found((d) => M.removeCurvedArrow(d, arrow(d, 2).id));
  assert.equal(at(bridge), 'missingArrow:bridge@1');
  assert.match(F.missingArrow.bridge(bridge.params), /ferme le pont/);
  const [opens] = found((d) => M.removeCurvedArrow(d, arrow(d, 4).id));
  assert.equal(at(opens), 'missingArrow:leaving@2');
  assert.equal(F.missingArrow.leaving(opens.params), 'Il manque la flèche de la liaison C–Br vers le brome : sans elle, le C aurait cinq liaisons.');
});

test('Br⁻ opens the bridge on the more substituted carbon (figure 7.24)', () => {
  const [wrong] = found((d) => { arrow(d, 3).to = { atom: answer.ids.k[0].id }; });
  assert.equal(at(wrong), 'wrongTarget:open@2');
  assert.match(F.wrongTarget.open(wrong.params), /^Br⁻ attaque le carbone le plus substitué de l’ion ponté/);
  const [none] = found((d) => M.removeCurvedArrow(d, arrow(d, 3).id));
  assert.equal(F.missingArrow.open(none.params), 'Il manque la flèche d’un doublet de Br⁻ vers le carbone le plus substitué de l’ion ponté.');
});

test('the bromonium ion and Br₂ have their names; the + of the bridge is the bromine’s', () => {
  const [noPlus] = found((d) => { /** @type {M.Atom} */ (M.findAtom(d, answer.ids.bridge)).charge = 0; });
  assert.equal(at(noPlus), 'charge@1');
  assert.match(F.charge(noPlus.params), /le brome du pont, à deux liaisons, porte une charge \+/);
  const [moved] = found((d) => { /** @type {M.Atom} */ (M.findAtom(d, answer.ids.bridge)).charge = 0; /** @type {M.Atom} */ (M.findAtom(d, answer.ids.k[1].id)).charge = 1; });
  assert.equal(at(moved), 'cationPosition@1');
  assert.match(F.cationPosition(moved.params), /brome du pont/);
  const [gone] = found((d) => M.removeAtom(d, answer.ids.bromide));
  assert.equal(F.missingSpecies(gone.params), 'Il manque Br⁻ : ce qui se forme à une étape reste dessiné jusqu’à ce qu’il réagisse.');
  const [ion] = found((d) => { for (const id of [...answer.ids.k.map((a) => a.id), answer.ids.bridge]) M.removeAtom(d, id); });
  assert.match(F.missingSpecies(ion.params), /^Il manque l’ion ponté/);
  // HX keeps its words: the π bond toward the H, H–Br toward Br.
  assert.equal(F.missingArrow.pi({ target: 'HBr', el: 'H' }), 'Il manque la flèche du doublet π vers le H de HBr.');
  assert.equal(F.missingArrow.leaving({ el: 'Br', bond: 'H–Br' }), 'Il manque la flèche de la liaison H–Br vers le brome : sans elle, le H aurait deux liaisons.');
});

// ---------- the generator ----------

const items = [1, 2, 3].flatMap((s) => series('halogenation-progressive', s).items);

test('each generated addition of X₂ passes its own check, drawn as figure 7.23 draws it', () => {
  for (const item of items) {
    assert.deepEqual(checkMechanism(item.answer.doc, item.answer), [], item.alkene);
    assert.match(item.reagent, /^(Br|Cl)₂$/, item.alkene);
    assert.match(item.product, /di(bromo|chloro)/, item.alkene);
    if (item.style === 'product') continue;
    const { doc, roles } = item.answer;
    assert.deepEqual(Object.values(roles), ['pi', 'leaving', 'bridge', 'open', 'leaving'], item.alkene);
    // The bridge: X⁺ in a ring of three, with two lone pairs.
    const plus = /** @type {M.Atom} */ (doc.atoms.find((a) => a.element === item.x && a.charge === 1));
    assert.ok(plus && M.neighbors(doc, plus.id).length === 2, item.alkene);
    assert.equal(doc.marks.filter((m) => m.atom === plus.id && m.kind === 'lonePair').length, 2, item.alkene);
    // X–X polarised by induction: δ+ on the nearer X, δ− on the farther, drawn but not asked.
    assert.deepEqual(doc.marks.filter((m) => m.kind === 'partial').map((m) => m.value), ['δ+', 'δ−'], item.alkene);
  }
});

test('X₂ items are drawn as the app draws them: bonds of 40, nothing on top of anything', () => {
  for (const { answer: { doc }, alkene } of items) {
    const at = (/** @type {string} */ id) => /** @type {M.Atom} */ (M.findAtom(doc, id));
    for (const b of doc.bonds) assert.ok(Math.abs(Math.hypot(at(b.a).x - at(b.b).x, at(b.a).y - at(b.b).y) - 40) < 0.5, alkene);
    for (const [i, p] of doc.atoms.entries()) for (const q of doc.atoms.slice(i + 1)) assert.ok(Math.hypot(p.x - q.x, p.y - q.y) > 30, alkene);
  }
});

test('each style of X₂ asks what it should; the answer and the solution tell the bridge and the anti addition', () => {
  for (const item of items) {
    const [first] = checkMechanism(item.given, item.answer, item.steps);
    const said = `${first.code}${first.role ? `:${first.role}` : ''}@${first.step}`;
    assert.equal(said, { arrows: 'missingArrow:pi@1', structures: 'missingSpecies@1', complete: 'missingArrow:pi@1', product: 'missingSpecies@1' }[item.style], `${item.style} ${item.alkene}`);
    if (item.style === 'structures') assert.equal(item.given.curvedArrows.length, 3, item.alkene);
  }
  const item = /** @type {import('../src/mechanism/generate.js').Item} */ (items.find((i) => i.style === 'arrows'));
  assert.match(answerMechanism(item, item.given).lines[0], /^Étape 1 : Il manque la flèche du doublet π vers le (Br|Cl) le plus proche de (Br|Cl)₂ \(δ\+\)\.$/);
  const steps = solution(item).steps;
  assert.equal(steps.length, 2);
  assert.ok(steps[0].includes('ponté') && steps[1].includes('anti') && steps[1].includes(item.product));
});
