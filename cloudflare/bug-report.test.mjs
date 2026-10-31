import test from 'node:test';
import assert from 'node:assert/strict';
import { BugReportStore, bugReportDurable, handleBugReport, validateReport } from './bug-report.mjs';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  async get(key) { return this.map.get(key); }
  async put(key, value) { this.map.set(key, value); }
  async delete(keys) { for (const key of [].concat(keys)) this.map.delete(key); }
  async list({ prefix = '', reverse = false, limit = Infinity } = {}) {
    const entries = [...this.map].filter(([key]) => key.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b));
    if (reverse) entries.reverse();
    return new Map(entries.slice(0, limit));
  }
}
const body = (extra = {}) => ({ text: 'The room does not open', platform: 'web', route: '/hivemind/app/overview', appVersion: '1', build: 'abc', orgId: 'org-1', ...extra });
function env(storage = new MemoryStorage()) {
  const seen = [];
  return { seen, storage, ACCOUNT_MODE_ACCESS: { idFromName: name => name, get: name => ({ fetch: (url, init) => { seen.push(name); return bugReportDurable(new Request(url, init), storage); } }) } };
}
const post = (value, extra = {}) => new Request('https://next.singulancelabs.com/api/hivemind/bug-report', {
  method: 'POST', headers: { 'content-type': 'application/json', cookie: 'hm_cp_session=s', ...extra.headers }, body: typeof value === 'string' ? value : JSON.stringify(value),
});
const user = async () => ({ id: 'u-1', email: 'a@b.c' });

test('validates text and platform', () => {
  assert.equal(validateReport(body({ text: 'x' })).error, 'text_required');
  assert.equal(validateReport(body({ platform: 'tv' })).error, 'invalid_platform');
  assert.equal(validateReport(body()).report.orgId, 'org-1');
  assert.equal('userId' in validateReport(body({ userId: 'spoof', token: 'secret' })).report, false);
});

test('stores a signed-in report under the verified user and returns its id', async () => {
  const e = env();
  const res = await handleBugReport(post(body({ userId: 'spoofed' })), e, { lookupUser: user });
  assert.equal(res.status, 201);
  const { id } = await res.json();
  assert.ok(id);
  assert.deepEqual(e.seen, ['bug-reports:u-1', 'bug-reports:index']);
  const [stored] = [...(await e.storage.list({ prefix: 'report:' })).values()];
  assert.equal(stored.userId, 'u-1');
  assert.equal(stored.id, id);
});

test('rejects missing session cookie, oversize bodies, bad json and foreign origins', async () => {
  const e = env();
  assert.equal((await handleBugReport(post(body(), { headers: { cookie: '' } }), e, { lookupUser: user })).status, 401);
  assert.equal((await handleBugReport(post(body({ text: 'x'.repeat(9000) })), e, { lookupUser: user })).status, 413);
  assert.equal((await handleBugReport(post('{nope'), e, { lookupUser: user })).status, 400);
  assert.equal((await handleBugReport(post(body(), { headers: { origin: 'https://evil.example' } }), e, { lookupUser: user })).status, 403);
  assert.equal((await handleBugReport(post(body()), e, { lookupUser: async () => null })).status, 401);
  assert.equal((await handleBugReport(post(body()), {}, { lookupUser: user })).status, 503);
  assert.equal(await handleBugReport(new Request('https://x.example/other'), e), null);
});

test('limits reports per user per hour and keeps the newest 50', async () => {
  let now = 1_000_000;
  const store = new BugReportStore(new MemoryStorage(), { now: () => now, id: () => `id-${now}` });
  for (let i = 0; i < 5; i += 1) { now += 1; assert.ok((await store.add({ text: 't' }, 'u')).id); }
  assert.equal((await store.add({ text: 't' }, 'u')).error, 'rate_limited');
  now += 3_700_000;
  assert.ok((await store.add({ text: 't' }, 'u')).id);
  assert.equal((await store.list()).length, 6);
});

test('accepts the packaged app on the Runtime host with its own origin', async () => {
  const e = env();
  const req = new Request('https://runtime-runner.singulancelabs.com/api/hivemind/bug-report', {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: 'hm_cp_session=s', origin: 'https://runtime-runner.singulancelabs.com' }, body: JSON.stringify(body({ platform: 'ios' })),
  });
  assert.equal((await handleBugReport(req, e, { lookupUser: user })).status, 201);
});
