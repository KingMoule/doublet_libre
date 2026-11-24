import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fr } from '../src/i18n/fr.js';

// The panel explains the chosen tool in a few numbered steps, instead of one long sentence in the help line.
test('every tool explains itself in two or three steps', () => {
  for (const key of [...Object.keys(fr.tools), 'selectSetup', 'selectTouch']) {
    const steps = /** @type {Record<string, string[]>} */ (fr.steps ?? {})[key];
    assert.ok(Array.isArray(steps) && steps.length >= 2 && steps.length <= 3, `${key}: ${steps?.length ?? 'aucune'} étapes`);
  }
});

// In Montage mode the panel counts what that mode draws: pieces and texts, not atoms.
test('the panel counts pieces and texts in Montage mode', () => {
  const d = { apparatus: [{}, {}, {}], texts: [{}] };
  assert.equal(fr.panel.setupCounts?.(d), '3 pièces · 1 texte');
});

// The option window and the panel show a piece by its name, never by its internal kind.
test('every piece of glassware has a name', async () => {
  const { PIECES } = await import('../src/apparatus.js');
  for (const kind of Object.keys(PIECES)) assert.ok(/** @type {Record<string, string>} */ (fr.pieceNames)[kind], kind);
});
