import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { transformSync } from '@babel/core';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// CRA's Jest 27 resolver cannot load react-markdown v9's ESM export maps.
// Exercise the real installed renderer through Node's ESM loader instead.
const source = await readFile(new URL('../src/components/hivemind/app/shared/MarkdownMessage.jsx', import.meta.url), 'utf8');
const compiled = transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code
  .replace(/from '([^']+)'/g, (_, name) => `from '${import.meta.resolve(name)}'`);
const { default: MarkdownMessage } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const render = (content) => renderToStaticMarkup(React.createElement(MarkdownMessage, null, content));

test('coding-agent prose preserves inline code, nested lists, tables and fences', () => {
  const html = render('Updated `run_id`.\n\n1. Read the record\n   - Verify the receipt\n\n| State | Evidence |\n| --- | --- |\n| Draft | Pending approval |\n\n```js\nconst ready = false;\n```');
  assert.match(html, /<p[^>]*>Updated <code[^>]*>run_id<\/code>/);
  assert.doesNotMatch(html, /<code[^>]*class="[^"]*block/);
  assert.match(html, /<ol[\s\S]*<li>Read the record[\s\S]*<ul/);
  assert.match(html, /<table[\s\S]*Pending approval/);
  assert.match(html, /<pre[^>]*><code[^>]*language-js/);
});

test('model links and markup cannot activate scripts or tracking images', () => {
  const html = render('[Unsafe](javascript:alert%281%29)\n\n[Receipt](https://example.com/receipt)\n\n<img src=x onerror=alert(1)>\n\n![Tracking](https://example.com/pixel.png)');
  assert.doesNotMatch(html, /href="javascript:|<img/);
  assert.match(html, /href="https:\/\/example.com\/receipt"[^>]*rel="noopener noreferrer"/);
});

test('multilingual paragraphs preserve text and automatic direction', () => {
  const html = render('تم إعداد المسودة.\n\nBitte prüfen Sie den Entwurf.\n\nकृपया मसौदे की समीक्षा करें।');
  assert.match(html, /dir="auto"/);
  assert.equal((html.match(/<p /g) || []).length, 3);
  assert.match(html, /कृपया/);
});

test('all chat surfaces preserve the server harness marker on turns and continuations', async () => {
  for (const file of ['pages/Chat.jsx', 'pages/Overview.jsx', 'mobile/pages/TalkToHiveMobile.jsx']) {
    const text = await readFile(new URL(`../src/components/hivemind/app/${file}`, import.meta.url), 'utf8');
    assert.equal((text.match(/harness_version: .*execution\?\.harness_version/g) || []).length, 2, file);
  }
});
