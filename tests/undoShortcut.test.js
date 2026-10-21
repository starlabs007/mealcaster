import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUndoShortcut } from '../src/lib/undoShortcut.js';

// A stand-in for the focused element: `closest` matches when the element sits inside one of `inside`.
const el = (/** @type {string[]} */ ...inside) => ({
  closest: (/** @type {string} */ selector) => inside.some((part) => selector.split(', ').includes(part)) || null,
});
const key = (/** @type {object} */ over = {}) => ({
  key: 'z', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false, target: el(), ...over,
});

test('Cmd+Z and Ctrl+Z undo, with or without Caps Lock', () => {
  assert.equal(isUndoShortcut(key({ metaKey: true })), true);
  assert.equal(isUndoShortcut(key({ ctrlKey: true })), true);
  assert.equal(isUndoShortcut(key({ ctrlKey: true, key: 'Z' })), true);
  assert.equal(isUndoShortcut(key({ metaKey: true, target: null })), true);
});

test('other keys, plain Z, redo and handled events do not', () => {
  assert.equal(isUndoShortcut(key()), false);
  assert.equal(isUndoShortcut(key({ metaKey: true, key: 'y' })), false);
  assert.equal(isUndoShortcut(key({ metaKey: true, shiftKey: true })), false);
  assert.equal(isUndoShortcut(key({ ctrlKey: true, altKey: true })), false);
  assert.equal(isUndoShortcut(key({ metaKey: true, defaultPrevented: true })), false);
});

test('text fields and dialogs keep their own undo; checkboxes and buttons do not', () => {
  assert.equal(isUndoShortcut(key({ metaKey: true, target: el('textarea') })), false);
  assert.equal(isUndoShortcut(key({ metaKey: true, target: el('[role="dialog"]') })), false);
  assert.equal(isUndoShortcut(key({ metaKey: true, target: el('dialog') })), false);
  assert.equal(isUndoShortcut(key({ metaKey: true, target: el('button') })), true);
});
