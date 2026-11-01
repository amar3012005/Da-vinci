const RUNTIME = 'https://runtime-runner.singulancelabs.com';
export const BRAIN = 'https://brain-runner.singulancelabs.com';
const COMPANY_BRAIN_PATH = '/dots/dot_company_brain';
const SURFACE_HEADER = 'x-open-dot-surface';
const UPSTREAM = 'https://dots.singulancelabs.com';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const DOCUMENT = new RegExp(`^/(?:employees/${UUID}|dots/dot_[a-zA-Z0-9_-]+|settings)/?$`, 'i');
const API = /^\/api\/(?:cards\/(?:msg|card)_[a-zA-Z0-9_-]+|conversations(?:\/conv_[a-zA-Z0-9_-]+)?|dots\/(?:autonomy|company-glance|local-duties|team-board|team-week)|dots\/dot_[a-zA-Z0-9_-]+\/(?:agenda|control|conversations|event-watches|files|frames|input|library|live|results|screen|stream|warm|workspace)|files\/file_[a-zA-Z0-9_-]+|hivemind\/(?:setup|needs-you|voice\/(?:context|events)|employees\/(?:materialize|[0-9a-f-]+\/binding))|locale|desktop\/entry|models|organization|settings\/open-dot-recovery|composio\/oauth)$/;

export function isRuntimeOpenDotRequest(url) {
  return (url.origin === RUNTIME || url.origin === BRAIN) && (DOCUMENT.test(url.pathname) || API.test(url.pathname)
    || (['/', '/apps'].includes(url.pathname) && url.searchParams.get('embed') === 'hivemind')
    || url.pathname === '/images/runtime-computer.webp' || url.pathname === '/images/idle-desktop.webp' || url.pathname === '/images/company-brain.svg');
}

/** Sets the surface header from the public origin; a client-sent value is never forwarded. */
export function applyOpenDotSurface(headers, url) {
  headers.delete(SURFACE_HEADER);
  if (url.origin === BRAIN) headers.set(SURFACE_HEADER, 'brain');
}

/**
 * The Company Brain lives only on the brain-runner origin. Returns a 302 for GET/HEAD document
 * requests that belong on the other origin, otherwise null.
 */
export function openDotSurfaceRedirect(request) {
  const url = new URL(request.url);
  if (!['GET', 'HEAD'].includes(request.method)) return null;
  const path = url.pathname.replace(/\/+$/, '') || '/';
  let target = null;
  if (url.origin === BRAIN) {
    const dot = /^\/dots\/(dot_[a-zA-Z0-9_-]+)$/.exec(path);
    if (path === '/' || (dot && dot[1] !== 'dot_company_brain')) target = new URL(COMPANY_BRAIN_PATH + url.search, BRAIN);
  } else if (url.origin === RUNTIME && path === COMPANY_BRAIN_PATH) {
    target = new URL(COMPANY_BRAIN_PATH + url.search, BRAIN);
  }
  return target ? new Response(null, { status: 302, headers: { location: target.href, 'cache-control': 'private, no-store' } }) : null;
}

/** Fixed app transport, not an arbitrary URL proxy. Browser origin remains Runtime.
 * The existing OpenDot app authenticates the same company session and retains
 * all tenant, action, model, file and native execution ownership.
 */
export async function proxyRuntimeOpenDot(request, fetcher = fetch) {
  const url = new URL(request.url);
  if (!isRuntimeOpenDotRequest(url)) return null;
  const reply = (error,status) => Response.json({error},{status,headers:{'cache-control':'private, no-store'}});
  const origin = request.headers.get('origin');
  if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') return reply('origin_denied',403);
  const read = ['GET','HEAD'].includes(request.method);
  if (!read && !origin) return reply('origin_required',403);
  if (!['GET','HEAD','POST','DELETE','PATCH','PUT'].includes(request.method)) return reply('method_not_allowed',405);
  const cookie = (request.headers.get('cookie') || '').split(';').map(v=>v.trim()).find(v=>v.startsWith('hm_cp_session='));
  if (!cookie) return reply('authentication_required',401);
  const headers = new Headers({cookie,accept:request.headers.get('accept') || '*/*'});
  // Validate the browser Origin above, then present one canonical app origin to
  // Next's own action CSRF check. Never forward spoofed tenant/authority headers.
  if (origin) headers.set('origin',UPSTREAM);
  for (const key of ['content-type','rsc','next-action','next-router-state-tree','next-router-prefetch','next-url','range','if-none-match','last-event-id']) {
    if (request.headers.has(key)) headers.set(key,request.headers.get(key));
  }
  applyOpenDotSurface(headers,url);
  const target = new URL(url.pathname + url.search,UPSTREAM);
  try {
    const response = await fetcher(new Request(target,{method:request.method,headers,
      ...(!read ? {body:request.body,duplex:'half'} : {}),redirect:'manual'}));
    const output = new Headers(response.headers);
    output.delete('set-cookie');
    output.set('cache-control','private, no-store');
    const location = output.get('location');
    if (location) {
      const destination = new URL(location,UPSTREAM);
      if (destination.origin !== UPSTREAM && destination.origin !== RUNTIME && destination.origin !== BRAIN) return reply('open_dot_redirect_denied',502);
      destination.protocol = 'https:'; destination.host = url.host;
      output.set('location',destination.href);
    }
    // Keep event streams, model deltas and uploads streaming. No body buffering.
    return new Response(response.body,{status:response.status,headers:output});
  } catch { return reply('open_dot_temporarily_unavailable',502); }
}
