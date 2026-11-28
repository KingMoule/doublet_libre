// @ts-check
import { fr } from '../i18n/fr.js';
import * as M from '../model.js';
import { checkMechanism, checkSubstrate, named, parts, sameSet } from './check.js';
import { NET, outcome } from './reactions.js';

/**
 * What a mechanism exercise shows: the verdict on a drawing, with the first thing wrong and what to
 * outline, and the solution. Pure, so the editor only displays it.
 * @typedef {import('./generate.js').Item} Item
 * @typedef {{verdict: 'right' | 'wrong', title: string, lines: string[], ids: string[]}} Answer
 */

const X = fr.mechanism;
/** The molecules of a drawing, as graphs. @param {M.Doc} d */
const molecules = (d) => parts(d, d.atoms.map((a) => a.id)).map((m) => m.g);

/**
 * The conditions chosen for a Réactifs item: right when the reaction turns the alkene into the products given,
 * whichever reaction it is; otherwise what they would give.
 * @param {Item} item @param {string} picked a reaction of the table @returns {Answer}
 */
export function answerReagents(item, picked) {
  const out = outcome(item.substrate, picked);
  const { states } = M.regions(item.answer.doc);
  if (out && sameSet(molecules(out), parts(item.answer.doc, states[states.length - 1]).map((m) => m.g))) return { verdict: 'right', title: fr.exercise.right, lines: [], ids: [] };
  return { verdict: 'wrong', title: X.wrong, lines: [X.findings.otherConditions({ names: out ? named(out) : '' })], ids: [] };
}

/**
 * The reaction of the table whose products the student drew instead, on the same alkene (hydration for
 * hydroboration, KMnO₄ dilute for concentrated…), if there is one.
 * @param {Item} item @param {M.Doc} doc
 */
function otherReaction(item, doc) {
  const { states } = M.regions(doc);
  const drawn = parts(doc, states[states.length - 1]).map((m) => m.g);
  return Object.keys(NET).find((r) => {
    if (r === item.reaction) return false;
    const out = outcome(item.substrate, r, item.x || 'Br');
    return out && sameSet(drawn, molecules(out));
  });
}

/** The drawing against the expected mechanism: right, or the first thing wrong, said where it is. @param {Item} item @param {M.Doc} doc @returns {Answer} */
export function answerMechanism(item, doc) {
  const [f] = item.style === 'substrate' ? checkSubstrate(doc, item.answer, (d) => outcome(d, item.reaction)) : checkMechanism(doc, item.answer, item.steps);
  if (!f) return { verdict: 'right', title: fr.exercise.right, lines: [], ids: [] };
  const { states, steps } = M.regions(item.answer.doc);
  const product = f.at === 'state' && f.step === states.length - 1;
  // A wrong product that another reaction gives: that reaction is named, rather than what is wrong with it.
  const other = product && item.style === 'product' && f.code !== 'steps' ? otherReaction(item, doc) : undefined;
  const params = { ...f.params, reaction: item.reaction, last: product };
  const say = /** @type {Record<string, any>} */ (X.findings)[other ? 'otherReaction' : f.code];
  const text = other ? say({ ...params, other }) : typeof say === 'function' ? say(params) : say[/** @type {string} */ (f.role)](params);
  const where = f.code === 'steps' ? '' : f.at === 'step' ? X.step(f.step) : X.state(f.step, steps);
  return { verdict: 'wrong', title: X.wrong, lines: [where ? `${where} : ${text}` : text], ids: f.ids };
}

/** The whole mechanism, and how it goes, step by step; a global reaction in a sentence, and the way back to its alkene. @param {Item} item */
export function solution(item) {
  const { x, product, style, reaction } = item;
  const S = X.solution, cation = S.cations[item.cation];
  const net = NET[reaction];
  const short = style === 'product';
  const steps = reaction === 'hx' ? (short ? [S.hx.product(x, product)] : [S.hx.first(x, cation), S.hx.second(x, product)])
    : reaction === 'hydration' ? (short ? [S.hydration.product(product)] : [S.hydration.first(cation), S.hydration.second(), S.hydration.third(product)])
      : reaction === 'halogenation' ? (short ? [S.halogenation.product(x, product)] : [S.halogenation.first(x), S.halogenation.second(x, product)])
        : [/** @type {Record<string, any>} */ (S)[reaction](product),
          ...(style === 'substrate' ? [S.back[reaction === 'hydrogenation' ? 'any' : 'cut' in net ? 'cut' : 'add'](item.alkene)] : [])];
  return { doc: structuredClone(item.answer.doc), steps };
}
