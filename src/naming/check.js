// @ts-check
/**
 * Checks a name typed by a student against the expected names and the wrong ones (namer.wrongNames).
 * Case, spaces and a final period do not count. A right name without its accents, or with its commas
 * and hyphens off, still counts, with a remark (SPEC, Exercices de nomenclature); so does an accepted
 * name that carries its own remark, such as the systematic name of a toluène.
 * @typedef {'accents' | 'commas' | 'hyphens' | 'punctuation' | 'retained'} Remark keys of fr.naming.remarks
 * @typedef {{verdict: 'right' | 'wrong' | 'empty', remarks: Remark[], rule?: string}} Check
 */

/** @param {string} s */
const norm = (s) => s.normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[‐‑‒–—−]/g, '-')
  .replace(/\s+/g, ' ').trim().replace(/\.$/, '').replace(/\s*([-,'])\s*/g, '$1');
/** @param {string} s */
const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
// The same letters and numbers in the same order, whatever separates them; a digit next to a letter is a break.
/** @param {string} s */
const bare = (s) => s.replace(/(\d)(?=\D)/g, '$1 ').replace(/(\D)(?=\d)/g, '$1 ').replace(/[\s,'-]+/g, '|');

/** Which writing rule a name breaks (2.5.1): commas between numbers, hyphens between numbers and letters. @param {string} t @returns {Remark} */
const punctuation = (t) => (/\d-\d/.test(t) ? 'commas' : /\d[^\d,'-]|[^\d,'\s-]\d|\d,\D/.test(t) ? 'hyphens' : 'punctuation');

/**
 * @param {string} typed @param {(string | {name: string, remark?: Remark})[]} accepted the expected name first, then the other accepted ones
 * @param {{name: string, rule: string}[]} [wrong] @returns {Check}
 */
export function checkName(typed, accepted, wrong = []) {
  const t = norm(typed);
  if (!t) return { verdict: 'empty', remarks: [] };
  /** @type {{name: string, rule: string, remark?: Remark}[]} */
  const targets = [
    ...accepted.map((a) => (typeof a === 'string' ? { name: norm(a), rule: '' } : { name: norm(a.name), rule: '', remark: a.remark })),
    ...wrong.map((w) => ({ name: norm(w.name), rule: w.rule })),
  ];
  /** @param {{name: string, rule: string, remark?: Remark}} m @param {Remark[]} remarks @returns {Check} */
  const verdict = (m, remarks) => (m.rule ? { verdict: 'wrong', remarks: [], rule: m.rule } : { verdict: 'right', remarks: m.remark ? [m.remark, ...remarks] : remarks });
  let m = targets.find((x) => x.name === t);
  if (m) return verdict(m, []);
  m = targets.find((x) => plain(x.name) === plain(t));
  if (m) return verdict(m, ['accents']);
  m = targets.find((x) => bare(plain(x.name)) === bare(plain(t)));
  if (m) return verdict(m, bare(m.name) === bare(t) ? [punctuation(t)] : [punctuation(t), 'accents']);
  return { verdict: 'wrong', remarks: [] };
}
