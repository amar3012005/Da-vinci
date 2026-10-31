import { sessionUser } from './account-mode-access.mjs';

// In-app bug reports. The reporter is the signed-in account (verified against Core through the existing session
// lookup); org id, route and build are client-reported context. Reports live in the existing AccountModeAccess
// Durable Object, one object per verified user id, so a company's reports never share storage with another's.
export const BUG_REPORT_PATH = '/api/hivemind/bug-report';
export const MAX_BODY_BYTES = 8 * 1024;
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
    await this.storage.put(`report:${String(this.now()).padStart(15, '0')}:${id}`, { id, userId, at: new Date(this.now()).toISOString(), ...report });
    await this.storage.put('recent', [...recent, this.now()]);
    const keys = [...(await this.storage.list({ prefix: 'report:' })).keys()];
    if (keys.length > PER_USER_LIMIT) await this.storage.delete(keys.slice(0, keys.length - PER_USER_LIMIT));
    return { id };
  }
  async list() { return [...(await this.storage.list({ prefix: 'report:', reverse: true, limit: PER_USER_LIMIT })).values()]; }
}

/** Durable Object request handler for `/bug-report` (POST add, GET list). Returns null for other paths. */
export async function bugReportDurable(request, storage) {
  const path = new URL(request.url).pathname;
  if (path !== '/bug-report') return null;
  const store = new BugReportStore(storage);
  if (request.method === 'GET') return Response.json({ reports: await store.list() });
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const { report, userId } = await request.json();
  const result = await store.add(report, userId);
  return Response.json(result, { status: result.error ? result.status : 201 });
}

/** Worker route `POST /api/hivemind/bug-report`. Returns null for other paths. */
export async function handleBugReport(request, env, { lookupUser = sessionUser } = {}) {
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
    return reply({ id: stored.id }, 201);
  } catch { return reply({ error: 'bug_report_unavailable' }, 503); }
}
