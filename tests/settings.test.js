// Profile settings: their rows in the [Settings] tab, and syncing that tab.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as codec from '../src/lib/sync/codec.js';
import { emptyBase, runSync } from '../src/lib/sync/run.js';
import { SETTINGS_TAB, fakeDevice, fakeSheet, syncOptions, TABS } from './fakes.js';

describe('settings rows', () => {
  it('skip rows of sections MealCaster no longer reads (Have, Aisle) and unknown ones', () => {
    const read = codec.settingsFromRows([
      { Section: 'Have', Name: 'Rice', Value: 'TRUE' },
      { Section: 'Aisle', Name: 'Tofu', Value: 'Dairy & Eggs' },
      { Section: 'Theme', Name: 'Mode', Value: 'dark' },
    ]);
    assert.deepEqual(read, { tagColors: {}, returnToPlanner: true, weekStartDay: 6, schemaVersion: 0 });
  });
  it('are only the schema version, preferences and tag colours', () => {
    const sections = [...codec.settingsToRows({ tagColors: { Vegetarian: 'sage' } }).values()].map((r) => r.Section);
    assert.deepEqual(sections, ['Schema', 'Preference', 'Preference', 'Tag Colour']);
  });
  it('carry the return-to-planner preference as TRUE/FALSE, on by default', () => {
    const pref = (settings) => [...codec.settingsToRows(settings).values()].find((r) => r.Name === codec.RETURN_TO_PLANNER.Name);
    assert.equal(pref({}).Value, true);
    assert.equal(pref({ returnToPlanner: false }).Value, false);
    const row = (Value) => ({ ...codec.RETURN_TO_PLANNER, Value });
    assert.equal(codec.settingsFromRows([row('FALSE')]).returnToPlanner, false);
    assert.equal(codec.settingsFromRows([row(false)]).returnToPlanner, false);
    assert.equal(codec.settingsFromRows([row('no')]).returnToPlanner, false);
    assert.equal(codec.settingsFromRows([row('TRUE')]).returnToPlanner, true);
    // Missing or unreadable: the default.
    assert.equal(codec.settingsFromRows([]).returnToPlanner, true);
    assert.equal(codec.settingsFromRows([row('maybe')]).returnToPlanner, true);
  });
  it('are keyed by section and name, ignoring case', () => {
    assert.equal(codec.settingKey('Tag Colour', 'Date  Night'), codec.settingKey(' tag colour', 'date night'));
  });
});
describe('tag colour rows', () => {
  const tagColors = { 'Date Night': 'plum', Vegetarian: 'sage' };
  it('write one row per tag with the colour by name, and round-trip', () => {
    const rows = [...codec.settingsToRows({ tagColors }).values()].filter((r) => r.Section === 'Tag Colour');
    assert.deepEqual(rows, [
      { Section: 'Tag Colour', Name: 'Date Night', Value: 'Plum' },
      { Section: 'Tag Colour', Name: 'Vegetarian', Value: 'Sage' },
    ]);
    assert.deepEqual(codec.settingsFromRows(rows).tagColors, tagColors);
  });
  it('read names and colours in any case, keep the first row per tag, and skip unknown colours', () => {
    const { tagColors: read } = codec.settingsFromRows([
      { Section: 'tag colour', Name: '  date night ', Value: 'SAFFRON' },
      { Section: 'Tag Colour', Name: 'Date Night', Value: 'Plum' },
      { Section: 'Tag Colour', Name: 'Spicy', Value: 'Red' },
      { Section: 'Tag Colour', Name: '', Value: 'Sage' },
    ]);
    assert.deepEqual(read, { 'Date Night': 'saffron' });
  });
  it('default to none', () => {
    assert.deepEqual(codec.settingsFromRows([]).tagColors, {});
  });
});


describe('syncing the Settings tab', () => {
  const options = (sheet, device, base) => syncOptions(sheet, device, base, { tabs: [...TABS, SETTINGS_TAB] });

  it('creates the tab and writes the settings', async () => {
    const sheet = fakeSheet();
    const device = fakeDevice({ tagColors: { Vegetarian: 'sage' } });
    const result = await runSync(options(sheet, device, emptyBase('S1')));
    assert.equal(result.status, 'done');
    assert.deepEqual(sheet.find('Settings').grid[0], ['Section', 'Name', 'Value']);
    assert.deepEqual(sheet.column('Settings', 'Value'), [2, true, 'Saturday', 'Sage']);
  });

  it('brings tag colours added in the sheet to the device, and leaves rows it does not know alone', async () => {
    const sheet = fakeSheet();
    const device = fakeDevice({ tagColors: { Vegetarian: 'sage' } });
    const base = (await runSync(options(sheet, device, emptyBase('S1')))).base;

    const grid = sheet.find('Settings').grid;
    grid.push(['Tag Colour', 'Fish', 'Plum'], ['Have', 'Rice', 'TRUE']);
    const pull = await runSync(options(sheet, device, base));
    assert.equal(pull.status, 'done');
    assert.deepEqual(device.settings.tagColors, { Vegetarian: 'sage', Fish: 'plum' });

    // A later pass with no edits changes nothing and keeps the unknown row.
    const writes = sheet.calls.writes;
    const again = await runSync(options(sheet, device, pull.base));
    assert.equal(again.pushed, 0);
    assert.equal(sheet.calls.writes, writes);
    assert.deepEqual(sheet.column('Settings', 'Name').slice(2), ['Week starts on', 'Vegetarian', 'Fish', 'Rice']);
  });

  it('writes the schema version and reads the sheet version back without overwriting it', async () => {
    const sheet = fakeSheet();
    const device = fakeDevice({});
    const base = (await runSync(options(sheet, device, emptyBase('S1')))).base;
    const row = sheet.find('Settings').grid.find((r) => r[0] === 'Schema');
    assert.deepEqual(row, ['Schema', 'Version', 2]);
    assert.equal(codec.settingsFromRows([{ Section: 'Schema', Name: 'Version', Value: '2' }]).schemaVersion, 2);
    assert.equal(codec.settingsFromRows([]).schemaVersion, 0);
    assert.equal(codec.settingsFromRows([{ Section: 'Schema', Name: 'Version', Value: 'x' }]).schemaVersion, 0);
    row[2] = '2'; // typed as text: same version, kept as typed
    await runSync(options(sheet, device, base));
    assert.equal(sheet.find('Settings').grid.find((r) => r[0] === 'Schema')[2], '2');
  });

  it('carries the week start day as a weekday name, Saturday by default', () => {
    const row = (settings) => [...codec.settingsToRows(settings).values()].find((r) => r.Name === 'Week starts on');
    assert.equal(row({}).Value, 'Saturday');
    assert.equal(row({ weekStartDay: 1 }).Value, 'Monday');
    const read = (Value) => codec.settingsFromRows([{ ...codec.WEEK_STARTS_ON, Value }]).weekStartDay;
    assert.equal(read('Sunday'), 0);
    assert.equal(read('monday'), 1);
    assert.equal(read(' Wed '), 3);
    assert.equal(read('Someday'), 6);
    assert.equal(read(''), 6);
  });

  it('syncs the week start day both ways', async () => {
    const sheet = fakeSheet();
    const device = fakeDevice({ weekStartDay: 1 });
    const base = (await runSync(options(sheet, device, emptyBase('S1')))).base;
    const grid = sheet.find('Settings').grid;
    const sheetRow = grid.find((r) => r[1] === 'Week starts on');
    assert.equal(sheetRow[2], 'Monday');
    sheetRow[2] = 'Sunday';
    const pull = await runSync(options(sheet, device, base));
    assert.equal(device.settings.weekStartDay, 0);
    device.settings = { ...device.settings, weekStartDay: 3 };
    await runSync(options(sheet, device, pull.base));
    assert.equal(grid.find((r) => r[1] === 'Week starts on')[2], 'Wednesday');
  });

  it('syncs the return-to-planner preference both ways', async () => {
    const sheet = fakeSheet();
    const device = fakeDevice({ returnToPlanner: false });
    let base = (await runSync(options(sheet, device, emptyBase('S1')))).base;
    const returnRow = () => sheet.find('Settings').grid.find((r) => r[0] === 'Preference' && r[1].startsWith('Return'));
    assert.equal(returnRow()[2], false);

    returnRow()[2] = 'TRUE';
    const pull = await runSync(options(sheet, device, base));
    assert.equal(device.settings.returnToPlanner, true);

    device.settings = { ...device.settings, returnToPlanner: false };
    await runSync(options(sheet, device, pull.base));
    assert.equal(returnRow()[2], false);
  });

  it('pushes a tag colour changed or removed on the device', async () => {
    const sheet = fakeSheet();
    const device = fakeDevice({ tagColors: { Vegetarian: 'sage', Fish: 'plum' } });
    let base = (await runSync(options(sheet, device, emptyBase('S1')))).base;

    device.settings = { ...device.settings, tagColors: { Vegetarian: 'slate' } };
    base = (await runSync(options(sheet, device, base))).base;
    assert.deepEqual(sheet.column('Settings', 'Name').slice(2), ['Week starts on', 'Vegetarian']);
    assert.deepEqual(sheet.column('Settings', 'Value').slice(2), ['Saturday', 'Slate']);
  });
});
