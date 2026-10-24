import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUndoShortcut, undoShortcutHint } from '../src/lib/undoShortcut.js';

// A stand-in for an element: the properties the rule reads, and a parent to walk up through.
const el = (/** @type {string} */ localName = 'div', /** @type {object} */ props = {}, /** @type {object | null} */ parentElement = null) => ({
  localName, parentElement, getAttribute: () => null, ...props,
});
const input = (/** @type {string | undefined} */ type) => el('input', type === undefined ? {} : { type });
const inside = (/** @type {object} */ child, /** @type {object} */ parent) => ({ ...child, parentElement: parent });
const key = (/** @type {object} */ over = {}) => ({
  key: 'z', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false, target: el(), ...over,
});

const cmdZ = (/** @type {object | null | undefined} */ target) => isUndoShortcut(key({ metaKey: true, target }));

test('Cmd+Z and Ctrl+Z undo, with or without Caps Lock', () => {
  assert.equal(isUndoShortcut(key({ metaKey: true })), true);
  assert.equal(isUndoShortcut(key({ ctrlKey: true })), true);
  assert.equal(isUndoShortcut(key({ ctrlKey: true, key: 'Z' })), true);
});

test('other keys, plain Z, redo and handled events do not', () => {
  assert.equal(isUndoShortcut(key()), false);
  assert.equal(isUndoShortcut(key({ metaKey: true, key: 'y' })), false);
  assert.equal(isUndoShortcut(key({ metaKey: true, shiftKey: true })), false);
  assert.equal(isUndoShortcut(key({ ctrlKey: true, altKey: true })), false);
  assert.equal(isUndoShortcut(key({ metaKey: true, defaultPrevented: true })), false);
});

test('text fields keep their own undo: textarea, select, text-like inputs, editable content', () => {
  assert.equal(cmdZ(el('textarea')), false);
  assert.equal(cmdZ(el('select')), false);
  assert.equal(cmdZ(el('div', { isContentEditable: true })), false);
  for (const type of [undefined, 'text', 'search', 'email', 'number', 'password', 'url', 'tel', 'date', 'TEXT']) {
    assert.equal(cmdZ(input(type)), false, `input type ${type}`);
  }
});

test('inputs that hold no text do not: checkbox, radio, buttons, range, colour, file', () => {
  for (const type of ['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'CHECKBOX']) {
    assert.equal(cmdZ(input(type)), true, `input type ${type}`);
  }
});

test('dialogs keep their own undo, for anything inside them', () => {
  const dialog = el('dialog');
  const ariaDialog = el('div', { getAttribute: (/** @type {string} */ name) => (name === 'role' ? 'dialog' : null) });
  assert.equal(cmdZ(dialog), false);
  assert.equal(cmdZ(ariaDialog), false);
  assert.equal(cmdZ(inside(el('button'), dialog)), false);
  assert.equal(cmdZ(inside(inside(el('span'), el('div')), ariaDialog)), false);
  // A checkbox inside a dialog is still inside the dialog.
  assert.equal(cmdZ(inside(input('checkbox'), ariaDialog)), false);
});

test('a text field around the target counts (the target is inside the field)', () => {
  assert.equal(cmdZ(inside(el('span'), el('textarea'))), false);
});

test('plain page elements, other roles and no target do undo', () => {
  assert.equal(cmdZ(el('button')), true);
  assert.equal(cmdZ(el('div')), true);
  assert.equal(cmdZ(inside(el('button'), el('div', { getAttribute: (/** @type {string} */ name) => (name === 'role' ? 'menu' : null) }))), true);
  assert.equal(cmdZ(el('body')), true);
  assert.equal(cmdZ(null), true);
  assert.equal(cmdZ(undefined), true);
});

test('the Undo hint names the key for the platform', () => {
  assert.equal(undoShortcutHint('MacIntel'), '⌘Z');
  assert.equal(undoShortcutHint('iPad'), '⌘Z');
  assert.equal(undoShortcutHint('Win32'), 'Ctrl+Z');
  assert.equal(undoShortcutHint(), 'Ctrl+Z');
});
