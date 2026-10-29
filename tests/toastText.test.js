// Tests for recipe titles inside toast messages (src/lib/toastText.js).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toastTitle, toastPlain, longestTitle, shortenTitle, fitTitles, fitToast } from '../src/lib/toastText.js';
import { text } from '../src/lib/text.js';

const LAMB = 'Slow-Roasted Garlic & Rosemary Lamb Shoulder with Crispy Smashed Potatoes';

describe('recipe titles in toasts', () => {
  it('shortens a title at a word, without a dangling joiner', () => {
    assert.equal(shortenTitle('Pho', 10), 'Pho');
    assert.equal(shortenTitle(LAMB, 25), 'Slow-Roasted Garlic…', '"&" goes before the cut');
    assert.equal(shortenTitle(LAMB, 49), 'Slow-Roasted Garlic & Rosemary Lamb Shoulder…', '"with" goes too');
    assert.equal(shortenTitle(LAMB, 5), 'Slow-Roasted…', 'the first word stays whole');
    assert.equal(shortenTitle('Bouillabaisse', 3), 'Bouillabaisse', 'a one-word title stays whole');
    assert.equal(shortenTitle('Phở, Bún and Chả', 9), 'Phở, Bún…');
  });

  it('shortens every title in a message and drops the marks', () => {
    const message = `Tue: ${toastTitle(LAMB)} marked done. ${toastTitle('Pho Bo Tai')} needs notice`;
    assert.equal(longestTitle(message), LAMB.length);
    assert.equal(longestTitle('Cleared Tue.'), 0);
    assert.equal(fitTitles(message, 6), 'Tue: Slow-Roasted… marked done. Pho Bo… needs notice');
    assert.equal(toastPlain(message), `Tue: ${LAMB} marked done. Pho Bo Tai needs notice`);
  });

  it('keeps the whole message when it fits, and otherwise the longest titles that fit', () => {
    const message = `${toastTitle(LAMB)} planned for Wednesday, Oct 28.`;
    assert.equal(fitToast(message, () => true), `${LAMB} planned for Wednesday, Oct 28.`);
    const within = (n) => (t) => t.length <= n;
    const shown = fitToast(message, within(60));
    assert.ok(shown.length <= 60, shown);
    assert.ok(shown.endsWith('… planned for Wednesday, Oct 28.'), shown);
    assert.ok(fitToast(message, within(75)).length > shown.length, 'more room, more of the title');
    assert.equal(fitToast(message, () => false), fitTitles(message, 1), 'nothing fits: shortest titles');
    assert.equal(fitToast('Cleared Tue.', () => false), 'Cleared Tue.', 'no title: left whole');
  });

  it('marks a title once, even when it is already marked', () => {
    const surprise = text.planner.toasts.surprise('Pho');
    assert.equal(toastTitle(surprise), surprise);
    const added = text.catalog.toasts.added(surprise, 'Wednesday, Oct 28');
    assert.equal(fitTitles(added, 2), 'Surprise! Pho added to Wednesday, Oct 28 dinner and your grocery basket was updated.');
  });

  it('marks the title in every toast that names a recipe', () => {
    const titled = [
      text.recipe.toasts.planned('Pho', 'Wed'),
      text.recipe.toasts.deleted('Pho'),
      text.recipe.toasts.addedFromRecipe(2, 'Pho'),
      text.editor.toasts.added('Pho'),
      text.planner.toasts.surpriseOn('Wed', 'Pho'),
      text.planner.toasts.filledOne('Wed', 'Pho'),
      text.planner.toasts.assigned('Wed', 'Pho'),
      text.planner.toasts.markedDone('Wed', 'Pho'),
      text.planner.toasts.markedNotDone('Wed', 'Pho'),
      text.common.headsUps.tooSoon('Pho', 1, 'Soak'),
    ];
    for (const message of titled) assert.equal(longestTitle(message), 3, toastPlain(message));
  });
});
