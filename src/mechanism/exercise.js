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
  const { x, product, style } = item;
  const S = X.solution, cation = S.cations[item.cation];
  const steps = item.reaction === 'hx'
    ? (style === 'product' ? [S.hx.product(x, product)] : [S.hx.first(x, cation), S.hx.second(x, product)])
    : (style === 'product' ? [S.hydration.product(product)] : [S.hydration.first(cation), S.hydration.second(), S.hydration.third(product)]);
  return { doc: structuredClone(item.answer.doc), steps };
}
