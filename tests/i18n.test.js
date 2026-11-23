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
