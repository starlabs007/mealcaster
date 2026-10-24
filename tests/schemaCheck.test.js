import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeRows,
  appendSlots,
  appendUndecided,
  applyAutoAppend,
  needsRepair,
  pickColumn,
  repairedHeaderRow,
  resolutionAfterRepair,
  resolutionFromSaved,
  statusOf,
  suggestMapping,
  summarizeResolution,
  toSavedCheck,
} from '../src/lib/schemaCheck.js';
import { SCHEMA } from '../src/lib/schema.js';

const SETTINGS = ['Section', 'Name', 'Value'];
const mapping = (headers, autoAppendOptional = false) => suggestMapping('settings', headers, { autoAppendOptional });

describe('summarizeResolution', () => {
  it('counts conflicts, renamed and missing columns, and lists headers nothing matched', () => {
    const headers = ['Type', 'Setting', 'Value', 'Notes'];
    const s = summarizeResolution('settings', headers, mapping(headers));
    assert.deepEqual(s.statuses, { Section: 'suggested', Name: 'suggested', Value: 'bound' });
    assert.equal(s.conflicts, 2);
    assert.equal(s.renamed, 2);
    assert.equal(s.missing, 0);
    assert.equal(s.matched, 3);
    assert.deepEqual(s.extras, [{ header: 'Notes', index: 3 }]);
  });

  it('counts a missing required column as a conflict and skips blank headers in extras', () => {
    const headers = ['Section', 'Name', '', 'Other'];
    const s = summarizeResolution('settings', headers, mapping(headers));
    assert.equal(s.statuses.Value, 'missing');
    assert.equal(s.conflicts, 1);
    assert.equal(s.missing, 1);
    assert.deepEqual(s.extras, [{ header: 'Other', index: 3 }]);
  });

  it('an exact sheet has no conflicts', () => {
    const s = summarizeResolution('settings', SETTINGS, mapping(SETTINGS));
    assert.deepEqual([s.conflicts, s.missing, s.renamed, s.extras.length], [0, 0, 0, 0]);
  });
});

describe('analyzeRows', () => {
  it('reads the headers, trims them and drops trailing blanks', () => {
    const r = analyzeRows('settings', [[' Section ', 'Name', 'Value', '', ' ']], { autoAppendOptional: false });
    assert.equal(r.problem, null);
    assert.deepEqual(r.headers, ['Section', 'Name', 'Value']);
  });

  it('samples up to two data rows, padded to the header width and as strings', () => {
    const rows = [SETTINGS, ['a', 'b'], [1, 2, 3], ['x', 'y', 'z']];
    const r = analyzeRows('settings', rows, { autoAppendOptional: false });
    assert.deepEqual(r.rows, [['a', 'b', ''], ['1', '2', '3']]);
  });

  it('reports an empty first row', () => {
    assert.equal(analyzeRows('settings', [], { autoAppendOptional: false }).problem, 'firstRowEmpty');
    assert.equal(analyzeRows('settings', [['', ' ']], { autoAppendOptional: false }).problem, 'firstRowEmpty');
  });

  it('pasted rows that match nothing are not MealCaster rows, but rows read from the sheet are taken as they are', () => {
    const rows = [['Foo', 'Bar']];
    assert.equal(analyzeRows('settings', rows, { autoAppendOptional: false }).problem, 'notMealCaster');
    const loose = analyzeRows('settings', rows, { autoAppendOptional: false, strict: false });
    assert.equal(loose.problem, null);
    assert.equal(loose.resolution.Section.index, null);
  });

  it('auto-append marks unmatched optional columns only', () => {
    const r = analyzeRows('ingredients', [['Ingredient_ID', 'Name']], { autoAppendOptional: true });
    assert.equal(r.resolution.Plural.action, 'append');
    assert.equal(r.resolution.Ingredient_ID.action, null);
  });
});

describe('pickColumn', () => {
  const headers = ['Section', 'Type', 'Value'];

  it('picking a differently named column confirms it', () => {
    const next = pickColumn('settings', headers, mapping(headers), 'Name', '1');
    assert.deepEqual(next.Name, { index: 1, match: 'confirmed', score: 0, action: null });
  });

  it('picking a column named the same way marks it exact', () => {
    const blank = mapping(['x', 'y', 'z']);
    assert.equal(pickColumn('settings', headers, blank, 'Section', '0').Section.match, 'exact');
    assert.equal(pickColumn('settings', headers, blank, 'Value', '2').Value.match, 'exact');
  });

  it('a sheet column feeds one field: the previous field loses it', () => {
    const before = mapping(headers);
    assert.equal(before.Section.index, 0);
    const next = pickColumn('settings', headers, before, 'Name', '0');
    assert.equal(next.Name.index, 0);
    assert.deepEqual(next.Section, { index: null, match: null, score: before.Section.score, action: null });
  });

  it('choosing none clears the column, its match and its action', () => {
    const before = mapping(headers);
    const next = pickColumn('settings', headers, before, 'Section', '');
    assert.deepEqual([next.Section.index, next.Section.match, next.Section.action], [null, null, null]);
  });

  it('leaves the mapping it was given alone', () => {
    const before = mapping(headers);
    const copy = JSON.parse(JSON.stringify(before));
    pickColumn('settings', headers, before, 'Name', '0');
    assert.deepEqual(before, copy);
  });
});

describe('applyAutoAppend', () => {
  const headers = ['Ingredient_ID', 'Name'];
  const off = () => suggestMapping('ingredients', headers, { autoAppendOptional: false });

  it('on: undecided optional columns become append; required and matched ones do not', () => {
    const next = applyAutoAppend('ingredients', off(), true);
    assert.equal(next.Plural.action, 'append');
    assert.equal(next.Aisle.action, 'append');
    assert.equal(next.Name.action, null);
  });

  it('on: a column already ignored stays ignored', () => {
    const before = off();
    before.Plural.action = 'ignore';
    assert.equal(applyAutoAppend('ingredients', before, true).Plural.action, 'ignore');
  });

  it('off: clears append, keeps ignore', () => {
    const before = applyAutoAppend('ingredients', off(), true);
    before.Aisle.action = 'ignore';
    const next = applyAutoAppend('ingredients', before, false);
    assert.equal(next.Plural.action, null);
    assert.equal(next.Aisle.action, 'ignore');
  });

  it('a required column that is missing is never auto-appended', () => {
    const next = applyAutoAppend('settings', mapping(['Section']), true);
    assert.equal(next.Name.action, null);
  });
});

describe('repair', () => {
  it('appendUndecided adds every unmatched column with no decision, ignoring none and leaving matches', () => {
    const r = mapping(['Section', 'Name']);
    const next = appendUndecided('settings', r);
    assert.equal(next.Value.action, 'append');
    assert.equal(next.Section.action, null);
    r.Value.action = 'ignore';
    assert.equal(appendUndecided('settings', r).Value.action, 'ignore');
  });

  it('needsRepair: nothing to do when exact, or when the only gaps are ignored', () => {
    assert.equal(needsRepair('settings', mapping(SETTINGS)), false);
    const r = suggestMapping('ingredients', ['Ingredient_ID', 'Name'], { autoAppendOptional: false });
    for (const c of ['Plural', 'Aisle', 'On_Hand']) r[c].action = 'ignore';
    assert.equal(needsRepair('ingredients', r), false);
  });

  it('needsRepair: a renamed or a missing column needs it', () => {
    assert.equal(needsRepair('settings', mapping(['Type', 'Name', 'Value'])), true);
    assert.equal(needsRepair('settings', mapping(['Section', 'Name'])), true);
  });

  it('appendSlots puts appended columns after the last named one', () => {
    const r = appendUndecided('settings', mapping(['Section', 'Name']));
    assert.deepEqual(appendSlots('settings', 2, r), { Value: 'C' });
    const none = mapping(['Foo']);
    assert.deepEqual(appendSlots('settings', 1, appendUndecided('settings', none)), { Section: 'B', Name: 'C', Value: 'D' });
    assert.deepEqual(appendSlots('settings', 1, none), {});
  });

  it('resolutionAfterRepair reads the repaired row afresh and keeps ignored columns', () => {
    const before = suggestMapping('ingredients', ['ID', 'Ingredient'], { autoAppendOptional: false });
    before.Aisle.action = 'ignore';
    const row = repairedHeaderRow('ingredients', ['ID', 'Ingredient'], appendUndecided('ingredients', before));
    const after = resolutionAfterRepair('ingredients', row, before, false);
    assert.equal(statusOf(after.Ingredient_ID), 'bound');
    assert.equal(statusOf(after.Plural), 'bound');
    assert.equal(statusOf(after.Aisle), 'ignored');
  });
});

describe('saved checks', () => {
  const headers = ['Type', 'Name', 'Value', 'Notes'];

  it('toSavedCheck stores header names for matches, and the append and ignore lists', () => {
    const r = suggestMapping('ingredients', ['ID', 'Ingredient'], { autoAppendOptional: false });
    r.Plural.action = 'append';
    r.Aisle.action = 'ignore';
    const saved = toSavedCheck('ingredients', { headers: ['ID', 'Ingredient'], rows: [['a', 'b']], resolution: r }, 'T');
    assert.deepEqual(saved.map, { Ingredient_ID: 'ID', Name: 'Ingredient', Plural: null, Aisle: null, On_Hand: null });
    assert.deepEqual(saved.append, ['Plural']);
    assert.deepEqual(saved.ignore, ['Aisle']);
    assert.equal(saved.checkedAt, 'T');
  });

  it('toSavedCheck cuts long sample cells to 160 characters', () => {
    const saved = toSavedCheck('settings', { headers: SETTINGS, rows: [['x'.repeat(200), '', '']], resolution: mapping(SETTINGS) }, 'T');
    assert.equal(saved.sample[0][0].length, 160);
  });

  it('what is saved comes back as the same mapping, with a changed name counted as confirmed', () => {
    const r = pickColumn('settings', headers, mapping(headers), 'Section', '0');
    const saved = toSavedCheck('settings', { headers, rows: [], resolution: r }, 'T');
    const back = resolutionFromSaved('settings', saved);
    assert.deepEqual(
      Object.fromEntries(SCHEMA.settings.map((c) => [c, [back[c].index, back[c].match]])),
      { Section: [0, 'confirmed'], Name: [1, 'exact'], Value: [2, 'exact'] },
    );
  });

  it('a header that is no longer in the saved row comes back unmatched, with its saved action', () => {
    const saved = { headers: ['Section'], map: { Section: 'Section', Name: 'Gone', Value: null }, append: ['Value'], ignore: [] };
    const back = resolutionFromSaved('settings', saved);
    assert.deepEqual(back.Name, { index: null, match: null, score: 0, action: null });
    assert.equal(back.Value.action, 'append');
    assert.equal(back.Section.match, 'exact');
  });
});
