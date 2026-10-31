import test from 'node:test';
import assert from 'node:assert/strict';
import { BugReportIndex, bugReportDurable, handleBugReport, handleBugReportAdmin, summarize } from './bug-report.mjs';
import { bugReportMessage, sendBugReportEmail } from './bug-report-email.mjs';

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
function env(extra = {}) {
  const objects = new Map();
  const storageFor = name => { if (!objects.has(name)) objects.set(name, new MemoryStorage()); return objects.get(name); };
  return { objects, storageFor, ACCOUNT_MODE_ACCESS: { idFromName: name => name, get: name => ({ fetch: (url, init) => bugReportDurable(new Request(url, init), storageFor(name)) }) }, ...extra };
}
const report = (extra = {}) => ({ text: 'The room does not open', platform: 'web', route: '/hivemind/app/overview', appVersion: '1', build: 'abc', orgId: 'org-1', userAgent: 'UA', ...extra });
const post = value => new Request('https://next.singulancelabs.com/api/hivemind/bug-report', {
  method: 'POST', headers: { 'content-type': 'application/json', cookie: 'hm_cp_session=s' }, body: JSON.stringify(value),
});
const admin = (path = '', init = {}) => new Request(`https://admin.hivemind.singulancelabs.com/api/hivemind/admin/bug-reports${path}`, {
  ...init, headers: { cookie: 'hm_platform_admin=a', origin: 'https://admin.hivemind.singulancelabs.com', 'content-type': 'application/json', ...init.headers },
});
const yes = async () => 'hm_platform_admin=a';
const no = async () => null;
const submit = async (e, value, userId = 'u-1', options = {}) => {
  const res = await handleBugReport(post(value), e, { lookupUser: async () => ({ id: userId, email: 'a@b.c' }), ...options });
  return { res, ...(await res.json()) };
};

test('a stored report is added to the global index with a 200-char preview and status new', async () => {
  const e = env();
  const { res, id } = await submit(e, report({ text: 'x'.repeat(500) }));
  assert.equal(res.status, 201);
  const [summary] = [...(await e.storageFor('bug-reports:index').list({ prefix: 'idx:' })).values()];
  assert.equal(summary.id, id);
  assert.equal(summary.preview.length, 200);
  assert.deepEqual([summary.status, summary.userId, summary.orgId, summary.platform, summary.version], ['new', 'u-1', 'org-1', 'web', '1']);
  assert.equal([...e.objects.keys()].sort().join(), 'bug-reports:index,bug-reports:u-1');
});

test('index keeps only the newest entries', async () => {
  const index = new BugReportIndex(new MemoryStorage(), { limit: 3 });
  for (let i = 1; i <= 5; i += 1) await index.add(summarize({ id: `r${i}`, at: new Date(i * 1000).toISOString(), userId: 'u', platform: 'web', text: 't' }));
  assert.deepEqual((await index.list()).reports.map(r => r.id), ['r5', 'r4', 'r3']);
});

test('an index failure does not fail the report', async () => {
  const e = env();
  const original = e.ACCOUNT_MODE_ACCESS.get;
  e.ACCOUNT_MODE_ACCESS.get = name => (name === 'bug-reports:index' ? { fetch: async () => { throw new Error('down'); } } : original(name));
  const { res } = await submit(e, report());
  assert.equal(res.status, 201);
});

test('admin list is 403 without a verified platform admin and filters, counts and paginates for one', async () => {
  const e = env();
  await submit(e, report({ text: 'one' }), 'u-1');
  await submit(e, report({ text: 'two', platform: 'ios' }), 'u-2');
  await submit(e, report({ text: 'three' }), 'u-3');
  assert.equal((await handleBugReportAdmin(admin(), e, { verifyAdmin: no })).status, 403);
  assert.equal((await handleBugReportAdmin(admin(), e, { verifyAdmin: async () => { throw new Error('x'); } })).status, 503);
  assert.equal(await handleBugReportAdmin(new Request('https://x.example/other'), e), null);
  const all = await (await handleBugReportAdmin(admin(), e, { verifyAdmin: yes })).json();
  assert.equal(all.total, 3);
  assert.deepEqual(all.counts, { new: 3, seen: 0, fixed: 0 });
  const ios = await (await handleBugReportAdmin(admin('?platform=ios'), e, { verifyAdmin: yes })).json();
  assert.deepEqual(ios.reports.map(r => r.userId), ['u-2']);
  const page = await (await handleBugReportAdmin(admin('?limit=2'), e, { verifyAdmin: yes })).json();
  assert.equal(page.reports.length, 2);
  assert.equal(page.nextOffset, 2);
});

test('admin detail returns the full report from the reporter object; unknown ids are 404', async () => {
  const e = env();
  const { id } = await submit(e, report({ text: 'y'.repeat(1000) }));
  const res = await handleBugReportAdmin(admin(`/${id}`), e, { verifyAdmin: yes });
  const { report: full } = await res.json();
  assert.equal(full.text.length, 1000);
  assert.equal(full.userAgent, 'UA');
  assert.equal((await handleBugReportAdmin(admin('/nope'), e, { verifyAdmin: yes })).status, 404);
  assert.equal((await handleBugReportAdmin(admin(`/${id}`), e, { verifyAdmin: no })).status, 403);
});

test('status patch updates the index and the reporter copy, and rejects non-admins, bad status and foreign origins', async () => {
  const e = env();
  const { id } = await submit(e, report());
  const patch = (status, init = {}, verifyAdmin = yes) => handleBugReportAdmin(admin(`/${id}`, { method: 'PATCH', body: JSON.stringify({ status }), ...init }), e, { verifyAdmin });
  assert.equal((await patch('seen', {}, no)).status, 403);
  assert.equal((await patch('bogus')).status, 400);
  assert.equal((await patch('seen', { headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await patch('fixed')).status, 200);
  const list = await (await handleBugReportAdmin(admin('?status=fixed'), e, { verifyAdmin: yes })).json();
  assert.equal(list.reports[0].status, 'fixed');
  assert.deepEqual(list.counts, { new: 0, seen: 0, fixed: 1 });
  const [stored] = [...(await e.storageFor('bug-reports:u-1').list({ prefix: 'report:' })).values()];
  assert.equal(stored.status, 'fixed');
  assert.equal((await handleBugReportAdmin(admin('/missing', { method: 'PATCH', body: '{"status":"seen"}' }), e, { verifyAdmin: yes })).status, 404);
});

test('an email is sent once per new report with its fields; send failures never fail the report', async () => {
  const sent = [];
  const e = env({ BUG_REPORT_EMAIL: { send: async message => { sent.push(message); } } });
  const waited = [];
  const sendEmail = sendBugReportEmail;
  const { res, id } = await submit(e, report({ text: 'Line one\nLine two' }), 'u-1', { ctx: { waitUntil: p => waited.push(p) }, sendEmail });
  assert.equal(res.status, 201);
  await Promise.all(waited);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'support@singulancelabs.com');
  assert.deepEqual(sent[0].from, { email: 'bugs@admin.singulancelabs.com', name: 'HIVEMIND bug reports' });
  assert.equal(sent[0].subject, '[HIVEMIND bug] web · Line one Line two');
  const body = sent[0].text;
  for (const piece of [id, 'Platform: web', 'org-1', 'u-1', '/hivemind/app/overview', 'Line two', 'admin.hivemind.singulancelabs.com']) assert.ok(body.includes(piece), piece);
  assert.doesNotMatch(sent[0].subject + body, /hm_cp_session|token|secret/i);

  const failing = env({ BUG_REPORT_EMAIL: { send: async () => { throw new Error('smtp down'); } } });
  const pending = [];
  const failed = await submit(failing, report(), 'u-2', { ctx: { waitUntil: p => pending.push(p) }, sendEmail });
  assert.equal(failed.res.status, 201);
  await assert.doesNotReject(Promise.all(pending));
  assert.equal(await sendBugReportEmail({}, { id: 'x' }), false);
});

test('rate limited reports send no email', async () => {
  const sent = [];
  const e = env({ BUG_REPORT_EMAIL: { send: async m => sent.push(m) } });
  const waited = [];
  const options = { ctx: { waitUntil: p => waited.push(p) }, sendEmail: sendBugReportEmail };
  for (let i = 0; i < 6; i += 1) await submit(e, report(), 'u-1', options);
  await Promise.all(waited);
  assert.equal(sent.length, 5);
});

test('subject cannot carry line breaks from report text', () => {
  const { subject } = bugReportMessage({ id: 'i', platform: 'web', text: 'hi\r\nBcc: evil@example.com', at: 't', userId: 'u' });
  assert.doesNotMatch(subject, /[\r\n]/);
});
  assert.doesNotMatch(mime.split('\r\n\r\n')[0], /^Bcc:/m);
});
