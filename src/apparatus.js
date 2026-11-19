// @ts-check
/**
 * Lab glassware: the library of pieces and how they fit together.
 * A piece is drawn in its own frame, in drawing units (a bond is 40), then turned by its angle
 * about its origin and moved to (x, y). Its joints are where it fits another piece:
 * a ground-glass joint takes a joint of the other sex facing it; a seat (the bottom of a flask)
 * goes into a cup (a heating mantle); a flat base stands on a flat top (a hotplate); a stem goes into
 * a mouth (a funnel into a filter flask); a fluted paper sits in a funnel.
 * Pieces whose joints meet form one set-up. A stand and its clamps have no joint: they are placed freely.
 * @typedef {import('./model.js').Doc} Doc
 * @typedef {import('./model.js').Piece} Piece
 * @typedef {{x: number, y: number, dir: number, kind: 'joint' | 'seat' | 'base' | 'stem' | 'paper', male: boolean}} Joint
 *   dir: the way the joint faces, in degrees (0 right, 90 down)
 * @typedef {Joint & {piece: string}} WorldJoint
 * @typedef {{d: string, box: {l: number, t: number, r: number, b: number}, joints: Joint[]}} PieceDef
 */

/** @type {Record<string, PieceDef>} */
export const PIECES = {
  // Round-bottom flask: a socket at the top of the neck, a round bottom that sits in a mantle.
  flask: {
    d: 'M-7.5 -52 L-6 -44 L-6 -25.3 A26 26 0 1 0 6 -25.3 L6 -44 L7.5 -52',
    box: { l: -26, t: -52, r: 26, b: 26 },
    joints: [
      { x: 0, y: -52, dir: -90, kind: 'joint', male: false },
      { x: 0, y: 26, dir: 90, kind: 'seat', male: true },
    ],
  },
  // Allihn (bulb) condenser: a cone at the bottom, a socket at the top, water in low and out high.
  allihn: {
    d: 'M-7.5 -90 L-6 -82 L-6 -76 Q-13 -74 -13 -66 L-13 58 Q-13 66 -5 68 L-5 80 L-4.5 90'
      + ' M4.5 90 L5 80 L5 68 Q13 66 13 58 L13 -66 Q13 -74 6 -76 L6 -82 L7.5 -90'
      + ' M-3 -76 L-3 -52 M3 -76 L3 -52 M-3 -38 L-3 -22 M3 -38 L3 -22 M-3 -8 L-3 8 M3 -8 L3 8'
      + ' M-3 22 L-3 38 M3 22 L3 38 M-3 52 L-3 80 M3 52 L3 80'
      + [-45, -15, 15, 45].map((y) => ` M-7 ${y} a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0`).join('')
      + ' M13 46 L22 46 M13 54 L22 54 M-13 -56 L-22 -56 M-13 -48 L-22 -48',
    box: { l: -22, t: -90, r: 22, b: 90 },
    joints: [
      { x: 0, y: 80, dir: 90, kind: 'joint', male: true },
      { x: 0, y: -90, dir: -90, kind: 'joint', male: false },
    ],
  },
  // Three-neck flask: a straight middle neck and two side necks leaning out by 28°.
  flask3: {
    d: 'M32.9 -45.9 L27.8 -39.6 L19.1 -23.1 A30 30 0 1 1 -19.1 -23.1 L-27.8 -39.6 L-32.9 -45.9'
      + ' M-19.7 -53 L-17.2 -45.2 L-8.5 -28.8 A30 30 0 0 1 -6 -29.4 L-6 -52 L-7.5 -60'
      + ' M7.5 -60 L6 -52 L6 -29.4 A30 30 0 0 1 8.5 -28.8 L17.2 -45.2 L19.7 -53',
    box: { l: -33, t: -60, r: 33, b: 30 },
    joints: [
      { x: 0, y: -60, dir: -90, kind: 'joint', male: false },
      { x: -26.29, y: -49.45, dir: -118, kind: 'joint', male: false },
      { x: 26.29, y: -49.45, dir: -62, kind: 'joint', male: false },
      { x: 0, y: 30, dir: 90, kind: 'seat', male: true },
    ],
  },
  // Pressure-equalising addition funnel: a socket on top, a tap, a cone below, and the side tube.
  addfunnel: {
    d: 'M-7.5 -80 L-6 -72 L-6 -62 Q-14 -62 -14 -54 L-14 0 L-3 16 L-3 25 M3 25 L3 16 L14 0 L14 -54 Q14 -62 6 -62 L6 -72 L7.5 -80'
      + ' M-9 25 L9 25 L9 31 L-9 31 Z M9 28 L14 28 M-3 31 L-3 40 L-5 44 L-5 50 L-4.5 60 M3 31 L3 40 L5 44 L5 50 L4.5 60'
      + ' M6 -70 L22 -70 L22 46 L5 46 M6 -66 L19 -66 L19 42 L5 42',
    box: { l: -14, t: -80, r: 22, b: 60 },
    joints: [
      { x: 0, y: 50, dir: 90, kind: 'joint', male: true },
      { x: 0, y: -80, dir: -90, kind: 'joint', male: false },
    ],
  },
  // Claisen adapter: one cone below, two sockets above, the second on an arm to the right.
  claisen: {
    d: 'M-4.5 50 L-5 40 L-6 40 L-6 -42 L-7.5 -50 M7.5 -50 L6 -42 L6 -4 L24 -22 L24 -42 L22.5 -50'
      + ' M37.5 -50 L36 -42 L36 -18 L6 12 L6 40 L5 40 L4.5 50',
    box: { l: -7.5, t: -50, r: 37.5, b: 50 },
    joints: [
      { x: 0, y: 40, dir: 90, kind: 'joint', male: true },
      { x: 0, y: -50, dir: -90, kind: 'joint', male: false },
      { x: 30, y: -50, dir: -90, kind: 'joint', male: false },
    ],
  },
  // Drying tube (calcium chloride): a cone below, a bulb of grains, an open end.
  dryingtube: {
    d: 'M-4.5 40 L-5 30 L-5 7.9 A12 12 0 0 1 -3 -14.6 L-3 -40 M3 -40 L3 -14.6 A12 12 0 0 1 5 7.9 L5 30 L4.5 40'
      + [[-5, -6], [2, -8], [6, -2], [-2, 0], [-7, 3], [4, 5], [0, -12]].map(([x, y]) => ` M${x - 1.6} ${y} a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0`).join(''),
    box: { l: -12, t: -40, r: 12, b: 40 },
    joints: [{ x: 0, y: 30, dir: 90, kind: 'joint', male: true }],
  },
  // Dean-Stark trap: vapour rises on the left, condenses above the graduated trap on the right.
  deanstark: {
    d: 'M-4.5 70 L-5 60 L-5 -40 L29 -40 L29 -62 L27.5 -70 M42.5 -70 L41 -62 L41 48 L37 54'
      + ' M4.5 70 L5 60 L5 -26 L29 -26 L29 48 L33 54 M29 54 L41 54 L41 60 L29 60 Z M41 57 L46 57 M33 60 L33 68 M37 60 L37 68'
      + [-10, 0, 10, 20, 30, 40].map((y) => ` M29 ${y} L33 ${y}`).join(''),
    box: { l: -5, t: -70, r: 46, b: 70 },
    joints: [
      { x: 0, y: 60, dir: 90, kind: 'joint', male: true },
      { x: 35, y: -70, dir: -90, kind: 'joint', male: false },
    ],
  },
  // Stopper: a cone and its head.
  stopper: {
    d: 'M-5 0 L-4.5 10 L4.5 10 L5 0 M-8 0 L8 0 L8 -8 Q8 -14 0 -14 Q-8 -14 -8 -8 Z',
    box: { l: -8, t: -14, r: 8, b: 10 },
    joints: [{ x: 0, y: 0, dir: 90, kind: 'joint', male: true }],
  },
  // Vigreux column: a socket on top, a cone below, indentations inside.
  vigreux: {
    d: 'M-7.5 -70 L-6 -62 L-6 66 L-5 70 L-4.5 80 M4.5 80 L5 70 L6 66 L6 -62 L7.5 -70'
      + [-40, -20, 0, 20, 40].map((y) => ` M-6 ${y - 4} L-2.5 ${y} L-6 ${y + 4} M6 ${y - 4} L2.5 ${y} L6 ${y + 4}`).join(''),
    box: { l: -7.5, t: -70, r: 7.5, b: 80 },
    joints: [
      { x: 0, y: -70, dir: -90, kind: 'joint', male: false },
      { x: 0, y: 70, dir: 90, kind: 'joint', male: true },
    ],
  },
  // Distillation head. The side arm leaves the tube at (0, -15), slopes 25° down to the right,
  // half-width 5; its walls are the axis ± 5 × normal, from the tube wall x = 6 to the shoulder
  // 45 along the axis (the joint), cone 10 further. A condenser fitted there lies along the arm.
  head: {
    d: 'M-7.5 -40 L-6 -32 L-6 40 L-5 40 L-4.5 50 M4.5 50 L5 40 L6 40 L6 -6.7 L38.7 8.5 L47.9 12.3'
      + ' M51.7 4.2 L42.9 -0.5 L6 -17.7 L6 -32 L7.5 -40',
    box: { l: -7.5, t: -40, r: 51.7, b: 50 },
    joints: [
      { x: 0, y: 40, dir: 90, kind: 'joint', male: true },
      { x: 40.78, y: 4.02, dir: 25, kind: 'joint', male: true },
      { x: 0, y: -40, dir: -90, kind: 'joint', male: false },
    ],
  },
  // Thermometer in its adapter: the bulb ends level with the side arm of a distillation head.
  thermometer: {
    d: 'M-4.5 10 L-5 0 L-7 0 L-7 -10 L-1.5 -14 L-1.5 -108 Q0 -112 1.5 -108 L1.5 -14 L7 -10 L7 0 L5 0 L4.5 10'
      + ' M-1.5 10 L-1.5 20 Q-3.5 22 -3.5 26 Q-3.5 31 0 31 Q3.5 31 3.5 26 Q3.5 22 1.5 20 L1.5 10'
      + [-30, -45, -60, -75, -90].map((y) => ` M1.5 ${y} L4 ${y}`).join(''),
    box: { l: -7, t: -112, r: 7, b: 31 },
    joints: [{ x: 0, y: 0, dir: 90, kind: 'joint', male: true }],
  },
  // Liebig (straight) condenser: a socket at the top, a cone at the bottom, water jacket.
  liebig: {
    d: 'M-7.5 -80 L-6 -72 L-6 -66 Q-11 -64 -11 -58 L-11 56 Q-11 62 -5 64 L-5 75 L-4.5 85'
      + ' M4.5 85 L5 75 L5 64 Q11 62 11 56 L11 -58 Q11 -64 6 -66 L6 -72 L7.5 -80'
      + ' M-3 -66 L-3 64 M3 -66 L3 64 M11 44 L19 44 M11 52 L19 52 M-11 -52 L-19 -52 M-11 -44 L-19 -44',
    box: { l: -19, t: -80, r: 19, b: 85 },
    joints: [
      { x: 0, y: -80, dir: -90, kind: 'joint', male: false },
      { x: 0, y: 75, dir: 90, kind: 'joint', male: true },
    ],
  },
  // Bent adapter, drawn for the 25° slope of a condenser on a distillation head: its socket at the
  // origin faces up the slope (-155°); the axis runs 30 down the slope, then 26 straight down to the
  // shoulder (the joint), cone 10 further; walls at ± 6, mitred at the bend.
  adapter: {
    d: 'M-3.2 6.8 L4.7 8.8 L21.2 16.5 L21.2 38.7 L22.2 38.7 L22.7 48.7 M31.7 48.7 L32.2 38.7 L33.2 38.7 L33.2 8.9 L9.8 -2.1 L3.2 -6.8',
    box: { l: -3.2, t: -6.8, r: 33.2, b: 48.7 },
    joints: [
      { x: 0, y: 0, dir: -155, kind: 'joint', male: false },
      { x: 27.19, y: 38.68, dir: 90, kind: 'joint', male: true },
    ],
  },
  // Vacuum adapter: the bent adapter with a hose nozzle at the bend.
  vacadapter: {
    d: 'M-3.2 6.8 L4.7 8.8 L21.2 16.5 L21.2 38.7 L22.2 38.7 L22.7 48.7 M31.7 48.7 L32.2 38.7 L33.2 38.7 L33.2 24 L45 24'
      + ' M45 18 L33.2 18 L33.2 8.9 L9.8 -2.1 L3.2 -6.8 M45 16 L45 26',
    box: { l: -3.2, t: -6.8, r: 45, b: 48.7 },
    joints: [
      { x: 0, y: 0, dir: -155, kind: 'joint', male: false },
      { x: 27.19, y: 38.68, dir: 90, kind: 'joint', male: true },
    ],
  },
  // Soxhlet extractor: thimble in the chamber, vapour tube on the left, siphon on the right.
  soxhlet: {
    d: 'M-7.5 -80 L-6 -72 L-6 -62 L-14 -56 L-14 30 L-5 40 L-5 70 L-4.5 80 M7.5 -80 L6 -72 L6 -62 L14 -56 L14 30 L5 40 L5 70 L4.5 80'
      + ' M-5 52 L-24 52 L-24 -44 L-14 -44 M-5 58 L-28 58 L-28 -50 L-14 -50'
      + ' M14 20 L18 20 L18 -20 Q18 -30 24 -30 Q30 -30 30 -20 L30 62 L5 62 M14 26 L22 26 L22 -20 Q22 -25 24 -25 Q26 -25 26 -20 L26 56 L5 56'
      + ' M-9 -40 L-9 20 L9 20 L9 -40',
    box: { l: -28, t: -80, r: 30, b: 80 },
    joints: [
      { x: 0, y: -80, dir: -90, kind: 'joint', male: false },
      { x: 0, y: 70, dir: 90, kind: 'joint', male: true },
    ],
  },
  // Rotary evaporator: bath, motor on its post, coil condenser. The shaft leaves the motor at
  // (-20, -112) at 145°, half-width 4, 70 long to its joint: a flask fitted there leans 55° into the
  // bath. A receiving flask hangs from the condenser.
  rotavap: {
    d: 'M-170 0 L60 0 L60 6 L-170 6 Z M-160 -70 L-160 0 L-60 0 L-60 -70 M-160 -55 Q-153 -58 -146 -55 M-74 -55 Q-67 -58 -60 -55'
      + ' M-8 0 L-8 -100 M-2 0 L-2 -100 M-30 -130 L10 -130 L10 -100 L-30 -100 Z'
      + ' M-22.3 -115.3 L-79.6 -75.1 M-17.7 -108.7 L-75.1 -68.6 M10 -126 L20 -126 M10 -118 L20 -118'
      + ' M20 -210 L44 -210 L44 -112 L36 -106 L36 -98 L35.5 -88 M20 -210 L20 -112 L28 -106 L28 -98 L28.5 -88'
      + ' M24 -200 L40 -192 L24 -184 L40 -176 L24 -168 L40 -160 L24 -152 L40 -144 L24 -136',
    box: { l: -170, t: -210, r: 60, b: 6 },
    joints: [
      { x: -77.34, y: -71.85, dir: 145, kind: 'joint', male: true },
      { x: 32, y: -98, dir: 90, kind: 'joint', male: true },
    ],
  },
  // Separatory funnel: a socket for its stopper, two layers, a tap, a stem that pours into a mouth.
  // The layer line is where the left wall (a quadratic from (-2.5, -30) through (-24, -60) to
  // (-22, -95)) reaches y = -78: t = 0.75, x = -21.5.
  sepfunnel: {
    d: 'M-2.5 -26 L-2.5 -30 Q-24 -60 -22 -95 Q-20 -112 -6 -118 L-6 -126 L-7.5 -134'
      + ' M2.5 -26 L2.5 -30 Q24 -60 22 -95 Q20 -112 6 -118 L6 -126 L7.5 -134 M-21 -78 L21 -78'
      + ' M-9 -26 L9 -26 L9 -20 L-9 -20 Z M9 -23 L14 -23 M-2.5 -20 L-2.5 25 M2.5 -20 L2.5 25',
    box: { l: -24, t: -134, r: 24, b: 25 },
    joints: [
      { x: 0, y: 0, dir: 90, kind: 'stem', male: true },
      { x: 0, y: -134, dir: -90, kind: 'joint', male: false },
    ],
  },
  // Funnel: its stem goes into a mouth, a fluted filter paper sits in its cone.
  funnel: {
    d: 'M-3 25 L-3 -20 L-30 -55 M3 25 L3 -20 L30 -55',
    box: { l: -30, t: -55, r: 30, b: 25 },
    joints: [
      { x: 0, y: 0, dir: 90, kind: 'stem', male: true },
      { x: 0, y: -20, dir: -90, kind: 'paper', male: false },
    ],
  },
  filterpaper: {
    d: 'M0 0 L-22 -30 L-16 -33 L-11 -30 L-5 -33 L0 -30 L5 -33 L11 -30 L16 -33 L22 -30 Z M0 0 L-11 -30 M0 0 L0 -30 M0 0 L11 -30',
    box: { l: -22, t: -33, r: 22, b: 0 },
    joints: [{ x: 0, y: 0, dir: 90, kind: 'paper', male: true }],
  },
  // Büchner funnel: perforated plate, stem through a rubber cone that sits in the mouth of a filter flask.
  buchner: {
    d: 'M-3 20 L-3 -25 L-26 -40 L-26 -72 M3 20 L3 -25 L26 -40 L26 -72 M-12 -8 L12 -8 L8 8 L-8 8 Z'
      + [-24, -18, -12, -6, 0, 6, 12, 18].map((x) => ` M${x} -44 L${x + 4} -44`).join(''),
    box: { l: -26, t: -72, r: 26, b: 20 },
    joints: [{ x: 0, y: 0, dir: 90, kind: 'stem', male: true }],
  },
  // Filter flask: a conical flask with a hose nozzle; a stem goes into its mouth.
  filterflask: {
    d: 'M-9 -82 L-9 -60 L-32 -4 Q-33 0 -29 0 L29 0 Q33 0 32 -4 L9 -60 L9 -66 L28 -66'
      + ' M9 -82 L9 -74 L28 -74 M28 -77 L28 -63',
    box: { l: -33, t: -82, r: 28, b: 0 },
    joints: [
      { x: 0, y: 0, dir: 90, kind: 'base', male: true },
      { x: 0, y: -82, dir: -90, kind: 'stem', male: false },
    ],
  },
  // Basic glassware. Vessels stand on a flat base and take a stem (funnel, pipette, burette) in their mouth.
  beaker: {
    d: 'M-31 -72 L-28 -68 L-28 -3 Q-28 0 -25 0 L25 0 Q28 0 28 -3 L28 -70 M28 -20 L21 -20 M28 -35 L21 -35 M28 -50 L21 -50',
    box: { l: -31, t: -72, r: 28, b: 0 },
    joints: [
      { x: 0, y: 0, dir: 90, kind: 'base', male: true },
      { x: 0, y: -70, dir: -90, kind: 'stem', male: false },
    ],
  },
  erlenmeyer: {
    d: 'M-10 -84 L-8 -82 L-8 -58 L-32 -4 Q-33 0 -29 0 L29 0 Q33 0 32 -4 L8 -58 L8 -82 L10 -84',
    box: { l: -33, t: -84, r: 33, b: 0 },
    joints: [
      { x: 0, y: 0, dir: 90, kind: 'base', male: true },
      { x: 0, y: -82, dir: -90, kind: 'stem', male: false },
    ],
  },
  // Graduated cylinder: a foot, a spout, a mark every 10 units.
  cylinder: {
    d: 'M-20 0 L20 0 L14 -6 L-14 -6 Z M-9 -6 L-9 -130 L-12 -133 M9 -6 L9 -132'
      + [-20, -30, -40, -50, -60, -70, -80, -90, -100, -110, -120].map((y) => ` M9 ${y} L${y % 50 ? 5 : 2} ${y}`).join(''),
    box: { l: -20, t: -133, r: 20, b: 0 },
    joints: [
      { x: 0, y: 0, dir: 90, kind: 'base', male: true },
      { x: 0, y: -132, dir: -90, kind: 'stem', male: false },
    ],
  },
  testtube: {
    d: 'M-10 -102 L-8 -100 L-8 -8 A8 8 0 0 0 8 -8 L8 -100 L10 -102',
    box: { l: -10, t: -102, r: 10, b: 0 },
    joints: [{ x: 0, y: -100, dir: -90, kind: 'stem', male: false }],
  },
  // Volumetric pipette and burette: their tip goes into a mouth.
  pipette: {
    d: 'M-0.8 25 L-1.5 -40 Q-8 -45 -8 -65 Q-8 -85 -1.5 -90 L-1.5 -170 M0.8 25 L1.5 -40 Q8 -45 8 -65 Q8 -85 1.5 -90 L1.5 -170 M-4 -140 L4 -140',
    box: { l: -8, t: -170, r: 8, b: 25 },
    joints: [{ x: 0, y: 0, dir: 90, kind: 'stem', male: true }],
  },
  burette: {
    d: 'M-0.8 25 L-2 -8 L-2 -12 M0.8 25 L2 -8 L2 -12 M-8 -18 L8 -18 L8 -12 L-8 -12 Z M8 -15 L13 -15'
      + ' M-2 -18 L-2 -22 L-5 -27 L-5 -230 M2 -18 L2 -22 L5 -27 L5 -230'
      + [-50, -70, -90, -110, -130, -150, -170, -190, -210].map((y) => ` M-5 ${y} L-1 ${y}`).join(''),
    box: { l: -8, t: -230, r: 13, b: 25 },
    joints: [{ x: 0, y: 0, dir: 90, kind: 'stem', male: true }],
  },
  // Thiele tube (melting point): the side loop on the right, a thermometer from the top.
  thiele: {
    d: 'M-7.5 -110 L-6 -102 L-6 4 A6 6 0 0 0 6 4 L42 -8 L42 -48 L6 -78 L6 -102 L7.5 -110 M6 -66 L34 -42 L34 -12 L6 -6 Z',
    box: { l: -7.5, t: -110, r: 42, b: 10 },
    joints: [{ x: 0, y: -110, dir: -90, kind: 'joint', male: false }],
  },
  // Heating mantle: a cup that takes the bottom of a flask, and a knob.
  mantle: {
    d: 'M-30 0 L-42 0 L-42 44 Q-42 50 -36 50 L36 50 Q42 50 42 44 L42 0 L30 0 A30 30 0 0 1 -30 0 Z'
      + ' M28 40 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0',
    box: { l: -42, t: 0, r: 42, b: 50 },
    joints: [
      { x: 0, y: 28, dir: -90, kind: 'seat', male: false },
      { x: 0, y: 50, dir: 90, kind: 'base', male: true },
    ],
  },
  // Stirrer hotplate: a flat top that takes anything with a flat base, two knobs.
  stirrer: {
    d: 'M-48 0 L48 0 L48 6 L-48 6 Z M-44 6 L-44 34 Q-44 38 -40 38 L40 38 Q44 38 44 34 L44 6'
      + ' M-30 22 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M20 22 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0',
    box: { l: -48, t: 0, r: 48, b: 38 },
    joints: [{ x: 0, y: 0, dir: -90, kind: 'base', male: false }],
  },
  // Crystallising dish as an ice or water bath: a flat base, a flask sits on its floor.
  bath: {
    d: 'M-46 -42 L-44 -40 L-44 0 L44 0 L44 -40 L46 -42'
      + ' M-44 -28 Q-39 -31 -34 -28 Q-29 -25 -24 -28 M24 -28 Q29 -31 34 -28 Q39 -25 44 -28',
    box: { l: -46, t: -42, r: 46, b: 0 },
    joints: [
      { x: 0, y: 0, dir: 90, kind: 'base', male: true },
      { x: 0, y: -1, dir: -90, kind: 'seat', male: false },
    ],
  },
  // Retort stand and clamp: placed freely, the clamp's jaws around a neck, its boss on the rod.
  stand: {
    d: 'M-45 0 L45 0 L45 8 L-45 8 Z M-35 0 L-35 -278 Q-33 -282 -31 -278 L-31 0',
    box: { l: -45, t: -282, r: 45, b: 8 },
    joints: [],
  },
  clamp: {
    d: 'M-60 -3 L-16 -3 Q-16 -14 0 -14 Q10 -14 12 -9 M-60 3 L-16 3 Q-16 14 0 14 Q10 14 12 9'
      + ' M-72 -8 L-60 -8 L-60 8 L-72 8 Z M-66 -8 L-66 -14 M-69 -14 L-63 -14',
    box: { l: -72, t: -14, r: 12, b: 14 },
    joints: [],
  },
};

/** The pieces of each glassware tool, in the order of its option window. */
export const FAMILIES = {
  synthesis: ['flask', 'flask3', 'allihn', 'addfunnel', 'claisen', 'dryingtube', 'deanstark', 'stopper'],
  distillation: ['flask', 'vigreux', 'head', 'thermometer', 'liebig', 'adapter', 'vacadapter', 'soxhlet', 'rotavap'],
  separation: ['sepfunnel', 'funnel', 'filterpaper', 'buchner', 'filterflask'],
  glassware: ['beaker', 'erlenmeyer', 'cylinder', 'testtube', 'pipette', 'burette', 'thiele'],
  heating: ['mantle', 'stirrer', 'bath', 'stand', 'clamp'],
};

const SNAP = 15;
const PLACE = 40;
const SAME = 0.5;

/** Hundredths are enough, and keep the saved file readable. @param {number} v */
const r2 = (v) => Math.round(v * 100) / 100;
/** @param {number} a */
const norm = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
/** @param {{x: number, y: number}} v @param {number} deg */
const turnVec = (v, deg) => {
  const r = (deg * Math.PI) / 180;
  return { x: v.x * Math.cos(r) - v.y * Math.sin(r), y: v.x * Math.sin(r) + v.y * Math.cos(r) };
};

/** Where a piece's joints are in the drawing, and which way they face. @param {Piece} g @returns {WorldJoint[]} */
export function worldJoints(g) {
  return (PIECES[g.kind]?.joints ?? []).map((j) => ({ ...j, ...toWorld(g, j), dir: norm(j.dir + g.angle), piece: g.id }));
}

/** A point of a piece's own frame, in the drawing. @param {Piece} g @param {{x: number, y: number}} p */
export function toWorld(g, p) {
  const v = turnVec(p, g.angle);
  return { x: g.x + v.x, y: g.y + v.y };
}

/** Two joints that can fit together: same kind, other sex. @param {Joint} a @param {Joint} b */
const fits = (a, b) => a.kind === b.kind && a.male !== b.male;
/** Two joints fitted together: at the same spot, facing each other. @param {Joint} a @param {Joint} b */
const meet = (a, b) => fits(a, b) && Math.hypot(a.x - b.x, a.y - b.y) < SAME && Math.abs(norm(a.dir - b.dir + 180)) < 1;

/** The pieces joined to a piece, through joints that meet, itself included. @param {Doc} doc @param {string} id */
export function assembly(doc, id) {
  const joints = doc.apparatus.flatMap(worldJoints);
  const seen = new Set([id]);
  const todo = [id];
  while (todo.length) {
    const cur = todo.pop();
    for (const j of joints) {
      if (j.piece !== cur) continue;
      for (const k of joints) if (!seen.has(k.piece) && meet(j, k)) { seen.add(k.piece); todo.push(k.piece); }
    }
  }
  return seen;
}

/** Turns pieces by deg degrees about a point. @param {Doc} doc @param {Set<string>} ids @param {{x: number, y: number}} c @param {number} deg */
export function turn(doc, ids, c, deg) {
  c = { x: c.x, y: c.y }; // c may be one of the pieces turned
  for (const g of doc.apparatus) {
    if (!ids.has(g.id)) continue;
    const p = turnVec({ x: g.x - c.x, y: g.y - c.y }, deg);
    g.x = r2(c.x + p.x);
    g.y = r2(c.y + p.y);
    g.angle = r2(norm(g.angle + deg));
  }
}

/** Turns and moves pieces so that their joint `from` fits onto `to`. @param {Doc} doc @param {Set<string>} ids @param {Joint} from @param {Joint} to */
function fitOnto(doc, ids, from, to) {
  turn(doc, ids, from, norm(to.dir + 180 - from.dir));
  for (const g of doc.apparatus) if (ids.has(g.id)) { g.x = r2(g.x + to.x - from.x); g.y = r2(g.y + to.y - from.y); }
}

/** Joints of the other pieces that nothing else fits into yet. @param {Doc} doc @param {Set<string>} ids the pieces being placed */
function freeJoints(doc, ids) {
  const all = doc.apparatus.flatMap(worldJoints);
  return all.filter((j) => !ids.has(j.piece) && !all.some((k) => k.piece !== j.piece && !ids.has(k.piece) && meet(j, k)));
}

/**
 * Snaps pieces being dragged together: if one of their joints comes within 15 units of a free
 * joint it fits, they turn and move so the two meet. Returns whether they snapped.
 * @param {Doc} doc @param {Set<string>} ids
 */
export function snap(doc, ids) {
  const free = freeJoints(doc, ids);
  let best = null;
  let bestDist = SNAP;
  for (const m of doc.apparatus.filter((g) => ids.has(g.id)).flatMap(worldJoints)) {
    for (const f of free) {
      const dd = Math.hypot(m.x - f.x, m.y - f.y);
      if (fits(m, f) && dd < bestDist) { best = [m, f]; bestDist = dd; }
    }
  }
  if (best) fitOnto(doc, ids, best[0], best[1]);
  return !!best;
}

/**
 * Fits a piece just put down onto the free joint nearest the spot touched (within 40 units),
 * as when touching the neck of a flask with a condenser. Returns whether it fitted.
 * @param {Doc} doc @param {string} id @param {{x: number, y: number}} p
 */
export function place(doc, id, p) {
  const g = doc.apparatus.find((x) => x.id === id);
  if (!g) return false;
  const ids = new Set([id]);
  const own = worldJoints(g);
  const near = freeJoints(doc, ids)
    .filter((f) => own.some((m) => fits(m, f)))
    .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  if (!near || Math.hypot(near.x - p.x, near.y - p.y) > PLACE) return false;
  fitOnto(doc, ids, /** @type {Joint} */ (own.find((m) => fits(m, near))), near);
  return true;
}

/** The four corners of a piece's box, in the drawing. @param {Piece} g */
export function corners(g) {
  const b = PIECES[g.kind]?.box ?? { l: -10, t: -10, r: 10, b: 10 };
  return [[b.l, b.t], [b.r, b.t], [b.r, b.b], [b.l, b.b]].map(([x, y]) => toWorld(g, { x, y }));
}
