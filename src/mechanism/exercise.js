// @ts-check
import { fr } from '../i18n/fr.js';
import * as M from '../model.js';
import { checkMechanism } from './check.js';

/**
 * What a mechanism exercise shows: the verdict on a drawing, with the first thing wrong and what to
 * outline, and the solution. Pure, so the editor only displays it.
 * @typedef {import('./generate.js').Item} Item
 * @typedef {{verdict: 'right' | 'wrong', title: string, lines: string[], ids: string[]}} Answer
 */

const X = fr.mechanism;

/** The drawing against the expected mechanism: right, or the first thing wrong, said where it is. @param {Item} item @param {import('../model.js').Doc} doc @returns {Answer} */
export function answerMechanism(item, doc) {
  const [f] = checkMechanism(doc, item.answer, item.steps);
  if (!f) return { verdict: 'right', title: fr.exercise.right, lines: [], ids: [] };
  const say = /** @type {Record<string, any>} */ (X.findings)[f.code];
  const text = typeof say === 'function' ? say(f.params) : say[/** @type {string} */ (f.role)](f.params);
  const last = M.regions(item.answer.doc).arrows.length;
  const where = f.code === 'steps' ? '' : f.at === 'step' ? X.step(f.step) : X.state(f.step, last);
  return { verdict: 'wrong', title: X.wrong, lines: [where ? `${where} : ${text}` : text], ids: f.ids };
}

/** The whole mechanism, and how it goes, step by step. @param {Item} item */
export function solution(item) {
  const { x, product, cation } = item;
  const steps = item.style === 'product' ? [X.solution.product(x, product)] : [X.solution.first(x, X.solution.cations[cation]), X.solution.second(x, product)];
  return { doc: structuredClone(item.answer.doc), steps };
}
