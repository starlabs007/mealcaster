// Profile settings: the aisle mappings, their rows in the [Settings] tab, and syncing that tab.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findAisleMapping, withMapping } from '../src/lib/aisleMap.js';
import * as codec from '../src/lib/sync/codec.js';
import { emptyBase, runSync } from '../src/lib/sync/run.js';
import { SETTINGS_TAB, fakeDevice, fakeSheet, syncOptions, TABS } from './fakes.js';

describe('aisle mappings', () => {
  const mappings = [
    { name: 'Oat milk', tag: 'Pantry' },
    { name: 'milk', tag: 'Dairy' },
    { name: 'Quinoa', tag: 'Pantry' },
  ];
  it('matches a name inside an ingredient, whatever the case or plural', () => {
    assert.equal(findAisleMapping(mappings, '2 cups quinoa'), 'Pantry');
    assert.equal(findAisleMapping(mappings, 'Quinoas'), 'Pantry');
    assert.equal(findAisleMapping(mappings, '  OAT   MILK '), 'Pantry');
  });
  it('lets the longest matching name win', () => {
    assert.equal(findAisleMapping(mappings, 'oat milk, unsweetened'), 'Pantry');
    assert.equal(findAisleMapping(mappings, 'whole milk'), 'Dairy');
  });
  it('matches whole words only, and nothing in an empty list', () => {
    assert.equal(findAisleMapping(mappings, 'milkshake'), undefined);
    assert.equal(findAisleMapping([], 'quinoa'), undefined);
    assert.equal(findAisleMapping(mappings, ''), undefined);
  });
  it('treats regex characters in a name literally', () => {
    assert.equal(findAisleMapping([{ name: 'c++ (spicy)', tag: 'Other' }], 'c++ (spicy)'), 'Other');
    assert.equal(findAisleMapping([{ name: 'a.b', tag: 'Other' }], 'axb'), undefined);
  });
  it('replaces a mapping with the same name instead of duplicating it', () => {
    const next = withMapping(mappings, '  quinoa ', 'Produce');
    assert.equal(next.filter((m) => m.name.toLowerCase() === 'quinoa').length, 1);
    assert.equal(findAisleMapping(next, 'quinoa'), 'Produce');
  });
});

describe('settings rows', () => {
  const aisles = [
    { name: 'Oat milk', tag: 'Dairy' },
    { name: 'Chicken stock', tag: 'Fresh' },
  ];
  it('write the aisle by its name in the editor', () => {
    const rows = [...codec.settingsToRows({ aisles }).values()].filter((r) => r.Section === 'Aisle');
    assert.deepEqual(rows, [
      { Section: 'Aisle', Name: 'Oat milk', Value: 'Dairy & Eggs' },
      { Section: 'Aisle', Name: 'Chicken stock', Value: 'Meat & Seafood' },
    ]);
  });
  it('round-trip', () => {
    const back = codec.settingsFromRows([...codec.settingsToRows({ aisles }).values()]);
    assert.deepEqual(back.aisles, aisles);
  });
  it('read an aisle tag or label in any case, and skip unknown sections and values', () => {
    const { aisles: read } = codec.settingsFromRows([
      { Section: 'aisle', Name: 'Tofu', Value: 'dairy & eggs' },
      { Section: 'Aisle', Name: 'Salt', Value: 'SPICES' },
      { Section: 'Aisle', Name: 'Mystery', Value: 'Aisle 9' },
      { Section: 'Aisle', Name: '', Value: 'Pantry' },
      { Section: 'Theme', Name: 'Mode', Value: 'dark' },
    ]);
    assert.deepEqual(read, [
      { name: 'Tofu', tag: 'Dairy' },
      { name: 'Salt', tag: 'Spices' },
    ]);
  });
  it('carry the return-to-planner preference as TRUE/FALSE, on by default', () => {
    const pref = (settings) => [...codec.settingsToRows(settings).values()].find((r) => r.Section === 'Preference');
    assert.equal(pref({ aisles: [] }).Value, true);
    assert.equal(pref({ aisles: [], returnToPlanner: false }).Value, false);
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
    assert.equal(codec.settingKey('Aisle', 'Oat  Milk'), codec.settingKey(' aisle', 'oat milk'));
  });
});

describe('syncing the Settings tab', () => {
  const options = (sheet, device, base) => syncOptions(sheet, device, base, { tabs: [...TABS, SETTINGS_TAB] });

  it('creates the tab and writes the mappings', async () => {
    const sheet = fakeSheet();
    const device = fakeDevice({ aisles: [{ name: 'Oat milk', tag: 'Dairy' }] });
    const result = await runSync(options(sheet, device, emptyBase('S1')));
    assert.equal(result.status, 'done');
    assert.deepEqual(sheet.find('Settings').grid[0], ['Section', 'Name', 'Value']);
    assert.deepEqual(sheet.column('Settings', 'Value'), [true, 'Dairy & Eggs']);
  });

  it('brings mappings added in the sheet to the device, and leaves rows it does not know alone', async () => {
    const sheet = fakeSheet();
    const device = fakeDevice({ aisles: [{ name: 'Oat milk', tag: 'Dairy' }] });
    let base = (await runSync(options(sheet, device, emptyBase('S1')))).base;

    const grid = sheet.find('Settings').grid;
    grid.push(['Aisle', 'Quinoa', 'Pantry'], ['Theme', 'Mode', 'dark']);
    const pull = await runSync(options(sheet, device, base));
    assert.equal(pull.status, 'done');
    assert.deepEqual(device.settings.aisles.map((m) => m.name), ['Oat milk', 'Quinoa']);

    // A later pass with no edits changes nothing and keeps the unknown row.
    const writes = sheet.calls.writes;
    const again = await runSync(options(sheet, device, pull.base));
    assert.equal(again.pushed, 0);
    assert.equal(sheet.calls.writes, writes);
    assert.deepEqual(sheet.column('Settings', 'Name').slice(1), ['Oat milk', 'Quinoa', 'Mode']);
  });

  it('syncs the return-to-planner preference both ways', async () => {
    const sheet = fakeSheet();
    const device = fakeDevice({ returnToPlanner: false });
    let base = (await runSync(options(sheet, device, emptyBase('S1')))).base;
    assert.deepEqual(sheet.column('Settings', 'Value'), [false]);

    sheet.find('Settings').grid[1][2] = 'TRUE';
    const pull = await runSync(options(sheet, device, base));
    assert.equal(device.settings.returnToPlanner, true);

    device.settings = { ...device.settings, returnToPlanner: false };
    await runSync(options(sheet, device, pull.base));
    assert.deepEqual(sheet.column('Settings', 'Value'), [false]);
  });

  it('pushes a mapping changed or removed on the device', async () => {
    const sheet = fakeSheet();
    const device = fakeDevice({ aisles: [{ name: 'Oat milk', tag: 'Dairy' }, { name: 'Quinoa', tag: 'Pantry' }] });
    let base = (await runSync(options(sheet, device, emptyBase('S1')))).base;

    device.settings = { aisles: [{ name: 'Oat milk', tag: 'Pantry' }] };
    base = (await runSync(options(sheet, device, base))).base;
    assert.deepEqual(sheet.column('Settings', 'Name').slice(1), ['Oat milk']);
    assert.deepEqual(sheet.column('Settings', 'Value').slice(1), ['Pantry']);
  });
});
