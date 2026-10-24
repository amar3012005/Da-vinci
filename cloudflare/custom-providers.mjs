const BASE = '/api/hivemind/custom-providers';
const PROVIDER_ID = /^custom-[0-9a-f]{16}$/;
const MAX_BODY_BYTES = 10000;
const RUNNER_ORIGIN = 'https://runtime-runner-origin.singulancelabs.com';

/**
 * Fixed owner transport for the Runtime runner custom-provider API. Only the
 * documented routes pass; the runner remains the authority for auth, tenancy,
 * key sealing and validation.
 */
export async function proxyCustomProviders(request, env) {
  const url = new URL(request.url);
  const reply = (error, status) => Response.json({ error }, { status, headers: { 'cache-control': 'private, no-store' } });
  if (url.pathname !== BASE && !url.pathname.startsWith(`${BASE}/`)) return reply('not_found', 404);
  const rest = url.pathname.slice(BASE.length).split('/').filter(Boolean);
  let methods;
  if (rest.length === 0) methods = ['GET', 'PUT'];
  else if (rest.length === 1 && rest[0] === 'test') methods = ['POST'];
  else if (rest.length === 1 && PROVIDER_ID.test(rest[0])) methods = ['DELETE'];
  else if (rest.length === 2 && PROVIDER_ID.test(rest[0]) && rest[1] === 'test') methods = ['POST'];
  else return reply('not_found', 404);
  if (!methods.includes(request.method)) return reply('method_not_allowed', 405);

  const origin = request.headers.get('origin');
  if (origin ? origin !== url.origin : request.method !== 'GET') return reply('origin_denied', 403);
  if (request.headers.get('sec-fetch-site') === 'cross-site') return reply('origin_denied', 403);

  const cookie = (request.headers.get('cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith('hm_cp_session='));
  if (!cookie) return reply('authentication_required', 401);

  const target = new URL(env.RUNTIME_RUNNER_ORIGIN || RUNNER_ORIGIN);
  if (target.origin !== RUNNER_ORIGIN) return reply('custom_providers_unavailable', 503);
  target.pathname = url.pathname;
  target.search = '';

  const headers = new Headers({ cookie, accept: 'application/json', 'x-forwarded-host': url.host, 'x-forwarded-proto': 'https' });
  let body;
  if (request.method === 'PUT' || request.method === 'POST') {
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply('json_required', 415);
    const declared = Number(request.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return reply('request_too_large', 413);
    const read = await readCapped(request.body, MAX_BODY_BYTES);
    if (!read) return reply('request_too_large', 413);
    body = read;
    headers.set('content-type', 'application/json');
  }
  if (request.method !== 'GET') headers.set('origin', url.origin);

  try {
    const response = await fetch(target, { method: request.method, headers, body, redirect: 'manual', signal: request.signal });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      return reply('runtime_redirect_denied', 502);
    }
    return new Response(response.body, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'private, no-store' },
    });
  } catch {
    return reply('custom_providers_unavailable', 503);
  }
}

/** Reads a request stream into bytes, or returns null once it exceeds the cap. */
async function readCapped(stream, cap) {
  if (!stream) return new Uint8Array(0);
  const reader = stream.getReader();
  const parts = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > cap) {
        await reader.cancel();
        return null;
      }
      parts.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}
