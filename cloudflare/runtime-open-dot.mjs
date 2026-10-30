const RUNTIME = 'https://runtime-runner.singulancelabs.com';
const UPSTREAM = 'https://dots.singulancelabs.com';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const DOCUMENT = new RegExp(`^/(?:employees/${UUID}|dots/dot_[a-zA-Z0-9_-]+|settings)/?$`, 'i');
const API = /^\/api\/(?:cards\/(?:msg|card)_[a-zA-Z0-9_-]+|conversations\/conv_[a-zA-Z0-9_-]+|dots\/(?:autonomy|company-glance|team-week)|dots\/dot_[a-zA-Z0-9_-]+\/(?:agenda|control|conversations|event-watches|files|frames|input|library|live|results|screen|stream|warm|workspace)|files\/file_[a-zA-Z0-9_-]+|hivemind\/(?:setup|voice\/(?:context|events)|employees\/(?:materialize|[0-9a-f-]+\/binding))|locale|desktop\/entry|models|organization|settings\/open-dot-recovery|composio\/oauth)$/;

export function isRuntimeOpenDotRequest(url) {
  return url.origin === RUNTIME && (DOCUMENT.test(url.pathname) || API.test(url.pathname)
    || (['/', '/apps'].includes(url.pathname) && url.searchParams.get('embed') === 'hivemind')
    || url.pathname === '/images/runtime-computer.webp' || url.pathname === '/images/idle-desktop.webp');
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
  if ((origin && origin !== RUNTIME) || request.headers.get('sec-fetch-site') === 'cross-site') return reply('origin_denied',403);
  const read = ['GET','HEAD'].includes(request.method);
  if (!read && !origin) return reply('origin_required',403);
  if (!['GET','HEAD','POST','DELETE','PATCH','PUT'].includes(request.method)) return reply('method_not_allowed',405);
  const cookie = (request.headers.get('cookie') || '').split(';').map(v=>v.trim()).find(v=>v.startsWith('hm_cp_session='));
  if (!cookie) return reply('authentication_required',401);
  const headers = new Headers({cookie,accept:request.headers.get('accept') || '*/*'});
  // Validate the browser Origin above, then present one canonical app origin to
  // Next's own action CSRF check. Never forward spoofed tenant/authority headers.
  if (origin) headers.set('origin',UPSTREAM);
  for (const key of ['content-type','rsc','next-action','next-router-state-tree','next-router-prefetch','next-url','range','if-none-match']) {
    if (request.headers.has(key)) headers.set(key,request.headers.get(key));
  }
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
      if (destination.origin !== UPSTREAM && destination.origin !== RUNTIME) return reply('open_dot_redirect_denied',502);
      destination.protocol = 'https:'; destination.host = new URL(RUNTIME).host;
      output.set('location',destination.href);
    }
    // Keep event streams, model deltas and uploads streaming. No body buffering.
    return new Response(response.body,{status:response.status,headers:output});
  } catch { return reply('open_dot_temporarily_unavailable',502); }
}
