import { hedgedFetch } from './hedged-fetch.mjs';
import { bugReportDurable } from './bug-report.mjs';
import {requiresWorkspaceModeAccess} from '../src/components/hivemind/app/shared/workspace-mode-policy.mjs';
/** Account grants are strongly consistent; only this Worker's verified admin path writes them. */
export class AccountModeAccess {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    // Bug reports share this Durable Object class, keyed per user (see bug-report.mjs); grants keep their own keys.
    const bug = await bugReportDurable(request, this.ctx.storage);
    if (bug) return bug;
    if (request.method === 'GET') return Response.json(await this.ctx.storage.get('grant') || { enabled: null });
    if (request.method !== 'PUT') return new Response(null, { status: 405 });
    const input = await request.json();
    if (typeof input.enabled !== 'boolean' || typeof input.operator !== 'string') return new Response(null, { status: 400 });
    const grant = { enabled: input.enabled, operator: input.operator, updatedAt: new Date().toISOString() };
    await this.ctx.storage.put('grant', grant);
    return Response.json(grant);
  }
}
export const MODE_ACCESS_FLAG = 'hivemind-workspace-modes-v1';
const ADMIN_HOST = 'admin.hivemind.singulancelabs.com';
const API = '/__hivemind/account-mode-access';
const ADMIN_API = '/__hivemind/admin/account-mode-access';
const headers = { 'cache-control': 'private, no-store', 'cdn-cache-control': 'no-store', 'x-robots-tag': 'noindex' };
const reply = (value, status = 200) => Response.json(value, { status, headers });
export function normalizeAccessEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
async function grantStub(env, email) {
  if (!env.ACCOUNT_MODE_ACCESS) throw new Error('account_mode_access_unavailable');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email));
  const key = Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
  return env.ACCOUNT_MODE_ACCESS.get(env.ACCOUNT_MODE_ACCESS.idFromName(key));
}
export async function evaluateModeAccess(env, email, userId = '') {
  const normalized = normalizeAccessEmail(email);
  if (!normalized) return false;
  try {
    const grant = await (await grantStub(env, normalized)).fetch('https://account-grant/');
    if (!grant.ok) throw new Error('account_mode_access_unavailable');
    const state = await grant.json();
    return await env.FLAGS.getBooleanValue(MODE_ACCESS_FLAG, false, {
      email: normalized, userId, admin_granted: state.enabled === true, admin_denied: state.enabled === false,
    }) === true;
  } catch { throw new Error('account_mode_access_unavailable'); }
}
function cookies(request, name) {
  return (request.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
}
function allCookies(request, name) {
  return (request.headers.get('cookie') || '').split(';').map(v => v.trim()).filter(v => v.startsWith(`${name}=`));
}
// Accepted identities are reused per isolate for SESSION_CACHE_MS, keyed by a SHA-256 of the
// session cookie; rejections and outages are never cached, and concurrent lookups share one fetch.
const SESSION_CACHE_MS = 20000;
const SESSION_CACHE_LIMIT = 2000;
const sessions = new Map();
const pendingSessions = new Map();
/** Drops cached identities; tests only. */
export function clearSessionCache() { sessions.clear(); pendingSessions.clear(); }
/** Resolves the signed-in user. A request may carry several hm_cp_session cookies (host-only and domain-wide, or a stale one first); each is tried in order. */
export async function sessionUser(request) {
  for (const cookie of allCookies(request, 'hm_cp_session').slice(0, 3)) {
    const user = await sessionUserForCookie(cookie);
    if (user) return user;
  }
  return null;
}
async function sessionUserForCookie(cookie) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cookie));
  const key = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
  const cached = sessions.get(key);
  if (cached && cached.expires > Date.now()) return cached.user;
  sessions.delete(key);
  if (pendingSessions.has(key)) return pendingSessions.get(key);
  const lookup = fetchSessionUser(cookie).then(user => {
    if (user) {
      if (sessions.size >= SESSION_CACHE_LIMIT) sessions.delete(sessions.keys().next().value);
      sessions.set(key, { user, expires: Date.now() + SESSION_CACHE_MS });
    }
    return user;
  }).finally(() => pendingSessions.delete(key));
  pendingSessions.set(key, lookup);
  return lookup;
}
async function fetchSessionUser(cookie) {
  const response = await hedgedFetch('https://api.singulancelabs.com/auth/session', {
    headers: { cookie, accept: 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error('account_session_unavailable');
  const data = await response.json();
  return data.authenticated === true && data.user?.id && normalizeAccessEmail(data.user.email) ? data.user : null;
}
export async function verifiedAdmin(request) {
  if (new URL(request.url).hostname !== ADMIN_HOST) return null;
  const cookie = cookies(request, 'hm_platform_admin');
  if (!cookie) return null;
  const response = await fetch('https://api.singulancelabs.com/admin/api/platform/users?limit=1', {
    headers: { cookie, accept: 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(8000),
  });
  return response.ok ? cookie : null;
}
export async function handleModeAccess(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== API && url.pathname !== ADMIN_API) return null;
  try {
    if (url.pathname === API) {
      if (request.method !== 'GET') return reply({ error: 'method_not_allowed' }, 405);
      const user = await sessionUser(request);
      if (!user) return reply({ error: 'authentication_required', enabled: false }, 401);
      return reply({ enabled: await evaluateModeAccess(env, user.email, user.id) });
    }
    if (request.method !== 'POST' || request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site') return reply({ error: 'origin_denied' }, 403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'json_required' }, 415);
    const adminCookie = await verifiedAdmin(request);
    if (!adminCookie) return reply({ error: 'admin_authentication_required' }, 401);
    const text = await request.text();
    if (text.length > 32000) return reply({ error: 'request_too_large' }, 413);
    const input = JSON.parse(text);
    if (input.action === 'read' && Array.isArray(input.emails) && input.emails.length <= 250) {
      const emails = [...new Set(input.emails.map(normalizeAccessEmail).filter(Boolean))];
      const access = {};
      // Keep subrequest concurrency bounded on large platform directories.
      for (let offset = 0; offset < emails.length; offset += 20) {
        await Promise.all(emails.slice(offset, offset + 20).map(async email => { access[email] = await evaluateModeAccess(env, email); }));
      }
      return reply({ access });
    }
    const email = normalizeAccessEmail(input.email);
    if (!email || typeof input.enabled !== 'boolean') return reply({ error: 'invalid_account_grant' }, 400);
    const response = await (await grantStub(env, email)).fetch('https://account-grant/', {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: input.enabled, operator: 'verified-platform-admin' }),
    });
    if (!response.ok) return reply({ error: 'grant_not_saved' }, 503);
    return reply({ email, saved: true, enabled: await evaluateModeAccess(env, email), requested: input.enabled });
  } catch { return reply({ error: 'account_mode_access_unavailable' }, 503); }
}
export async function gateWorkspaceDocument(request, env) {
  const url = new URL(request.url);
  if (!['next.singulancelabs.com', 'runtime-runner.singulancelabs.com'].includes(url.hostname) || !['GET', 'HEAD'].includes(request.method)) return null;
  if (!requiresWorkspaceModeAccess(url.pathname)) return null;
  try {
    const user = await sessionUser(request);
    // Existing sign-in keeps the intended return destination for unauthenticated users.
    if (!user) return null;
    if (await evaluateModeAccess(env, user.email, user.id)) return null;
    return reply({ error: 'workspace_access_disabled', message: 'Workspace access is not enabled for this account. Your saved conversations are unchanged.' }, 403);
  } catch { return reply({ error: 'account_mode_access_unavailable' }, 503); }
}

/** Keep the existing host-only admin cookie on the admin hostname; Core/Control still verify it. */
export async function proxyPlatformAdmin(request) {
  const url = new URL(request.url);
  if (url.hostname !== ADMIN_HOST || !url.pathname.startsWith('/admin/api/platform/')) return null;
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return reply({ error: 'method_not_allowed' }, 405);
  if (!['GET'].includes(request.method) && request.headers.get('origin') !== url.origin) return reply({ error: 'origin_denied' }, 403);
  const outbound = new Headers({ accept: request.headers.get('accept') || 'application/json' });
  const cookie = cookies(request, 'hm_platform_admin');
  if (cookie) outbound.set('cookie', cookie);
  if (request.headers.has('content-type')) outbound.set('content-type', request.headers.get('content-type'));
  if (request.headers.has('origin')) outbound.set('origin', request.headers.get('origin'));
  const destination = new URL(url.pathname + url.search, 'https://api.singulancelabs.com');
  try {
    const response = await fetch(destination, { method: request.method, headers: outbound, body: request.method === 'GET' ? undefined : request.body, redirect: 'manual', signal: request.signal });
    if (response.status >= 300 && response.status < 400) return reply({ error: 'admin_redirect_denied' }, 502);
    const output = new Headers(response.headers);
    output.set('cache-control', 'private, no-store');output.set('cdn-cache-control', 'no-store');
    return new Response(response.body, { status: response.status, headers: output });
  } catch { return reply({ error: 'admin_service_unavailable' }, 503); }
}
