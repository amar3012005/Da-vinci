import { sessionUser, verifiedAdmin } from './account-mode-access.mjs';
import { sendBugReportEmail } from './bug-report-email.mjs';

// In-app bug reports. The reporter is the signed-in account (verified against Core through the existing session
// lookup); org id, route and build are client-reported context. Reports live in the existing AccountModeAccess
// Durable Object, one object per verified user id, so a company's reports never share storage with another's.
export const BUG_REPORT_PATH = '/api/hivemind/bug-report';
export const ADMIN_BUG_REPORTS_PATH = '/api/hivemind/admin/bug-reports';
export const INDEX_NAME = 'bug-reports:index';
export const MAX_BODY_BYTES = 8 * 1024;
const INDEX_LIMIT = 500;
export const STATUSES = ['new', 'seen', 'fixed'];
const PER_USER_LIMIT = 50;
const HOURLY_LIMIT = 5;
const headers = { 'cache-control': 'private, no-store', 'cdn-cache-control': 'no-store', 'x-robots-tag': 'noindex' };
const reply = (value, status = 200) => Response.json(value, { status, headers });
const PLATFORMS = new Set(['web', 'ios', 'macos']);
const ALLOWED_ORIGINS = new Set(['capacitor://localhost', 'https://localhost']);

/** Validates a parsed body; returns the stored fields or an error code. */
export function validateReport(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'invalid_report' };
  const clean = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');
  const text = clean(input.text, 4000).replace(/\r\n/g, '\n').trim();
  if (text.length < 3) return { error: 'text_required' };
  if (!PLATFORMS.has(input.platform)) return { error: 'invalid_platform' };
  return { report: {
    text, platform: input.platform, route: clean(input.route, 300), appVersion: clean(input.appVersion, 40),
    build: clean(input.build, 80), orgId: clean(input.orgId, 80), userAgent: clean(input.userAgent, 300),
  } };
}

/** Storage side, run inside the Durable Object. `storage` is a Durable Object storage (get/put/list/delete). */
export class BugReportStore {
  constructor(storage, { now = () => Date.now(), id = () => crypto.randomUUID() } = {}) { this.storage = storage; this.now = now; this.id = id; }
  async add(report, userId) {
    const recent = (await this.storage.get('recent') || []).filter(at => this.now() - at < 3_600_000);
    if (recent.length >= HOURLY_LIMIT) return { error: 'rate_limited', status: 429 };
    const id = this.id();
    const at = new Date(this.now()).toISOString();
    await this.storage.put(`report:${String(this.now()).padStart(15, '0')}:${id}`, { id, userId, at, status: 'new', ...report });
    await this.storage.put('recent', [...recent, this.now()]);
    const keys = [...(await this.storage.list({ prefix: 'report:' })).keys()];
    if (keys.length > PER_USER_LIMIT) await this.storage.delete(keys.slice(0, keys.length - PER_USER_LIMIT));
    return { id, at };
  }
  async list() { return [...(await this.storage.list({ prefix: 'report:', reverse: true, limit: PER_USER_LIMIT })).values()]; }
  async find(id) {
    for (const [key, value] of await this.storage.list({ prefix: 'report:', reverse: true })) if (value.id === id) return { key, report: value };
    return null;
  }
  async setStatus(id, status) {
    const found = await this.find(id);
    if (!found) return null;
    const report = { ...found.report, status };
    await this.storage.put(found.key, report);
    return report;
  }
}

/** Summary row kept in the global index; the full text stays in the reporter's own object. */
export function summarize(report) {
  return {
    id: report.id, at: report.at, userId: report.userId, orgId: report.orgId || '', platform: report.platform, route: report.route || '',
    version: report.appVersion || '', build: report.build || '', preview: String(report.text || '').slice(0, 200), status: report.status || 'new',
  };
}

/** Global index of the newest summaries, stored in one Durable Object instance (`bug-reports:index`). */
export class BugReportIndex {
  constructor(storage, { limit = INDEX_LIMIT } = {}) { this.storage = storage; this.limit = limit; }
  async add(summary) {
    await this.storage.put(`idx:${String(Date.parse(summary.at) || 0).padStart(15, '0')}:${summary.id}`, summary);
    const keys = [...(await this.storage.list({ prefix: 'idx:' })).keys()];
    if (keys.length > this.limit) await this.storage.delete(keys.slice(0, keys.length - this.limit));
  }
  async all() { return [...(await this.storage.list({ prefix: 'idx:', reverse: true })).entries()]; }
  async list({ status = '', platform = '', limit = 50, offset = 0 } = {}) {
    const entries = (await this.all()).map(([, value]) => value);
    const counts = { new: 0, seen: 0, fixed: 0 };
    for (const entry of entries) counts[entry.status] = (counts[entry.status] || 0) + 1;
    const matching = entries.filter(entry => (!status || entry.status === status) && (!platform || entry.platform === platform));
    const page = matching.slice(offset, offset + limit);
    return { reports: page, total: matching.length, counts, nextOffset: offset + page.length < matching.length ? offset + page.length : null };
  }
  async get(id) { return (await this.all()).map(([, value]) => value).find(entry => entry.id === id) || null; }
  async setStatus(id, status) {
    const found = (await this.all()).find(([, value]) => value.id === id);
    if (!found) return null;
    const summary = { ...found[1], status };
    await this.storage.put(found[0], summary);
    return summary;
  }
}

/** Durable Object request handler: `/bug-report` (per user), `/bug-report/<id>` (one report), `/bug-index` and `/bug-index/<id>` (global index). Returns null for other paths. */
export async function bugReportDurable(request, storage) {
  const path = new URL(request.url).pathname;
  const one = path.match(/^\/(bug-report|bug-index)\/([\w-]{1,80})$/);
  if (path === '/bug-index') {
    const index = new BugReportIndex(storage);
    if (request.method === 'POST') { await index.add(await request.json()); return new Response(null, { status: 204 }); }
    if (request.method !== 'GET') return new Response(null, { status: 405 });
    const query = new URL(request.url).searchParams;
    return Response.json(await index.list({
      status: query.get('status') || '', platform: query.get('platform') || '',
      limit: Math.min(Math.max(Number(query.get('limit')) || 50, 1), 100), offset: Math.max(Number(query.get('offset')) || 0, 0),
    }));
  }
  if (one) {
    const [, kind, id] = one;
    const target = kind === 'bug-index' ? new BugReportIndex(storage) : new BugReportStore(storage);
    if (request.method === 'GET') {
      const found = kind === 'bug-index' ? await target.get(id) : (await target.find(id))?.report;
      return found ? Response.json(found) : new Response(null, { status: 404 });
    }
    if (request.method === 'PATCH') {
      const { status } = await request.json();
      if (!STATUSES.includes(status)) return new Response(null, { status: 400 });
      const updated = await target.setStatus(id, status);
      return updated ? Response.json(updated) : new Response(null, { status: 404 });
    }
    return new Response(null, { status: 405 });
  }
  if (path !== '/bug-report') return null;
  const store = new BugReportStore(storage);
  if (request.method === 'GET') return Response.json({ reports: await store.list() });
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const { report, userId } = await request.json();
  const result = await store.add(report, userId);
  return Response.json(result, { status: result.error ? result.status : 201 });
}

/** Worker route `POST /api/hivemind/bug-report`. Returns null for other paths. */
export async function handleBugReport(request, env, { lookupUser = sessionUser, ctx = null, sendEmail = sendBugReportEmail } = {}) {
  const url = new URL(request.url);
  if (url.pathname !== BUG_REPORT_PATH) return null;
  if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);
  const origin = request.headers.get('origin');
  if ((origin && origin !== url.origin && !ALLOWED_ORIGINS.has(origin)) || request.headers.get('sec-fetch-site') === 'cross-site') return reply({ error: 'origin_denied' }, 403);
  if (!/(?:^|;\s*)hm_cp_session=/.test(request.headers.get('cookie') || '')) return reply({ error: 'authentication_required' }, 401);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'json_required' }, 415);
  if (!env.ACCOUNT_MODE_ACCESS) return reply({ error: 'bug_report_unavailable' }, 503);
  const declared = Number(request.headers.get('content-length'));
  if (declared > MAX_BODY_BYTES) return reply({ error: 'request_too_large' }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return reply({ error: 'request_too_large' }, 413);
  let input;
  try { input = JSON.parse(raw); } catch { return reply({ error: 'invalid_json' }, 400); }
  const checked = validateReport(input);
  if (checked.error) return reply({ error: checked.error }, 400);
  let user;
  try { user = await lookupUser(request); } catch { return reply({ error: 'identity_unavailable' }, 503); }
  if (!user?.id) return reply({ error: 'authentication_required' }, 401);
  try {
    const stub = env.ACCOUNT_MODE_ACCESS.get(env.ACCOUNT_MODE_ACCESS.idFromName(`bug-reports:${user.id}`));
    const response = await stub.fetch('https://bug-reports/bug-report', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ report: checked.report, userId: user.id }),
    });
    const stored = await response.json();
    if (response.status === 429) return reply({ error: 'rate_limited' }, 429);
    if (!response.ok || !stored.id) return reply({ error: 'bug_report_unavailable' }, 503);
    const entry = { id: stored.id, userId: user.id, at: stored.at, status: 'new', ...checked.report };
    // The report is saved; indexing and the founder email are best effort and never fail the reporter's request.
    try {
      await indexStub(env).fetch('https://bug-reports/bug-index', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(summarize(entry)) });
    } catch (error) { console.error('bug_report_index_failed', error?.message); }
    const notify = Promise.resolve().then(() => sendEmail(env, entry)).catch(error => console.error('bug_report_email_failed', error?.message));
    if (ctx?.waitUntil) ctx.waitUntil(notify);
    return reply({ id: stored.id }, 201);
  } catch { return reply({ error: 'bug_report_unavailable' }, 503); }
}

const indexStub = env => env.ACCOUNT_MODE_ACCESS.get(env.ACCOUNT_MODE_ACCESS.idFromName(INDEX_NAME));
const userStub = (env, userId) => env.ACCOUNT_MODE_ACCESS.get(env.ACCOUNT_MODE_ACCESS.idFromName(`bug-reports:${userId}`));

/**
 * Platform-admin routes `GET /api/hivemind/admin/bug-reports`, `GET …/<id>` and `PATCH …/<id>`. Authorization is the
 * existing platform-admin check (admin hostname plus an hm_platform_admin cookie that Core accepts); everything else gets 403.
 * Returns null for other paths.
 */
export async function handleBugReportAdmin(request, env, { verifyAdmin = verifiedAdmin } = {}) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/hivemind\/admin\/bug-reports(?:\/([\w-]{1,80}))?\/?$/);
  if (!match) return null;
  const id = match[1] || '';
  if (!['GET', 'PATCH'].includes(request.method) || (request.method === 'PATCH' && !id)) return reply({ error: 'method_not_allowed' }, 405);
  if (request.method === 'PATCH' && (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site')) return reply({ error: 'origin_denied' }, 403);
  let admin;
  try { admin = await verifyAdmin(request); } catch { return reply({ error: 'admin_service_unavailable' }, 503); }
  if (!admin) return reply({ error: 'platform_admin_required' }, 403);
  if (!env.ACCOUNT_MODE_ACCESS) return reply({ error: 'bug_report_unavailable' }, 503);
  try {
    const index = indexStub(env);
    if (!id) {
      const query = new URLSearchParams();
      for (const key of ['status', 'platform', 'limit', 'offset']) if (url.searchParams.get(key)) query.set(key, url.searchParams.get(key));
      const response = await index.fetch(`https://bug-reports/bug-index?${query}`);
      return reply(await response.json());
    }
    if (request.method === 'PATCH') {
      let input;
      try { input = JSON.parse(await request.text()); } catch { return reply({ error: 'invalid_json' }, 400); }
      if (!STATUSES.includes(input?.status)) return reply({ error: 'invalid_status' }, 400);
      const response = await index.fetch(`https://bug-reports/bug-index/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: input.status }) });
      if (response.status === 404) return reply({ error: 'not_found' }, 404);
      const summary = await response.json();
      await userStub(env, summary.userId).fetch(`https://bug-reports/bug-report/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: input.status }) }).catch(() => null);
      return reply({ report: summary });
    }
    const summaryResponse = await index.fetch(`https://bug-reports/bug-index/${id}`);
    if (summaryResponse.status === 404) return reply({ error: 'not_found' }, 404);
    const summary = await summaryResponse.json();
    const full = await userStub(env, summary.userId).fetch(`https://bug-reports/bug-report/${id}`);
    return reply({ report: full.ok ? { ...(await full.json()), status: summary.status } : summary });
  } catch { return reply({ error: 'bug_report_unavailable' }, 503); }
}
