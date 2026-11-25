// @ts-check
import { fr } from '../i18n/fr.js';
import * as M from '../model.js';
import { add, angleOf, fromAngle, nextBondAngle, sub } from '../geometry.js';
import { checkName } from './check.js';
import { sameMolecule, toGraph } from './graph.js';
import { NamingError, nameOf, spell } from './namer.js';

/**
 * What the Exercice mode shows: the verdict on an answer, typed or drawn, and the solution.
 * Pure, so the editor only displays it.
 * @typedef {import('./generate.js').Item} Item
 * @typedef {{verdict: 'right' | 'wrong' | 'empty', title: string, lines: string[]}} Answer
 */

const X = fr.exercise;
const N = fr.naming;

/** A typed name: right, right with remarks on its writing, or wrong with the rule it breaks. @param {Item} item @param {string} typed @returns {Answer} */
export function answerName(item, typed) {
  const c = checkName(typed, [item.name, ...item.naming.also], item.wrong);
  if (c.verdict === 'empty') return { verdict: 'empty', title: X.emptyName, lines: [] };
  if (c.verdict === 'right') {
    const remarks = c.remarks.map((r) => N.remarks[r]);
    return remarks.length ? { verdict: 'right', title: X.remark, lines: [...remarks, X.write(item.name)] } : { verdict: 'right', title: X.right, lines: [] };
  }
  if (c.rule) return { verdict: 'wrong', title: X.wrongRule, lines: [/** @type {Record<string, string>} */ (N.rules)[c.rule]] };
  return { verdict: 'wrong', title: X.wrong, lines: [X.tryAgain] };
}

/** A drawing: the molecule asked for, wherever and however it is drawn; otherwise what was drawn. @param {Item} item @param {M.Doc} doc @returns {Answer} */
export function answerDrawing(item, doc) {
  const g = toGraph(doc);
  if (!g.atoms.length) return { verdict: 'empty', title: X.emptyDraw, lines: [] };
  const target = toGraph(item.doc);
  if (sameMolecule(g, target)) return { verdict: 'right', title: X.right, lines: [X.drawnRight(item.name)] };
  const lines = [];
  try { lines.push(X.yourDrawing(nameOf(g).name)); } catch (e) { if (!(e instanceof NamingError)) throw e; }
  const count = (/** @type {import('./graph.js').Graph} */ x, /** @type {boolean} */ carbon) => x.atoms.filter((a) => (a.el === 'C') === carbon).length;
  if (count(g, true) !== count(target, true)) lines.push(X.carbons(count(g, true), count(target, true)));
  else if (count(g, false) !== count(target, false)) lines.push(X.others);
  else if ([2, 3].some((o) => g.bonds.filter((b) => b.order === o).length !== target.bonds.filter((b) => b.order === o).length)) lines.push(X.doubles);
  else lines.push(X.place);
  return { verdict: 'wrong', title: X.drawnWrong, lines };
}

/**
 * The solution: the molecule with its parent chain numbered beside each atom, in the free direction,
 * and how the name is built.
 * @param {Item} item
 */
export function solution(item) {
  const doc = structuredClone(item.doc);
  item.parentIds.forEach((id, k) => {
    const a = /** @type {M.Atom} */ (M.findAtom(doc, id));
    const angles = doc.bonds.filter((b) => b.a === id || b.b === id).map((b) => angleOf(sub(/** @type {M.Atom} */ (M.findAtom(doc, b.a === id ? b.b : b.a)), a)));
    M.addText(doc, { ...add(a, fromAngle(nextBondAngle(angles), 17)), text: String(k + 1), size: 11 });
  });
  const { ring, prefixes, parent, doubles, triples, ols, word } = item.naming;
  const n = parent.length;
  const why = ols.length ? 'principal' : doubles.length + triples.length ? 'multiples' : 'longest';
  const steps = [
    word && word !== N.benzene ? X.steps.retained(N.retained.find((r) => r.word === word)?.group ?? '', word)
      : X.steps.parent(ring, n, spell([], n, ring, doubles, triples, word), why),
    ...(ols.length ? [X.steps.alcohol(ols)] : []),
    prefixes.length ? X.steps.prefixes(prefixes.map((p) => X.steps.at(p.name, p.locants)).join(', ')) : X.steps.none,
    X.steps.name(item.name),
  ];
  return { doc, steps };
}
