import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, migrateNotes } from '../src/lib/markdown.js';

describe('renderMarkdown', () => {
  it('renders emphasis, lists and paragraphs', () => {
    assert.equal(renderMarkdown('Use **cold** butter and *salt*.'), '<p>Use <strong>cold</strong> butter and <em>salt</em>.</p>');
    assert.equal(renderMarkdown('- a\n- b'), '<ul><li>a</li><li>b</li></ul>');
    assert.equal(renderMarkdown('1. a\n2. b'), '<ol><li>a</li><li>b</li></ol>');
    assert.equal(renderMarkdown('one\n\ntwo'), '<p>one</p><p>two</p>');
  });
  it('nests indented list items', () => {
    assert.equal(renderMarkdown('- a\n  - b\n  - c\n- d'), '<ul><li>a<ul><li>b</li><li>c</li></ul></li><li>d</li></ul>');
    assert.equal(renderMarkdown('1. a\n    - b\n2. c'), '<ol><li>a<ul><li>b</li></ul></li><li>c</li></ol>');
    assert.equal(renderMarkdown('- a\n  - b\n    - c\n- d'), '<ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li><li>d</li></ul>');
    assert.equal(renderMarkdown('- a\n\t- b'), '<ul><li>a<ul><li>b</li></ul></li></ul>');
    assert.equal(renderMarkdown('- a\n1. b'), '<ul><li>a</li></ul><ol><li>b</li></ol>');
  });
  it('escapes HTML and unsafe links', () => {
    assert.equal(renderMarkdown('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
    assert.ok(!renderMarkdown('[x](javascript:alert(1))').includes('<a'));
    assert.match(renderMarkdown('[x](https://a.com)'), /<a href="https:\/\/a.com" target="_blank" rel="noopener noreferrer">x<\/a>/);
  });
});

describe('migrateNotes', () => {
  it('merges secret and pairing into notes', () => {
    const r = migrateNotes({ id: 'a', secret: 'Dry the skin.', pairing: 'Sancerre.' });
    assert.deepEqual(r, { id: 'a', notes: 'Dry the skin.\n\n**Pairing:** Sancerre.' });
  });
  it('leaves new-shape recipes alone', () => {
    const r = { id: 'a', notes: 'x' };
    assert.equal(migrateNotes(r), r);
  });
});
