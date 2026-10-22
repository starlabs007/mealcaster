import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupedActions } from '../src/lib/menuGroups.js';

test('the first item of every group after the first gets a divider', () => {
  const list = groupedActions([[{ id: 'a' }, { id: 'b' }], [{ id: 'c' }], [{ id: 'd' }, { id: 'e' }]]);
  assert.deepEqual(
    list.map((x) => [x.id, !!x.divider]),
    [['a', false], ['b', false], ['c', true], ['d', true], ['e', false]],
  );
});

test('empty groups leave no stray divider', () => {
  const list = groupedActions([[], [{ id: 'a' }], [], [{ id: 'b' }]]);
  assert.deepEqual(
    list.map((x) => [x.id, !!x.divider]),
    [['a', false], ['b', true]],
  );
  assert.deepEqual(groupedActions([[], []]), []);
});
