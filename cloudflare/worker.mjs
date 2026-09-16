const STATIC_ASSET_PREFIX = '/static/';
const AGENT_SETUP_PREFIX = '/agent-setup/';
const DISCOVERY_PATHS = new Set(['/robots.txt', '/llms.txt', '/llms-full.txt', '/sitemap.xml']);
const PARTNER_REFERRALS_FLAG_PATH = '/__hivemind/feature-flags/partner-referrals';
const PARTNER_REFERRALS_FLAG_KEY = 'partner_referrals_v1';
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
const DAY0_ONBOARDING_FLAG_KEY = 'day0_onboarding_v1';
// One rollout decides the conversation engine for a user.  "legacy" stays
// on the existing LangGraph/LangChain orchestrator; "harness" enables the
// native Cordis surface.  Do not add an intermediate browser-visible mode:
// it creates a third state that can leave a user on a native route without a
// valid native admission.
const HIVE_HARNESS_MODES = new Set(['legacy', 'harness']);
const HARNESS_OVERVIEW_PATH = '/hivemind/app/overview';
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
  if (pathname === HARNESS_OVERVIEW_PATH || pathname === `${HARNESS_OVERVIEW_PATH}/new`) return pathname;
  if (!pathname.startsWith(`${HARNESS_OVERVIEW_PATH}/session/`)) return null;
  const encoded = pathname.slice(`${HARNESS_OVERVIEW_PATH}/session/`.length);
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
  const prefix = `${HARNESS_OVERVIEW_PATH}/session/`;
  if (!pathname.startsWith(prefix)) return null;
  const [encoded, ...suffix] = pathname.slice(prefix.length).split('/');
  if (!encoded || suffix.length === 0 || suffix.some(segment => segment !== 'overview')) return null;
  return harnessDocumentPath(`${prefix}${encoded}`);
}

function cookieValue(request, name) {
  const match = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

function isHarnessDocumentOrAsset(request, pathname) {
  if (!hasHarnessSession(request) || !hasHarnessAdmission(request)) return false;
  // Overview documents always belong to Da-vinci, including admitted reloads.
  // The host mounts Harness into its chat seat; standalone runner HTML would
  // replace the HIVE sidebar, header, and embedding configuration.
  return pathname.startsWith('/assets/')
    || pathname === '/favicon.svg'
    || pathname === '/manifest.webmanifest';
}

function isHarnessRunnerRoute(pathname) {
  // Keep the HIVE Worker authoritative for its own app/API surface. Native
  // Harness owns the generic session controller and the dynamic Cordis
  // inspection namespace; treating only the initial ticket routes as native
  // leaves a successfully booted client unable to create its first session.
  // Do not proxy the broad `/api/*` namespace: HIVE's own APIs remain local.
  return pathname === '/api/hivemind/embed/exchange'
    || pathname === '/api/hivemind/session/establish'
    || pathname === '/api/hivemind/boot'
    || pathname === '/api/hivemind/projects'
    || pathname === '/api/hivemind/connectors'
    || pathname === '/api/remote.mux'
    || pathname.startsWith('/api/session/')
    || pathname.startsWith('/api/dynamicCordisRunner/')
    || pathname.startsWith('/plugins/')
    || pathname.startsWith('/assets/');
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
      const details = await env.FLAGS.getBooleanDetails(DAY0_ONBOARDING_FLAG_KEY, false, {
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
    key: DAY0_ONBOARDING_FLAG_KEY,
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

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;

    if (pathname.startsWith('/hivemind/app/login')) {
      return Response.redirect(new URL('/hivemind/login', request.url), 302);
    }
    const canonicalHarnessPath = canonicalHarnessDocumentPath(pathname);
    if (canonicalHarnessPath !== null && canonicalHarnessPath !== pathname) {
      return Response.redirect(new URL(canonicalHarnessPath, request.url), 302);
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
    // Establishment is the one runner route that necessarily precedes the
    // admission cookie.  The runner validates the signed, short-lived ticket
    // carried in this request; every later runner route remains cookie-gated.
    if (pathname === '/api/hivemind/embed/exchange'
      || pathname === '/api/hivemind/session/establish'
      || isHarnessDocumentOrAsset(request, pathname)
      || (hasHarnessAdmission(request) && isHarnessRunnerRoute(pathname))) {
      return noIndex(await harnessResponse(request, env));
    }

    if (pathname === PARTNER_REFERRALS_FLAG_PATH) {
      return partnerReferralsFlagResponse(request, env);
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

    const response = await env.ASSETS.fetch(request);

    // Preserve an unauthenticated Overview deep link through the one-shot
    // admission exchange. It is navigation intent only, never authorization.
    if (!hasHarnessAdmission(request) && harnessDocumentPath(pathname) !== null && isHtml(response)) {
      const headers = new Headers(response.headers);
      headers.append('set-cookie', `${HARNESS_RETURN_COOKIE}=${encodeURIComponent(pathname)}; Path=/api/hivemind/embed/exchange; Max-Age=300; Secure; HttpOnly; SameSite=Strict`);
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    // SPA fallback must never turn a missing executable asset into index.html.
    if ((pathname.startsWith(STATIC_ASSET_PREFIX) || pathname.startsWith(AGENT_SETUP_PREFIX)) && isHtml(response)) {
      return missingAssetResponse();
    }

    return PUBLIC_MARKETING_HOSTS.has(hostname(request)) ? response : noIndex(response);
  },
};
