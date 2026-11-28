// @ts-check
/** Element data and valence rules for the elements of organic chemistry. */

/** @type {Record<string, {valence: number, electrons: number, period: number}>} */
export const ELEMENTS = {
  H: { valence: 1, electrons: 1, period: 1 },
  B: { valence: 3, electrons: 3, period: 2 },
  C: { valence: 4, electrons: 4, period: 2 },
  N: { valence: 3, electrons: 5, period: 2 },
  O: { valence: 2, electrons: 6, period: 2 },
  F: { valence: 1, electrons: 7, period: 2 },
  Si: { valence: 4, electrons: 4, period: 3 },
  P: { valence: 3, electrons: 5, period: 3 },
  S: { valence: 2, electrons: 6, period: 3 },
  Cl: { valence: 1, electrons: 7, period: 3 },
  Br: { valence: 1, electrons: 7, period: 4 },
  I: { valence: 1, electrons: 7, period: 5 },
};

/** Keys typed while hovering an atom, as in ChemDraw. */
export const ELEMENT_KEYS = /** @type {Record<string, string>} */ ({
  c: 'C', n: 'N', o: 'O', s: 'S', f: 'F', p: 'P', h: 'H', b: 'Br', l: 'Cl', i: 'I', r: 'R',
});

/** Elements written with their hydrogens first when alone: H2O, H2S, HBr. */
export const H_FIRST = new Set(['O', 'S', 'F', 'Cl', 'Br', 'I']);

/**
 * Number of bonds (including implicit H) an atom makes with this charge.
 * N+ makes 4 (ammonium), O− makes 1 (alkoxide), C+ and C− make 3, B− makes 4.
 * @param {string} element @param {number} [charge]
 */
export function targetValence(element, charge = 0) {
  const e = ELEMENTS[element];
  if (!e) return 0;
  if (element === 'H') return Math.max(0, 1 - Math.abs(charge));
  if (e.electrons >= 5) return Math.max(0, e.valence + charge);
  if (e.electrons === 4) return Math.max(0, e.valence - Math.abs(charge));
  return Math.max(0, e.valence - charge);
}

/**
 * Hydrogens the atom carries implicitly (IUPAC GR-2.1.1: always written for heteroatoms).
 * @param {string} element @param {number} bondOrderSum @param {number} [charge] @param {number} [radicals]
 */
export function implicitHydrogens(element, bondOrderSum, charge = 0, radicals = 0) {
  if (!ELEMENTS[element]) return 0;
  return Math.max(0, targetValence(element, charge) - bondOrderSum - radicals);
}

/** @typedef {{text: string, mode: 'normal' | 'sub' | 'sup'}} Segment */

/**
 * Chemical text formatting: digits right after a symbol or a closing bracket become
 * subscripts (H2O → H₂O); "^" followed by digits or signs becomes a superscript (H3O^+).
 * @param {string} text
 * @returns {Segment[]}
 */
export function formatChem(text) {
  /** @type {Segment[]} */
  const out = [];
  /** @param {string} t @param {Segment['mode']} mode */
  const push = (t, mode) => {
    const last = out[out.length - 1];
    if (last && last.mode === mode) last.text += t;
    else out.push({ text: t, mode });
  };
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '^') {
      let j = i + 1;
      let s = '';
      while (j < text.length && /[0-9+\-−]/.test(text[j])) {
        s += text[j] === '-' ? '−' : text[j];
        j++;
      }
      if (s) {
        push(s, 'sup');
        i = j;
        continue;
      }
    }
    if (/[0-9]/.test(ch) && i > 0 && /[A-Za-z)\]]/.test(text[i - 1])) {
      let j = i;
      while (j < text.length && /[0-9]/.test(text[j])) j++;
      push(text.slice(i, j), 'sub');
      i = j;
      continue;
    }
    push(ch, 'normal');
    i++;
  }
  return out;
}
