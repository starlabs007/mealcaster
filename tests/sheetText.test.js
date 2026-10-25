// Pins every value in sheetText.js to its literal. These strings are stored in the household's sheet and parsed back
// by sync/codec.js, so changing one is a data migration, not a wording edit. If a test here fails, read the comment at
// the top of src/lib/sheetText.js before updating it.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as t from '../src/lib/sheetText.js';
import { aisles } from '../src/lib/data/aisles.js';
import { departments } from '../src/lib/data/departments.js';
import { parseStatus, parseDept, parseAisle, parseWeekday } from '../src/lib/sync/codec.js';
import { TONES } from '../src/lib/tags.js';
import { COLUMN_INFO } from '../src/lib/schemaCheck.js';

const HINT = ' (sheet text changed: see the comment at the top of src/lib/sheetText.js)';

describe('sheetText', () => {
  it('grocery Status values', () => {
    assert.deepEqual(t.status, { onHand: 'On hand', bought: 'Bought', toBuy: 'To buy', skipped: 'Skipped' }, HINT);
  });

  it('Status patterns read each written value back', () => {
    assert.equal(parseStatus(t.status.onHand), 'owned', HINT);
    assert.equal(parseStatus(t.status.bought), 'bought', HINT);
    assert.equal(parseStatus(t.status.toBuy), 'need', HINT);
    assert.equal(parseStatus(t.status.skipped), 'skipped', HINT);
    assert.equal(parseStatus('In pantry'), 'owned');
    assert.equal(String(t.statusPatterns.bought), String(/^(bought|done|got|checked|true|x|✓)/), HINT);
    assert.equal(String(t.statusPatterns.skipped), String(/^skip/), HINT);
    assert.equal(String(t.statusPatterns.owned), String(/on hand|pantry|owned|have|stock/), HINT);
  });

  it('[Settings] rows', () => {
    assert.deepEqual(t.returnToPlannerRow, { Section: 'Preference', Name: 'Return to planner after choosing a meal' }, HINT);
    assert.deepEqual(t.schemaVersionRow, { Section: 'Schema', Name: 'Version' }, HINT);
    assert.deepEqual(t.weekStartsOnRow, { Section: 'Preference', Name: 'Week starts on' }, HINT);
    assert.equal(t.tagColourSection, 'Tag Colour', HINT);
  });

  it('weekday names', () => {
    assert.deepEqual(t.weekdays, ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], HINT);
    t.weekdays.forEach((d, i) => assert.equal(parseWeekday(d), i, HINT));
  });

  it('tag colour names', () => {
    assert.deepEqual(t.tagColourNames, { saffron: 'Saffron', sage: 'Sage', paprika: 'Paprika', slate: 'Slate', plum: 'Plum' }, HINT);
    assert.deepEqual(Object.keys(t.tagColourNames), TONES, 'every tone in tags.js has a name');
    assert.equal(t.tagColourName('sage'), 'Sage');
    assert.equal(t.tagColourName('other'), 'Other');
  });

  it('aisle tags and labels', () => {
    assert.deepEqual(
      t.aisleText.map((a) => [a.tag, a.label]),
      [
        ['Produce', 'Produce'],
        ['Herbs', 'Herbs'],
        ['Fresh', 'Meat & Seafood'],
        ['Dairy', 'Dairy & Eggs'],
        ['Refrigerated', 'Refrigerated'],
        ['Pantry', 'Pantry'],
        ['Noodles', 'Noodles & Rice'],
        ['Sauces', 'Sauces & Condiments'],
        ['Spices', 'Spices'],
        ['Bakery', 'Bakery'],
        ['Frozen', 'Frozen'],
        ['Other', 'Other'],
      ],
      HINT,
    );
    assert.equal(aisles, t.aisleText);
    for (const a of aisles) {
      assert.equal(parseAisle(a.tag), a.tag, HINT);
      assert.equal(parseAisle(a.label), a.tag, HINT);
    }
  });

  it('department labels and short names', () => {
    assert.deepEqual(
      t.departmentText,
      {
        produce: { label: 'Fresh Produce & Herbs', short: 'Produce' },
        meat: { label: 'Meat & Fresh Seafood', short: 'Seafood & Meat' },
        dairy: { label: 'Dairy & Refrigerated', short: 'Dairy' },
        pantry: { label: 'Pantry, Grains & Spices', short: 'Pantry' },
        other: { label: 'Other Items', short: 'Other' },
      },
      HINT,
    );
    for (const d of departments) {
      assert.equal(d.label, t.departmentText[d.id].label);
      assert.equal(d.short, t.departmentText[d.id].short);
      assert.equal(parseDept(d.short), d.id, HINT);
      assert.equal(parseDept(d.label), d.id, HINT);
    }
  });

  it('defaults written to the sheet', () => {
    assert.equal(t.defaultGroupTitle, 'Ingredients', HINT);
    assert.equal(t.groupCategory(1), '1 item', HINT);
    assert.equal(t.groupCategory(0), '0 items', HINT);
    assert.equal(t.groupCategory(5), '5 items', HINT);
    assert.equal(t.flatGroupCategory(1), '1 items', HINT);
    assert.equal(t.flatGroupCategory(5), '5 items', HINT);
    assert.equal(t.sourceAddedByYou, 'Added by you', HINT);
    assert.equal(t.sourceEveryWeek, 'Every week', HINT);
    assert.equal(t.sourceDinner('Mon', 'Pasta'), 'Mon: Pasta', HINT);
    assert.equal(t.detailOptional, 'optional', HINT);
    assert.equal(t.untitledRecipe, 'Untitled recipe', HINT);
    assert.equal(t.diningOutNote, 'Dining out', HINT);
    assert.equal(t.defaultIngredientGroup, 'Main', HINT);
    assert.equal(t.defaultStepTitle(3), 'Step 3', HINT);
    assert.equal(t.defaultAisle, 'Pantry', HINT);
    assert.equal(t.defaultDepartmentShort, 'Pantry', HINT);
  });

  it('heads-up keys (Heads_Up_JSON cell)', () => {
    assert.deepEqual(t.headsUpKeys, { text: 'text', daysBefore: 'daysBefore' }, HINT);
    assert.ok(COLUMN_INFO.recipes.Heads_Up_JSON.note.includes(`"${t.headsUpKeys.daysBefore}"`), HINT);
  });

  it('column help in Column Conflicts quotes the same sheet values', () => {
    const { provisions, settings } = COLUMN_INFO;
    assert.ok(provisions.Status.note.includes(`${t.status.toBuy} or ${t.status.bought}. ${t.status.skipped}`), HINT);
    assert.ok(provisions.Source.note.includes(t.sourceAddedByYou) && provisions.Source.note.includes(t.sourceEveryWeek), HINT);
    assert.ok(settings.Name.note.includes(t.weekStartsOnRow.Name) && settings.Section.note.includes(t.returnToPlannerRow.Section), HINT);
  });
});
