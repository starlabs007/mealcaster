// The CSP <meta> (config/csp.js): inline scripts in index.html are allowed by hash, never by 'unsafe-inline'.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { contentSecurityPolicy, cspContent, inlineScripts, scriptHash } from '../config/csp.js';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

/** @param {string} content @param {string} name */
const directive = (content, name) =>
  content
    .split('; ')
    .find((d) => d.startsWith(`${name} `))
    ?.split(' ')
    .slice(1) ?? [];

describe('csp', () => {
  it('finds inline scripts with their exact text and skips src and empty scripts', () => {
    const html = [
      '<script>\n  a();\n</script>',
      '<script type="module" src="/src/main.js"></script>',
      '<SCRIPT data-x="1">b()</SCRIPT >',
      '<script></script>',
      '<script type="module">c()</script>',
    ].join('\n');
    assert.deepEqual(inlineScripts(html), ['\n  a();\n', 'b()', 'c()']);
  });

  it('does not take an attribute that merely contains "src" for a src attribute', () => {
    assert.deepEqual(inlineScripts('<script data-nosrc="x">d()</script>'), ['d()']);
  });

  it('hashes the UTF-8 text as a CSP sha256 source', () => {
    const text = 'document.title = "ü";';
    const expected = createHash('sha256').update(Buffer.from(text, 'utf8')).digest('base64');
    assert.equal(scriptHash(text), `'sha256-${expected}'`);
  });

  it('puts the hashes in script-src, once each, and never unsafe-inline', () => {
    const scripts = directive(cspContent({ dev: false, scriptHashes: ["'sha256-A'", "'sha256-A'", "'sha256-B'"] }), 'script-src');
    assert.deepEqual(scripts, ["'self'", "'sha256-A'", "'sha256-B'", 'https://accounts.google.com', 'https://apis.google.com']);
  });

  it("allows Vite's HMR websocket in dev only", () => {
    assert.ok(directive(cspContent({ dev: true }), 'connect-src').includes('ws:'));
    assert.ok(!directive(cspContent({ dev: false }), 'connect-src').includes('ws:'));
  });

  it("allows index.html's theme script, which runs before the first paint", () => {
    const scripts = inlineScripts(indexHtml);
    assert.equal(scripts.length, 1);
    assert.match(scripts[0], /mealcaster\.theme\.v1/);

    const plugin = contentSecurityPolicy(false);
    assert.equal(plugin.transformIndexHtml.order, 'post');
    const [meta] = plugin.transformIndexHtml.handler(indexHtml);
    assert.equal(meta.attrs['http-equiv'], 'Content-Security-Policy');
    assert.equal(meta.injectTo, 'head-prepend');
    const scriptSrc = directive(meta.attrs.content, 'script-src');
    assert.ok(scriptSrc.includes(scriptHash(scripts[0])));
    assert.ok(!scriptSrc.includes("'unsafe-inline'"));
  });
});
