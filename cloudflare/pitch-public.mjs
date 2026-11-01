import { FOUNDER_NOTES } from './pitch-founder-notes.mjs';

const HOST = 'pitch.singulancelabs.com';
const NOINDEX = 'noindex, nofollow';
const FOUNDER_COOKIE = 'pitch_founder';
const FOUNDER_SESSION_SECONDS = 12 * 60 * 60;
const encoder = new TextEncoder();

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': NOINDEX, ...extra } });
}

function sameString(left, right) {
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return mismatch === 0;
}

async function sign(passcode, expiry) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(passcode), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`pitch-founder:${expiry}`)));
  return btoa(String.fromCharCode(...mac)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hasFounderSession(request, passcode) {
  const match = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${FOUNDER_COOKIE}=(\\d+)\\.([A-Za-z0-9_-]+)`));
  if (!match || Number(match[1]) * 1000 < Date.now()) return false;
  return sameString(match[2], await sign(passcode, match[1]));
}

// The vault index lives in the private R2 bucket as _manifest.json, so files are added by uploading, without a deploy.
const VAULT_MANIFEST = '_manifest.json';
const VAULT_KEY = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,300}$/;

async function vaultRoute(request, env, url) {
  if (!env.FOUNDER_VAULT) return json({ error: 'founder_vault_not_configured' }, 503);
  if (url.pathname === '/founder/vault') {
    const manifest = await env.FOUNDER_VAULT.get(VAULT_MANIFEST);
    return manifest ? json(await manifest.json()) : json({ rooms: [], items: [] });
  }
  const key = decodeURIComponent(url.pathname.slice('/founder/files/'.length));
  if (!VAULT_KEY.test(key) || key.includes('..')) return json({ error: 'not_found' }, 404);
  const object = await env.FOUNDER_VAULT.get(key);
  if (!object) return json({ error: 'not_found' }, 404);
  const name = key.split('/').pop().replace(/"/g, '');
  const type = object.httpMetadata?.contentType || 'application/octet-stream';
  // Script-capable types are always downloaded; PDFs, images and Office files may open inline.
  const scriptable = /html|svg|xml|javascript/i.test(type);
  const disposition = url.searchParams.has('download') || scriptable ? 'attachment' : 'inline';
  return new Response(request.method === 'HEAD' ? null : object.body, { headers: {
    'content-type': type,
    'content-length': String(object.size),
    'content-disposition': `${disposition}; filename="${name}"`,
    'cache-control': 'private, no-store',
    'x-robots-tag': NOINDEX,
    'x-content-type-options': 'nosniff',
  } });
}

// The founder passcode lives only in the PITCH_FOUNDER_PASSCODE Worker secret; a session is an HMAC-signed expiry in an HttpOnly cookie.
async function founderRoute(request, env, url) {
  const passcode = env.PITCH_FOUNDER_PASSCODE;
  if (!passcode) return json({ error: 'founder_access_not_configured' }, 503);
  const isVault = url.pathname === '/founder/vault' || url.pathname.startsWith('/founder/files/');
  if (url.pathname === '/founder/notes' || isVault) {
    if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'method_not_allowed' }, 405, { allow: 'GET, HEAD' });
    if (!(await hasFounderSession(request, passcode))) return json({ error: 'founder_session_required' }, 401);
    return isVault ? vaultRoute(request, env, url) : json(FOUNDER_NOTES);
  }
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  if (request.headers.get('origin') !== `https://${HOST}` && env.ENVIRONMENT !== 'development') return json({ error: 'origin_not_allowed' }, 403);
  if (url.pathname === '/founder/logout') return json({ ok: true }, 200, { 'set-cookie': `${FOUNDER_COOKIE}=; Path=/founder; Max-Age=0; HttpOnly; Secure; SameSite=Strict` });
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const supplied = typeof body?.passcode === 'string' ? body.passcode.slice(0, 200) : '';
  if (!sameString(supplied, passcode)) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return json({ error: 'wrong_passcode' }, 401);
  }
  const expiry = String(Math.floor(Date.now() / 1000) + FOUNDER_SESSION_SECONDS);
  return json({ ok: true }, 200, { 'set-cookie': `${FOUNDER_COOKIE}=${expiry}.${await sign(passcode, expiry)}; Path=/founder; Max-Age=${FOUNDER_SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict` });
}

// This origin is the public pitch room. It never serves app APIs or app sessions and is not indexed.
export async function pitchPublic(request, env) {
  const url = new URL(request.url);
  if (url.hostname !== HOST) return null;
  if (['/founder/session', '/founder/notes', '/founder/logout', '/founder/vault'].includes(url.pathname) || url.pathname.startsWith('/founder/files/')) return founderRoute(request, env, url);
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' } });
  if (url.protocol !== 'https:' && env.ENVIRONMENT !== 'development') { url.protocol = 'https:'; return Response.redirect(url.href, 308); }
  if (['/privacy', '/cookies', '/security'].includes(url.pathname)) return Response.redirect(`https://singulancelabs.com${url.pathname}`, 308);
  if (url.pathname === '/robots.txt') return new Response(request.method === 'HEAD' ? null : 'User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' } });
  const withNoindex = (response, cacheControl) => {
    const headers = new Headers(response.headers);
    headers.set('x-robots-tag', NOINDEX);
    if (cacheControl) headers.set('cache-control', cacheControl);
    return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers });
  };
  if (url.pathname === '/') {
    const assetRequest = new Request(new URL('/', url), request);
    assetRequest.headers.delete('if-none-match'); assetRequest.headers.delete('if-modified-since');
    return withNoindex(await env.ASSETS.fetch(assetRequest), 'no-cache');
  }
  // Static Assets strips .html and serves the page at its extensionless path.
  if (url.pathname === '/pitch/market-map.html') return Response.redirect(`https://${HOST}/pitch/market-map${url.search}`, 308);
  if (url.pathname === '/pitch/market-map') return withNoindex(await env.ASSETS.fetch(request), 'no-cache');
  if (/^\/pitch\/(?:(?:product|sales|investor)\/\d{2}\.jpg|SINGULANCE-(?:Product|Sales|Investor)-Deck-2026\.pdf)$/.test(url.pathname)
    || /^\/static\//.test(url.pathname)
    || ['/favicon.ico', '/favicon.svg', '/logo.svg', '/singulance-mark.svg', '/singulance-mark-192.png', '/singulance-mark-512.png', '/manifest.json', '/manifest.webmanifest'].includes(url.pathname)) {
    const response = await env.ASSETS.fetch(request);
    if (!/text\/html/i.test(response.headers.get('content-type') || '')) return withNoindex(response);
  }
  return new Response(request.method === 'HEAD' ? null : 'Not found', { status: 404, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'content-type': 'text/plain; charset=utf-8' } });
}
