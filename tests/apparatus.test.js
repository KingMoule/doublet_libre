import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import * as A from '../src/apparatus.js';
import { renderDoc } from '../src/render.js';

/** A document with one piece of each given kind, all at the origin, upright. @param {string[]} kinds */
function withPieces(...kinds) {
  const d = M.emptyDoc();
  const ids = kinds.map((kind) => M.addPiece(d, { kind, x: 0, y: 0, angle: 0 }).id);
  return { d, ids, piece: (/** @type {string} */ id) => /** @type {M.Piece} */ (d.apparatus.find((g) => g.id === id)) };
}

/** Whether two pieces are joined: one joint of each at the same spot, facing each other. */
function joined(/** @type {M.Doc} */ d, /** @type {string} */ a, /** @type {string} */ b) {
  return A.assembly(d, a).has(b);
}

test('a condenser touched onto the neck of a flask fits into it, upright', () => {
  const { d, ids: [flask], piece } = withPieces('flask');
  const neck = A.worldJoints(piece(flask))[0];
  const condenser = M.addPiece(d, { kind: 'allihn', x: neck.x + 5, y: neck.y - 10, angle: 0 });
  assert.ok(A.place(d, condenser.id, { x: neck.x + 5, y: neck.y - 10 }));
  assert.ok(joined(d, flask, condenser.id));
  assert.equal(condenser.x, 0);
  assert.equal(condenser.angle, 0);
});

test('a flask touched into a heating mantle sits in it', () => {
  const { d, ids: [mantle], piece } = withPieces('mantle');
  const cup = A.worldJoints(piece(mantle))[0];
  const flask = M.addPiece(d, { kind: 'flask', x: cup.x, y: cup.y, angle: 0 });
  assert.ok(A.place(d, flask.id, cup));
  assert.ok(joined(d, mantle, flask.id));
});

test('a dragged piece snaps to a free joint within 15 units, not further', () => {
  const { d, ids: [flask], piece } = withPieces('flask');
  const neck = A.worldJoints(piece(flask))[0];
  const condenser = M.addPiece(d, { kind: 'allihn', x: 0, y: 0, angle: 0 });
  const bottom = () => A.worldJoints(condenser).find((j) => j.male && j.kind === 'joint');
  const putBottomAt = (/** @type {number} */ dx) => {
    const b = /** @type {A.WorldJoint} */ (bottom());
    condenser.x += neck.x + dx - b.x;
    condenser.y += neck.y - b.y;
  };
  putBottomAt(30);
  assert.equal(A.snap(d, new Set([condenser.id])), false);
  putBottomAt(10);
  assert.equal(A.snap(d, new Set([condenser.id])), true);
  assert.ok(joined(d, flask, condenser.id));
});

test('a condenser follows the angle of a tilted neck', () => {
  const { d, ids: [flask], piece } = withPieces('flask');
  piece(flask).angle = 30;
  const neck = A.worldJoints(piece(flask))[0];
  const condenser = M.addPiece(d, { kind: 'allihn', x: neck.x, y: neck.y, angle: 0 });
  assert.ok(A.place(d, condenser.id, neck));
  assert.ok(Math.abs(condenser.angle - 30) < 1e-9);
  assert.ok(joined(d, flask, condenser.id));
});

test('two male joints never fit together', () => {
  const { d, ids: [a, b], piece } = withPieces('allihn', 'allihn');
  const male = (/** @type {string} */ id) => /** @type {A.WorldJoint} */ (A.worldJoints(piece(id)).find((j) => j.male));
  piece(b).x += male(a).x - male(b).x + 5;
  piece(b).y += male(a).y - male(b).y;
  assert.equal(A.snap(d, new Set([b])), false);
});

test('a set-up moves as one block, and a turn keeps it together', () => {
  const { d, ids: [mantle], piece } = withPieces('mantle');
  const flask = M.addPiece(d, { kind: 'flask', x: 0, y: 0, angle: 0 });
  A.place(d, flask.id, A.worldJoints(piece(mantle))[0]);
  const neck = A.worldJoints(flask).find((j) => j.kind === 'joint');
  const condenser = M.addPiece(d, { kind: 'allihn', x: 0, y: -100, angle: 0 });
  A.place(d, condenser.id, /** @type {A.WorldJoint} */ (neck));
  const block = A.assembly(d, flask.id);
  assert.deepEqual([...block].sort(), [condenser.id, flask.id, mantle].sort());
  M.moveObjects(d, block, 40, 0);
  assert.deepEqual([...A.assembly(d, mantle)].sort(), [...block].sort());
  A.turn(d, block, piece(mantle), 15);
  assert.equal(A.assembly(d, condenser.id).size, 3);
  assert.equal(piece(mantle).angle, 15);
});

test('every joint of the library has a partner it can fit', () => {
  const all = Object.entries(A.PIECES).flatMap(([kind, p]) => p.joints.map((j) => ({ kind, j })));
  for (const { kind, j } of all) {
    assert.ok(all.some((o) => o.j.kind === j.kind && o.j.male !== j.male), `${kind}: no partner for its ${j.kind}`);
  }
});

test('every family lists known pieces, and every piece is in a family', () => {
  const listed = new Set(Object.values(A.FAMILIES).flat());
  for (const kind of listed) assert.ok(A.PIECES[kind], kind);
  for (const kind of Object.keys(A.PIECES)) assert.ok(listed.has(kind), kind);
});

test('a piece is drawn as an outline, turned and placed, with a hit area', () => {
  const { d, ids: [flask], piece } = withPieces('flask');
  Object.assign(piece(flask), { x: 10, y: 20, angle: 30 });
  const { markup } = renderDoc(d);
  assert.match(markup, /<g class="obj" data-kind="piece" data-id="g1"><g transform="translate\(10 20\) rotate\(30\)"><path class="gw" d="M/);
  assert.match(markup, /<rect class="hit"/);
  assert.doesNotMatch(renderDoc(d, { plain: true }).markup, /class="hit"/);
});

test('a three-neck flask takes an addition funnel on a side neck, leaning with it', () => {
  const { d, ids: [flask], piece } = withPieces('flask3');
  const side = /** @type {A.WorldJoint} */ (A.worldJoints(piece(flask)).find((j) => j.dir === -62));
  const funnel = M.addPiece(d, { kind: 'addfunnel', x: side.x, y: side.y, angle: 0 });
  assert.ok(A.place(d, funnel.id, side));
  assert.equal(funnel.angle, 28);
  assert.ok(joined(d, flask, funnel.id));
});

test('a Dean-Stark goes on a flask and takes the condenser above its trap', () => {
  const { d, ids: [flask], piece } = withPieces('flask');
  const trap = M.addPiece(d, { kind: 'deanstark', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, trap.id, A.worldJoints(piece(flask))[0]));
  const top = /** @type {A.WorldJoint} */ (A.worldJoints(trap).find((j) => !j.male));
  assert.equal(top.x, 35);
  const condenser = M.addPiece(d, { kind: 'allihn', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, condenser.id, top));
  assert.equal(A.assembly(d, flask).size, 3);
});

test('a Claisen adapter leaves two free sockets, and a stopper closes one', () => {
  const { d, ids: [flask], piece } = withPieces('flask');
  const claisen = M.addPiece(d, { kind: 'claisen', x: 0, y: 0, angle: 0 });
  A.place(d, claisen.id, A.worldJoints(piece(flask))[0]);
  const sockets = A.worldJoints(claisen).filter((j) => !j.male);
  assert.equal(sockets.length, 2);
  const stopper = M.addPiece(d, { kind: 'stopper', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, stopper.id, sockets[1]));
  assert.equal(A.assembly(d, flask).size, 3);
});

test('a crystallising dish sits on the stirrer hotplate, and a flask sits in its bath', () => {
  const { d, ids: [plate], piece } = withPieces('stirrer');
  const bath = M.addPiece(d, { kind: 'bath', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, bath.id, A.worldJoints(piece(plate))[0]));
  const floor = /** @type {A.WorldJoint} */ (A.worldJoints(bath).find((j) => j.kind === 'seat'));
  const flask = M.addPiece(d, { kind: 'flask', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, flask.id, floor));
  assert.equal(A.assembly(d, plate).size, 3);
});

test('a heating mantle also sits on the hotplate', () => {
  const { d, ids: [plate], piece } = withPieces('stirrer');
  const mantle = M.addPiece(d, { kind: 'mantle', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, mantle.id, A.worldJoints(piece(plate))[0]));
  assert.ok(joined(d, plate, mantle.id));
});

test('a stand and a clamp are placed freely: they have no joint', () => {
  assert.deepEqual([A.PIECES.stand.joints, A.PIECES.clamp.joints], [[], []]);
});

// Hot gravity filtration: a heat gun keeps the funnel hot. Like the stand, it is placed freely.
test('a heat gun sits with the filtration pieces and is placed freely', () => {
  assert.ok(A.FAMILIES.separation.includes('heatgun'));
  assert.deepEqual(A.PIECES.heatgun?.joints, []);
});

// Melting point or a test tube over a flame: the burner stands on the bench, under whatever it heats.
test('a Bunsen burner sits with the heating pieces and is placed freely', () => {
  assert.ok(A.FAMILIES.heating.includes('burner'));
  assert.deepEqual(A.PIECES.burner?.joints, []);
});

// Heating over a flame: a beaker stands on the gauze of a tripod; the burner goes freely under it.
test('a beaker stands on the gauze of a tripod', () => {
  assert.ok(A.FAMILIES.heating.includes('tripod'));
  const { d, ids: [tripod], piece } = withPieces('tripod');
  const beaker = M.addPiece(d, { kind: 'beaker', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, beaker.id, A.worldJoints(piece(tripod))[0]));
  assert.ok(joined(d, tripod, beaker.id));
});

// A loose piece fits nothing: its panel offers no Detach, and its help says so.
test('stand, clamp, ring, heat gun and burner are loose; a flask is not', () => {
  assert.deepEqual(['stand', 'clamp', 'ring', 'heatgun', 'burner', 'flask'].map((k) => A.loose?.(k)), [true, true, true, true, true, false]);
});

// An iron ring holds a separatory funnel or a funnel on the stand, its boss on the rod like the clamp's.
test('an iron ring sits with the stand and the clamp', () => {
  assert.ok(A.FAMILIES.heating.includes('ring'));
});

test('a distillation train fits together: column, head, condenser along the side arm, adapter, receiver', () => {
  const { d, ids: [flask], piece } = withPieces('flask');
  const put = (/** @type {string} */ kind, /** @type {A.WorldJoint} */ j) => {
    const g = M.addPiece(d, { kind, x: 0, y: 0, angle: 0 });
    assert.ok(A.place(d, g.id, j), kind);
    return g;
  };
  const socket = (/** @type {M.Piece} */ g) => /** @type {A.WorldJoint} */ (A.worldJoints(g).find((j) => j.kind === 'joint' && !j.male));
  const cone = (/** @type {M.Piece} */ g, /** @type {number} */ i = 0) => /** @type {A.WorldJoint} */ (A.worldJoints(g).filter((j) => j.male)[i]);
  const column = put('vigreux', socket(piece(flask)));
  const head = put('head', socket(column));
  put('thermometer', socket(head));
  const arm = cone(head, 1);
  assert.equal(arm.dir, 25); // the side arm slopes down to the right
  const condenser = put('liebig', arm);
  assert.equal(condenser.angle, -65); // the condenser lies along the arm
  const adapter = put('adapter', cone(condenser));
  assert.equal(adapter.angle, 0); // the adapter is drawn for that slope
  const outlet = cone(adapter);
  assert.equal(outlet.dir, 90); // and pours straight down into the receiver
  put('flask', outlet);
  assert.equal(A.assembly(d, flask).size, 7);
});

test('a Soxhlet extractor goes between a flask and a condenser', () => {
  const { d, ids: [flask], piece } = withPieces('flask');
  const sox = M.addPiece(d, { kind: 'soxhlet', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, sox.id, A.worldJoints(piece(flask))[0]));
  const top = /** @type {A.WorldJoint} */ (A.worldJoints(sox).find((j) => !j.male));
  const condenser = M.addPiece(d, { kind: 'allihn', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, condenser.id, top));
  assert.equal(A.assembly(d, flask).size, 3);
});

test('a rotary evaporator takes a leaning evaporating flask and a hanging receiver', () => {
  const { d, ids: [rv], piece } = withPieces('rotavap');
  const [shaft, outlet] = A.worldJoints(piece(rv));
  const evap = M.addPiece(d, { kind: 'flask', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, evap.id, shaft));
  assert.equal(evap.angle, 55);
  const receiver = M.addPiece(d, { kind: 'flask', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, receiver.id, outlet));
  assert.equal(receiver.angle, 0);
});

test('a Büchner funnel stands in the mouth of a filter flask', () => {
  const { d, ids: [flask], piece } = withPieces('filterflask');
  const mouth = /** @type {A.WorldJoint} */ (A.worldJoints(piece(flask)).find((j) => j.kind === 'stem'));
  const buchner = M.addPiece(d, { kind: 'buchner', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, buchner.id, mouth));
  assert.ok(joined(d, flask, buchner.id));
});

test('a fluted filter paper sits in a funnel, and the funnel in a flask mouth', () => {
  const { d, ids: [funnel], piece } = withPieces('funnel');
  const cone = /** @type {A.WorldJoint} */ (A.worldJoints(piece(funnel)).find((j) => j.kind === 'paper'));
  const paper = M.addPiece(d, { kind: 'filterpaper', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, paper.id, cone));
  const flask = M.addPiece(d, { kind: 'filterflask', x: 0, y: 200, angle: 0 });
  const mouth = /** @type {A.WorldJoint} */ (A.worldJoints(flask).find((j) => j.kind === 'stem'));
  const stem = /** @type {A.WorldJoint} */ (A.worldJoints(piece(funnel)).find((j) => j.kind === 'stem'));
  const block = A.assembly(d, funnel);
  M.moveObjects(d, block, mouth.x - stem.x + 8, mouth.y - stem.y);
  assert.ok(A.snap(d, block));
  assert.equal(A.assembly(d, flask.id).size, 3);
});

test('a separatory funnel takes a stopper and pours through its stem', () => {
  const { d, ids: [sep], piece } = withPieces('sepfunnel');
  const top = /** @type {A.WorldJoint} */ (A.worldJoints(piece(sep)).find((j) => j.kind === 'joint'));
  const stopper = M.addPiece(d, { kind: 'stopper', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, stopper.id, top));
  assert.ok(A.worldJoints(piece(sep)).some((j) => j.kind === 'stem' && j.male && j.dir === 90));
});

test('a burette pours into an erlenmeyer standing on the stirrer (titration)', () => {
  const { d, ids: [plate], piece } = withPieces('stirrer');
  const flask = M.addPiece(d, { kind: 'erlenmeyer', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, flask.id, A.worldJoints(piece(plate))[0]));
  const mouth = /** @type {A.WorldJoint} */ (A.worldJoints(flask).find((j) => j.kind === 'stem'));
  const burette = M.addPiece(d, { kind: 'burette', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, burette.id, mouth));
  assert.equal(A.assembly(d, plate).size, 3);
});

test('beakers, cylinders and test tubes take a stem in their mouth', () => {
  for (const kind of ['beaker', 'cylinder', 'testtube']) {
    const { d, ids: [vessel], piece } = withPieces(kind);
    const mouth = /** @type {A.WorldJoint} */ (A.worldJoints(piece(vessel)).find((j) => j.kind === 'stem'));
    const pipette = M.addPiece(d, { kind: 'pipette', x: 0, y: 0, angle: 0 });
    assert.ok(A.place(d, pipette.id, mouth), kind);
  }
});

test('a thermometer goes into a Thiele tube', () => {
  const { d, ids: [thiele], piece } = withPieces('thiele');
  const thermometer = M.addPiece(d, { kind: 'thermometer', x: 0, y: 0, angle: 0 });
  assert.ok(A.place(d, thermometer.id, A.worldJoints(piece(thiele))[0]));
});
