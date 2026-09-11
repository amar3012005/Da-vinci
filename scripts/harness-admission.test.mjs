import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../src/components/hivemind/app/pages/HarnessChatSurface.jsx', import.meta.url), 'utf8');
const functions = source.slice(source.indexOf('const HARNESS_OVERVIEW_PATH'), source.indexOf('/** Admission'));

test('same-origin admission preserves session and ignores external embed URLs', async () => {
  const origin = 'https://next.preview.singulancelabs.com';
  const path = '/hivemind/app/overview/session/session-opaque';
  let request, destination;
  const context = vm.createContext({ URL, Date, Math, window: {
    location: { origin, href: origin + path, replace: value => { destination = value; } },
    crypto: { randomUUID: () => 'request-id' },
  }, fetch: async (url, options) => { request = { url, options }; return { ok: true, url: origin + '/api/hivemind/embed/exchange' }; } });
  vm.runInContext(functions, context);
  await vm.runInContext("navigateHarnessTicket(validBootstrap({ mode: 'harness', ticket: 'test-ticket', embed_url: 'https://untrusted.example' }).ticket)", context);
  assert.equal(request.url, '/api/hivemind/embed/exchange');
  assert.equal(request.options.credentials, 'include');
  assert.equal(destination, path);
  assert.equal(vm.runInContext("canonicalHarnessDestination('https://untrusted.example')", context), '/hivemind/app/overview');
});

test('failed admission does not navigate or send a ticket to another origin', async () => {
  let navigated = false;
  const context = vm.createContext({ URL, Date, Math, window: {
    location: { origin: 'https://next.preview.singulancelabs.com', href: 'https://next.preview.singulancelabs.com/hivemind/app/overview', replace: () => { navigated = true; } },
  }, fetch: async () => ({ ok: false }) });
  vm.runInContext(functions, context);
  await assert.rejects(vm.runInContext("navigateHarnessTicket('test-ticket')", context), /secure Harness session/);
  assert.equal(navigated, false);
});
