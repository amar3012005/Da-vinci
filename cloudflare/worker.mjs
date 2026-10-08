import { agentDiscoveryResponse, isAgentDiscovery, markdownResponse, prefersMarkdown } from './agent-readiness.mjs';
import { PUBLIC_PAGES, SITE, publicSeoResponse } from './public-seo.mjs';
const STATIC_ASSET_PREFIX = '/static/';
const AGENT_SETUP_PREFIX = '/agent-setup/';
const DISCOVERY_PATHS = new Set(['/robots.txt', '/llms.txt', '/llms-full.txt', '/sitemap.xml']);
const PARTNER_REFERRALS_FLAG_PATH = '/__hivemind/feature-flags/partner-referrals';
const PARTNER_REFERRALS_FLAG_KEY = 'partner_referrals_v1';
const MEMORY_GRAPH_V2_FLAG_PATH = '/__hivemind/feature-flags/memory-graph-v2';
const MEMORY_GRAPH_V2_FLAG_KEY = 'memory_graph_v2';
const LANDING_MOBILE_V2_FLAG_PATH = '/__hivemind/feature-flags/landing-mobile-v2';
const LANDING_MOBILE_V2_FLAG_KEY = 'landing_mobile_v2';
const LANDING_MOBILE_V2_ENV_KEY = 'LANDING_MOBILE_V2';
const USE_TOOLS_UNIFIED_DAG_FLAG_PATH = '/__hivemind/feature-flags/use-tools-unified-dag';
const USE_TOOLS_UNIFIED_DAG_FLAG_KEY = 'USE_TOOLS_UNIFIED_DAG';
const USE_TOOLS_DURABLE_AGENT_FLAG_PATH = '/__hivemind/feature-flags/use-tools-durable-agent';
const USE_TOOLS_DURABLE_AGENT_FLAGSHIP_KEY = 'use-tools-durable-agent';
const USE_TOOLS_DURABLE_AGENT_ENV_KEY = 'USE_TOOLS_DURABLE_AGENT';
const ENABLE_TOOLS_HITL_FLAG_PATH = '/__hivemind/feature-flags/enable-tools-hitl';
const ENABLE_TOOLS_HITL_FLAGSHIP_KEY = 'enable-tools-hitl';
const ENABLE_TOOLS_HITL_ENV_KEY = 'ENABLE_TOOLS_HITL';
const HIVE_HARNESS_CHAT_FLAG_PATH = '/__hivemind/feature-flags/harness-chat';
const HIVE_HARNESS_CHAT_FLAG_KEY = 'hivemind_harness_chat_v1';
const DAY0_ONBOARDING_FLAG_PATH = '/__hivemind/feature-flags/day0-onboarding';
// A single default-off Flagship gate owns every deterministic lifecycle stage
// before activation.  Core only sees this stable contract and cannot enable a
// stage if Cloudflare has rolled the lifecycle back.
const PRE_ONBOARDING_LIFECYCLE_FLAG_KEY = 'pre_onboarding_lifecycle_v1';
// One rollout decides the conversation engine for a user.  "legacy" stays
// on the existing LangGraph/LangChain orchestrator; "harness" enables the
// native Cordis surface.  Do not add an intermediate browser-visible mode:
// it creates a third state that can leave a user on a native route without a
// valid native admission.
const HIVE_HARNESS_MODES = new Set(['legacy', 'harness']);
const HARNESS_OVERVIEW_PATH = '/hivemind/app/overview';
const HARNESS_EMPLOYEE_PATH = '/hivemind/app/employee/harness';
const HARNESS_ADMISSION_COOKIE = 'hm_harness_admitted';
const HARNESS_RETURN_COOKIE = 'hm_harness_return';
const PUBLIC_MARKETING_HOSTS = new Set([
  'singulancelabs.com',
  'www.singulancelabs.com',
  'davinciai.eu',
  'www.davinciai.eu',
]);

const PRIVATE_ROBOTS = `# This hostname serves an authenticated SINGULANCE application.\nUser-agent: *\nDisallow: /\n`;

function hostname(request) {
  const host = request.headers.get('host');
  return (host ? host.split(':')[0] : new URL(request.url).hostname).toLowerCase();
}

function noIndex(response) {
  // A Cloudflare WebSocket upgrade carries a socket on the Response itself.
  // Reconstructing it as an ordinary HTTP response drops that socket. There is
  // no indexable document on this transport: preserve the native upgrade.
  if (response.status === 101) return response;
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function privateDiscoveryResponse(pathname) {
  if (pathname === '/robots.txt') {
    return new Response(PRIVATE_ROBOTS, {
      headers: {
        'cache-control': 'public, max-age=3600',
        'content-type': 'text/plain; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
      },
    });
  }

  return new Response('Not found', {
    status: 404,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/plain; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  });
}

function isHtml(response) {
  return (response.headers.get('content-type') || '').toLowerCase().includes('text/html');
}

function missingAssetResponse() {
  return new Response('Static asset not found', {
    status: 404,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/plain; charset=utf-8',
      'x-content-type-options': 'nosniff',
    },
  });
}

function constantTimeBearer(request, secret) {
  const expected = `Bearer ${secret || ''}`;
  const actual = request.headers.get('authorization') || '';
  if (!secret || actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

function hasHarnessSession(request) {
  return /(?:^|;\s*)dsh-auth-[A-Za-z0-9_-]+=/.test(request.headers.get('cookie') || '');
}

function hasHarnessAdmission(request) {
  return new RegExp(`(?:^|;\\s*)${HARNESS_ADMISSION_COOKIE}=1(?:;|$)`).test(request.headers.get('cookie') || '');
}

function harnessDocumentPath(pathname) {
  if (pathname === HARNESS_OVERVIEW_PATH || pathname === `${HARNESS_OVERVIEW_PATH}/new`
    || pathname === `${HARNESS_EMPLOYEE_PATH}/new`) return pathname;
  const base = pathname.startsWith(`${HARNESS_EMPLOYEE_PATH}/session/`)
    ? HARNESS_EMPLOYEE_PATH : HARNESS_OVERVIEW_PATH;
  if (!pathname.startsWith(`${base}/session/`)) return null;
  const encoded = pathname.slice(`${base}/session/`.length);
  if (!encoded || encoded.includes('/') || encoded.length > 512) return null;
  try {
    const sessionId = decodeURIComponent(encoded);
    return sessionId && !sessionId.includes('/') && sessionId.length <= 256 ? pathname : null;
  } catch {
    return null;
  }
}

function canonicalHarnessDocumentPath(pathname) {
  const exact = harnessDocumentPath(pathname);
  if (exact !== null) return exact;
  const prefix = pathname.startsWith(`${HARNESS_EMPLOYEE_PATH}/session/`)
    ? `${HARNESS_EMPLOYEE_PATH}/session/` : `${HARNESS_OVERVIEW_PATH}/session/`;
  if (!pathname.startsWith(prefix)) return null;
  const [encoded, ...suffix] = pathname.slice(prefix.length).split('/');
  if (!encoded || suffix.length === 0 || suffix.some(segment => segment !== 'overview')) return null;
  return harnessDocumentPath(`${prefix}${encoded}`);
}

function cookieValue(request, name) {
  const match = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

function isDavinciPublicAsset(pathname) {
  // Da-vinci public files. Not Harness. Never proxy these to the runner.
  return pathname.startsWith('/assets/onboarding/') || pathname === '/assets/runtime-computer-c2305f5b.webp';
}

function isHarnessViteAsset(pathname) {
  // Harness compiled client is only files at /assets/<file>, never a subdirectory.
  // /assets/onboarding/* is Da-vinci art and must be served by this Worker’s ASSETS.
  if (isDavinciPublicAsset(pathname)) return false;
  if (!pathname.startsWith('/assets/')) return false;
  const rest = pathname.slice('/assets/'.length);
  return rest.length > 0 && !rest.includes('/');
}

function isHarnessDocumentOrAsset(request, pathname) {
  if (!hasHarnessSession(request)) return false;
  // Overview documents always belong to Da-vinci, including admitted reloads.
  // The host mounts Harness into its chat seat; standalone runner HTML would
  // replace the HIVE sidebar, header, and embedding configuration.
  return isHarnessViteAsset(pathname)
    || pathname === '/favicon.svg'
    || pathname === '/manifest.webmanifest';
}

function isHarnessRunnerRoute(pathname) {
  // Native Harness Typert RPC is same-origin POST `/api/<method>`
  // (commands/list, $events/result, agentPresets/list, subagents/list, …).
  // HIVE Core stays on the control-plane origin. Do not let SPA assets
  // answer those POSTs with 405 — that aborts ask_user_question and the
  // model asks the same question again.
  if (isDavinciPublicAsset(pathname)) return false;
  if (pathname === '/api/meetings/transcribe' || pathname.startsWith('/api/meetings/')) return false;
  return pathname.startsWith('/api/')
    || pathname.startsWith('/plugins/')
    || isHarnessViteAsset(pathname);
}

async function proxyHarnessRunner(request, env) {
  if (env.HARNESS_CHAT && typeof env.HARNESS_CHAT.fetch === 'function') {
    return env.HARNESS_CHAT.fetch(request);
  }
  if (!env.RUNNER_ORIGIN) {
    return Response.json({ error: 'runner_unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
  const incoming = new URL(request.url);
  const target = new URL(`${incoming.pathname}${incoming.search}`, env.RUNNER_ORIGIN);
  const headers = new Headers(request.headers);
  headers.set('x-forwarded-host', incoming.host);
  headers.set('x-forwarded-proto', incoming.protocol.slice(0, -1));
  // The runner verifies the public authority supplied by its configured proxy.
  // Preserve the actual browser Origin for that same-authority fence. Rewriting
  // it to the tunnel origin makes valid session RPCs and WebSockets fail 403.
  return fetch(new Request(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    credentials: 'include',
    redirect: 'manual',
  }));
}

async function harnessResponse(request, env) {
  const pathname = new URL(request.url).pathname;
  const documentUrl = new URL(request.url);
  if (harnessDocumentPath(pathname) !== null) documentUrl.pathname = '/';
  const upstreamRequest = harnessDocumentPath(pathname) !== null
    ? new Request(documentUrl, request)
    : pathname === '/api/hivemind/embed/exchange'
      ? new Request(request, { redirect: 'manual' })
      : request;
  const response = await proxyHarnessRunner(upstreamRequest, env);

  if (pathname === '/api/hivemind/embed/exchange' && (response.ok || response.status === 303)) {
    const headers = new Headers(response.headers);
    headers.append('set-cookie', `${HARNESS_ADMISSION_COOKIE}=1; Path=/; Max-Age=3600; Secure; HttpOnly; SameSite=Strict`);
    headers.append('set-cookie', `${HARNESS_RETURN_COOKIE}=; Path=/api/hivemind/embed/exchange; Max-Age=0; Secure; HttpOnly; SameSite=Strict`);
    const requested = cookieValue(request, HARNESS_RETURN_COOKIE);
    let destination = HARNESS_OVERVIEW_PATH;
    if (requested) {
      try { destination = harnessDocumentPath(decodeURIComponent(requested)) || HARNESS_OVERVIEW_PATH; } catch { /* fail closed */ }
    }
    if (response.status === 303) headers.set('location', destination);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  // The in-page client uses the JSON establishment endpoint rather than the
  // navigation exchange. Mirror the successful admission marker here so its
  // immediate authenticated boot request reaches the runner, not SPA assets.
  if (pathname === '/api/hivemind/session/establish' && response.ok) {
    const headers = new Headers(response.headers);
    headers.append('set-cookie', `${HARNESS_ADMISSION_COOKIE}=1; Path=/; Max-Age=3600; Secure; HttpOnly; SameSite=Strict`);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  const runnerRejectedPrincipal = harnessDocumentPath(pathname) !== null && (
    response.status === 401
    || response.status === 403
    || ((response.headers.get('content-type') || '').startsWith('text/plain')
      && (await response.clone().text()).trim() === 'HIVE-MIND authentication required')
  );
  if (runnerRejectedPrincipal) {
    const fallback = await env.ASSETS.fetch(request);
    const headers = new Headers(fallback.headers);
    headers.append('set-cookie', `${HARNESS_ADMISSION_COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`);
    return new Response(fallback.body, { status: fallback.status, statusText: fallback.statusText, headers });
  }
  if (harnessDocumentPath(pathname) === null || !isHtml(response)) return response;
  const html = (await response.text())
    .replaceAll('href="./manifest.webmanifest"', 'href="/manifest.webmanifest"')
    .replaceAll('href="./favicon.svg"', 'href="/favicon.svg"')
    .replaceAll('src="./assets/', 'src="/assets/')
    .replaceAll('href="./assets/', 'href="/assets/');
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'private, no-store');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

async function harnessChatFlagResponse(request, env) {
  if (!constantTimeBearer(request, env.HIVE_HARNESS_EDGE_EVAL_SECRET)) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers: { 'cache-control': 'no-store' } });
  }
  const body = await request.json().catch(() => ({}));
  const orgId = typeof body?.org_id === 'string' ? body.org_id : '';
  const userId = typeof body?.user_id === 'string' ? body.user_id : '';
  let variation = 'legacy';
  let evaluationId;
  try {
    const details = await env.FLAGS.getStringDetails(HIVE_HARNESS_CHAT_FLAG_KEY, 'legacy', {
      targetingKey: `${orgId}:${userId}`, org_id: orgId, user_id: userId,
      environment: env.ENVIRONMENT || 'production', surface: 'hivemind-web', hostname: hostname(request),
    });
    if (HIVE_HARNESS_MODES.has(details.value)) variation = details.value;
    evaluationId = details.evaluationId;
  } catch {
    // Fail closed: a flag outage leaves the existing legacy surface intact.
  }
  return Response.json({
    key: HIVE_HARNESS_CHAT_FLAG_KEY,
    source: 'cloudflare-flagship',
    variation,
    ...(evaluationId ? { evaluation_id: evaluationId } : {}),
  }, { headers: { 'cache-control': 'no-store' } });
}

// This is a private Core-to-edge evaluation.  The bearer check ensures that
// neither the browser nor a caller-controlled org/user pair can use this as a
// Flagship oracle.  Flagship remains the sole rollout authority.
async function dayZeroOnboardingFlagResponse(request, env) {
  if (!constantTimeBearer(request, env.HIVE_HARNESS_EDGE_EVAL_SECRET)) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers: { 'cache-control': 'no-store' } });
  }
  const body = await request.json().catch(() => ({}));
  const orgId = typeof body?.org_id === 'string' ? body.org_id : '';
  const userId = typeof body?.user_id === 'string' ? body.user_id : '';
  let enabled = false;
  let evaluationId;
  if (orgId && userId) {
    try {
      const details = await env.FLAGS.getBooleanDetails(PRE_ONBOARDING_LIFECYCLE_FLAG_KEY, false, {
        targetingKey: `${orgId}:${userId}`, org_id: orgId, user_id: userId,
        environment: env.ENVIRONMENT || 'production', surface: 'hivemind-web', hostname: hostname(request),
      });
      enabled = details.value === true;
      evaluationId = details.evaluationId;
    } catch {
      // A Flagship outage cannot start a lifecycle email.
    }
  }
  return Response.json({
    key: PRE_ONBOARDING_LIFECYCLE_FLAG_KEY,
    source: 'cloudflare-flagship',
    enabled,
    ...(evaluationId ? { evaluation_id: evaluationId } : {}),
  }, {
    headers: {
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  });
}

async function booleanFlagshipResponse(request, env, key) {
  let enabled = false;
  try {
    enabled = await env.FLAGS.getBooleanValue(key, false, {
      environment: 'production',
      surface: 'hivemind-web',
      hostname: hostname(request),
    });
  } catch {
    // Public gates fail closed if Flagship cannot be evaluated.
  }

  return new Response(JSON.stringify({
    key,
    enabled: enabled === true,
    source: 'cloudflare-flagship',
  }), {
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  });
}

async function partnerReferralsFlagResponse(request, env) {
  return booleanFlagshipResponse(request, env, PARTNER_REFERRALS_FLAG_KEY);
}

async function mobileLandingFlagResponse(request, env) {
  // This launch is intentionally enabled for everyone. The Worker variable is
  // the durable rollout baseline; Flagship can still return false for an
  // immediate no-deploy rollback or later audience targeting.
  const defaultEnabled = String(env[LANDING_MOBILE_V2_ENV_KEY] ?? 'true').toLowerCase() !== 'false';
  let enabled = defaultEnabled;
  try {
    enabled = await env.FLAGS.getBooleanValue(LANDING_MOBILE_V2_FLAG_KEY, defaultEnabled, {
      environment: env.ENVIRONMENT || 'production',
      surface: 'hivemind-public-mobile',
      hostname: hostname(request),
    });
  } catch {
    // Preserve the globally-enabled launch baseline during a Flagship outage.
  }

  return Response.json({
    key: LANDING_MOBILE_V2_FLAG_KEY,
    enabled: enabled === true,
    source: 'cloudflare-flagship',
  }, {
    headers: {
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (url.protocol === 'http:' && env.ENVIRONMENT !== 'development') {
      url.protocol = 'https:';
      return Response.redirect(url.href, 308);
    }
    // Dedicated public product host never enters authenticated app or gateway routing.
    if (hostname(request) === 'runtime.singulancelabs.com') {
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405, headers:{allow:'GET, HEAD'}});
      if (pathname === '/runtime') return Response.redirect(new URL('/', request.url), 308);
      if (pathname === '/') {
        if (prefersMarkdown(request.headers.get('accept'))) return markdownResponse(request, '/runtime');
        const documentRequest = new Request(new URL('/', request.url), request);
        documentRequest.headers.delete('if-none-match');
        documentRequest.headers.delete('if-modified-since');
        return publicSeoResponse(await env.ASSETS.fetch(documentRequest), '/runtime');
      }
      if (pathname === '/robots.txt') return new Response('User-agent: *\nAllow: /\n', {headers:{'content-type':'text/plain'}});
      if (/^\/(?:static|assets)\//u.test(pathname) || ['/favicon.ico','/logo.svg','/singulance-mark-192.png','/manifest.json'].includes(pathname)) {
        const asset = await env.ASSETS.fetch(request);
        if ((asset.headers.get('content-type') || '').includes('text/html')) return new Response('Not found', {status:404});
        return asset;
      }
      return new Response('Not found', {status:404, headers:{'x-robots-tag':'noindex','cache-control':'no-store'}});
    }
    const publicHost = PUBLIC_MARKETING_HOSTS.has(hostname(request));
    if (publicHost && hostname(request) !== 'singulancelabs.com') {
      return Response.redirect(`${SITE}${pathname}${url.search}`, 308);
    }
    // Public landing and product descriptions on the app host contain no account data.
    const appPublicHost = hostname(request) === 'next.singulancelabs.com';
    if (appPublicHost && (DISCOVERY_PATHS.has(pathname) || (isAgentDiscovery(pathname) && !pathname.includes('/app/')))) {
      const landingDoc = pathname === '/index.md' || pathname === '/index.txt' ? `/hivemind${pathname}` : pathname;
      return Response.redirect(`${SITE}${landingDoc}`, 302);
    }
    const publicEntry = appPublicHost && ['/', '/hivemind', '/tara', '/hyperagents'].includes(pathname);
    if (publicEntry && ['GET', 'HEAD'].includes(request.method)) {
      const pagePath = pathname === '/' ? '/hivemind' : pathname;
      if (prefersMarkdown(request.headers.get('accept'))) return markdownResponse(request, pagePath);
      const document = await env.ASSETS.fetch(new Request(new URL('/', request.url), request));
      const rendered = publicSeoResponse(document, pagePath);
      const headers = new Headers(rendered.headers);
      headers.set('x-robots-tag', 'noindex, follow');
      return new Response(rendered.body, {status:rendered.status, headers});
    }
    if (isAgentDiscovery(pathname)) {
      if (!publicHost) return privateDiscoveryResponse(pathname);
      const discovery = await agentDiscoveryResponse(request, pathname);
      if (discovery) return discovery;
      return privateDiscoveryResponse(pathname);
    }
    const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/+$/u, '').toLowerCase();
    if (publicHost && PUBLIC_PAGES[cleanPath] && cleanPath !== pathname) {
      return Response.redirect(`${SITE}${cleanPath}${url.search}`, 308);
    }
    if (publicHost && PUBLIC_PAGES[pathname] && ['GET', 'HEAD'].includes(request.method)) {
      if (prefersMarkdown(request.headers.get('accept'))) return markdownResponse(request, pathname);
      const documentRequest = new Request(new URL('/', request.url), request);
      documentRequest.headers.delete('if-none-match');
      documentRequest.headers.delete('if-modified-since');
      const document = await env.ASSETS.fetch(documentRequest);
      return publicSeoResponse(document, pathname);
    }
    const privatePath = /^\/(?:hivemind|enterprise|prometheus|invite|api|plugins|__hivemind)(?:\/|$)/u.test(pathname) || pathname === '/underprogress';
    if (publicHost && !privatePath && !DISCOVERY_PATHS.has(pathname) && !pathname.split('/').pop().includes('.') && ['GET', 'HEAD'].includes(request.method)) {
      return new Response('<!doctype html><html lang="en"><head><title>Page not found | SINGULANCE</title><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main><h1>Page not found</h1><p><a href="/">SINGULANCE home</a> · <a href="/research">Research</a></p></main></body></html>', { status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex', 'cache-control': 'no-store' } });
    }

    if (pathname.startsWith('/hivemind/app/login')) {
      return Response.redirect(new URL('/hivemind/login', request.url), 302);
    }
    const canonicalHarnessPath = canonicalHarnessDocumentPath(pathname);
    if (canonicalHarnessPath !== null && canonicalHarnessPath !== pathname) {
      return Response.redirect(new URL(canonicalHarnessPath, request.url), 302);
    }
    // Recover the legacy relative-router suffix before loading any cached shell.
    if (/^\/hivemind\/app\/crm(?:\/overview)+\/?$/u.test(pathname)) {
      const canonicalCRM = new URL(request.url);
      canonicalCRM.pathname = '/hivemind/app/crm';
      return Response.redirect(canonicalCRM, 302);
    }
    if (/^\/hivemind\/app\/overview(?:\/overview)+\/?$/u.test(pathname)) {
      return Response.redirect(new URL(HARNESS_OVERVIEW_PATH, request.url), 302);
    }
    if (pathname === '/hivemind/app/v1/overview') {
      return Response.redirect(new URL(HARNESS_OVERVIEW_PATH, request.url), 302);
    }

    if (pathname === HIVE_HARNESS_CHAT_FLAG_PATH) {
      if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
      return harnessChatFlagResponse(request, env);
    }
    if (pathname === DAY0_ONBOARDING_FLAG_PATH) {
      if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
      return dayZeroOnboardingFlagResponse(request, env);
    }
    // Company Settings uses the native tenant principal without mounting chat.
    if (['/hivemind/dreamer/settings', '/hivemind/dreamer/agenda', '/hivemind/dreamer/connectors', '/hivemind/dreamer/credits'].includes(pathname)) {
      if (!hasHarnessSession(request)) {
        return new Response(JSON.stringify({ error: 'authentication_required' }), {
          status: 401, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        });
      }
      return noIndex(await harnessResponse(request, env));
    }
    // Establishment validates a signed ticket at the runner. Boot must also
    // reach native authorization without cookies so liveness sees an expired
    // session as 401, never a successful SPA document. Cookie presence below
    // selects the carrier only; the runner validates the actual principal.
    // The short-lived edge marker must not strand a longer-lived native session.
    if (pathname === '/api/hivemind/embed/exchange'
      || pathname === '/api/hivemind/session/establish'
      || pathname === '/api/hivemind/boot'
      || isHarnessDocumentOrAsset(request, pathname)
      || ((hasHarnessAdmission(request) || hasHarnessSession(request)) && isHarnessRunnerRoute(pathname))) {
      return noIndex(await harnessResponse(request, env));
    }

    if (pathname === PARTNER_REFERRALS_FLAG_PATH) {
      return partnerReferralsFlagResponse(request, env);
    }
    if (pathname === MEMORY_GRAPH_V2_FLAG_PATH) {
      if (request.method !== 'GET') return new Response(null, { status: 405, headers: { allow: 'GET' } });
      return booleanFlagshipResponse(request, env, MEMORY_GRAPH_V2_FLAG_KEY);
    }
    if (pathname === LANDING_MOBILE_V2_FLAG_PATH) {
      if (request.method !== 'GET') return new Response(null, { status: 405, headers: { allow: 'GET' } });
      return mobileLandingFlagResponse(request, env);
    }
    if (pathname === USE_TOOLS_UNIFIED_DAG_FLAG_PATH) {
      return booleanFlagshipResponse(request, env, USE_TOOLS_UNIFIED_DAG_FLAG_KEY);
    }
    if (pathname === ENABLE_TOOLS_HITL_FLAG_PATH) {
      let enabled = false;
      try {
        enabled = await env.FLAGS.getBooleanValue(ENABLE_TOOLS_HITL_FLAGSHIP_KEY, false, {
          environment: 'production',
          surface: 'hivemind-web',
          hostname: hostname(request),
        });
        if (enabled !== true) {
          enabled = await env.FLAGS.getBooleanValue(ENABLE_TOOLS_HITL_ENV_KEY, false, {
            environment: 'production',
            surface: 'hivemind-web',
            hostname: hostname(request),
          });
        }
      } catch {
        // Public gates fail closed if Flagship cannot be evaluated.
      }
      return new Response(JSON.stringify({
        key: ENABLE_TOOLS_HITL_FLAGSHIP_KEY,
        enabled: enabled === true,
        source: 'cloudflare-flagship',
      }), {
        headers: {
          'cache-control': 'no-store',
          'content-type': 'application/json; charset=utf-8',
          'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
        },
      });
    }
    if (pathname === USE_TOOLS_DURABLE_AGENT_FLAG_PATH) {
      let enabled = false;
      try {
        enabled = await env.FLAGS.getBooleanValue(USE_TOOLS_DURABLE_AGENT_FLAGSHIP_KEY, false, {
          environment: 'production',
          surface: 'hivemind-web',
          hostname: hostname(request),
        });
        if (enabled !== true) {
          enabled = await env.FLAGS.getBooleanValue(USE_TOOLS_DURABLE_AGENT_ENV_KEY, false, {
            environment: 'production',
            surface: 'hivemind-web',
            hostname: hostname(request),
          });
        }
      } catch {
        // Public gates fail closed if Flagship cannot be evaluated.
      }
      return new Response(JSON.stringify({
        key: USE_TOOLS_DURABLE_AGENT_FLAGSHIP_KEY,
        enabled: enabled === true,
        source: 'cloudflare-flagship',
      }), {
        headers: {
          'cache-control': 'no-store',
          'content-type': 'application/json; charset=utf-8',
          'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
        },
      });
    }

    // The same Worker powers the public marketing hostname and authenticated
    // application hostnames. Never advertise private hosts through discovery
    // files, even though all assets are stored in one bundle.
    if (DISCOVERY_PATHS.has(pathname) && !PUBLIC_MARKETING_HOSTS.has(hostname(request))) {
      return privateDiscoveryResponse(pathname);
    }

    // All HIVE pages are client routes of the same current document. Fetch
    // index explicitly instead of caching a separate SPA fallback per route.
    // Only content-hashed assets, never the authenticated app shell, are cached.
    const appDocument = request.method === 'GET'
      && pathname.startsWith('/hivemind/')
      && !pathname.split('/').pop().includes('.');
    const assetRequest = appDocument
      ? new Request(new URL('/', request.url), request)
      : request;
    let response = await env.ASSETS.fetch(assetRequest);
    if (pathname === '/assets/runtime-computer-c2305f5b.webp' && isHtml(response)) {
      return new Response('Asset not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
    }
    if (appDocument && isHtml(response)) {
      const headers = new Headers(response.headers);
      headers.set('cache-control', 'private, no-store');
      headers.set('cdn-cache-control', 'no-store');
      response = new Response(response.body, { status: response.status, headers });
    }

    // Preserve an unauthenticated Overview deep link through the one-shot
    // admission exchange. It is navigation intent only, never authorization.
    if (!hasHarnessAdmission(request) && harnessDocumentPath(pathname) !== null && isHtml(response)) {
      const headers = new Headers(response.headers);
      headers.append('set-cookie', `${HARNESS_RETURN_COOKIE}=${encodeURIComponent(pathname)}; Path=/api/hivemind/embed/exchange; Max-Age=300; Secure; HttpOnly; SameSite=Strict`);
      return noIndex(new Response(response.body, { status: response.status, statusText: response.statusText, headers }));
    }

    // SPA fallback must never turn a missing executable asset into index.html.
    if ((pathname.startsWith(STATIC_ASSET_PREFIX) || pathname.startsWith(AGENT_SETUP_PREFIX)) && isHtml(response)) {
      return missingAssetResponse();
    }

    return publicHost && !privatePath ? response : noIndex(response);
  },
};
