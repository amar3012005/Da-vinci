import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import * as sanitize from '../src/components/hivemind/app/shared/markdown-sanitize.mjs';

const { escapeHtml, safeUrl, renderSafeLink } = sanitize;

/** Loads a top-level renderer function from a page component with the sanitizer in scope. */
function loadRenderer(file, name) {
  const source = fs.readFileSync(new URL(`../src/components/hivemind/app/pages/${file}`, import.meta.url), 'utf8');
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists in ${file}`);
  const end = source.indexOf('\n}\n', start);
  return vm.runInNewContext(`(${source.slice(start, end + 2)})`, { ...sanitize, URL });
}

const renderers = {
  'DeepResearch renderMarkdown': loadRenderer('DeepResearch.jsx', 'renderMarkdown'),
  'WebStudio mdToHtml': loadRenderer('WebStudio.jsx', 'mdToHtml'),
};

const payloads = [
  '[read more](javascript:top.location="https://attacker.invalid/")',
  '[read more](JaVaScRiPt:alert(1))',
  '[read more](data:text/html,<script>alert(1)</script>)',
  '[read more](vbscript:msgbox(1))',
  '[read more](https://example.com" onmouseover="top.location=\'https://attacker.invalid/\')',
  "[read more](https://example.com' onmouseover='alert(1))",
  'see https://example.com"onmouseover=location=\'https://attacker.invalid/\'//',
  "see https://example.com'onmouseover=alert(1)//",
  '<img src=x onerror=alert(1)>',
];

/** Every attribute in the output, as `name=value` pairs, parsed from tags only. */
function attributes(html) {
  const out = [];
  for (const [, body] of html.matchAll(/<[a-z0-9]+((?:\s+[^\s=>]+(?:="[^"]*")?)*)\s*\/?>/gi)) {
    for (const [, name, value] of body.matchAll(/\s+([^\s=>]+)(?:="([^"]*)")?/g)) out.push({ name: name.toLowerCase(), value });
  }
  return out;
}

test('escapeHtml escapes both quote characters', () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;');
});

test('safeUrl keeps http, https and mailto and drops every other scheme', () => {
  assert.equal(safeUrl('https://example.com/a?b=1&c=2'), 'https://example.com/a?b=1&amp;c=2');
  assert.equal(safeUrl('http://example.com/'), 'http://example.com/');
  assert.equal(safeUrl('mailto:owner@example.com'), 'mailto:owner@example.com');
  for (const url of ['javascript:alert(1)', ' JAVASCRIPT:alert(1)', 'java\tscript:alert(1)', 'data:text/html,x', 'vbscript:x', 'file:///etc/passwd', '/relative', '//example.com', '', 'not a url']) {
    assert.equal(safeUrl(url), null, url);
  }
});

test('renderSafeLink renders a dropped URL as its label', () => {
  assert.equal(renderSafeLink('label', 'javascript:alert(1)', 'target="_blank"'), 'label');
  assert.equal(renderSafeLink('label', 'https://example.com/?a=1&amp;b=2', 'rel="noopener"'), '<a href="https://example.com/?a=1&amp;b=2" rel="noopener">label</a>');
});

for (const [name, render] of Object.entries(renderers)) {
  test(`${name} emits no event handlers and no non-http(s) URLs`, () => {
    for (const payload of payloads) {
      const html = render(payload);
      for (const { name: attribute, value } of attributes(html)) {
        assert.ok(!attribute.startsWith('on'), `${payload} -> ${html}`);
        if (attribute === 'href' || attribute === 'src') assert.match(value, /^(?:https?|mailto):/, `${payload} -> ${html}`);
      }
      assert.ok(!/<(?:img|script|iframe)\b/i.test(html), `${payload} -> ${html}`);
    }
  });

  test(`${name} still renders an https link`, () => {
    assert.match(render('[docs](https://example.com/docs?a=1&b=2)'), /<a href="https:\/\/example\.com\/docs\?a=1&amp;b=2"[^>]*>docs<\/a>/);
  });
}

test('WebStudio mdToHtml still autolinks a bare https URL', () => {
  assert.match(renderers['WebStudio mdToHtml']('see https://example.com/page now'), /see <a href="https:\/\/example\.com\/page"[^>]*>https:\/\/example\.com\/page<\/a> now/);
});
