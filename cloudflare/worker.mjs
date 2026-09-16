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
const HARNESS_CHAT_FLAG_PATH = '/__hivemind/feature-flags/harness-chat';
const UI_SHELL_FLAG_PATH = '/__hivemind/feature-flags/ui-shell';
const DAY0_ONBOARDING_FLAG_PATH = '/__hivemind/feature-flags/day0-onboarding';
// Keep the Core contract stable while allowing production and Enigma to be
// released and rolled back independently in Flagship.
const DAY0_ONBOARDING_CONTRACT_KEY = 'day0_onboarding_v1';
const SINGULANCE_DAY0_ONBOARDING_FLAG_KEY = 'singulance_day0_onboarding_v1';
const ENIGMA_DAY0_ONBOARDING_FLAG_KEY = 'enigma_day0_onboarding_v1';
const HARNESS_OVERVIEW_PATH = '/hivemind/app/overview';
const MEETING_TRANSCRIBE_PATH = '/api/meetings/transcribe';
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

function flagshipContext(request, env) {
  return {
    environment: env.FLAGSHIP_ENVIRONMENT || 'production',
    surface: env.FLAGSHIP_SURFACE || 'hivemind-web',
    hostname: hostname(request),
  };
}

function dayZeroOnboardingFlagKey(env) {
  return (env.FLAGSHIP_ENVIRONMENT || 'production') === 'dev'
    ? ENIGMA_DAY0_ONBOARDING_FLAG_KEY
    : SINGULANCE_DAY0_ONBOARDING_FLAG_KEY;
}

function constantTimeBearer(request, secret) {
  const expected = `Bearer ${secret || ''}`;
  const actual = request.headers.get('authorization') || '';
  if (!secret || actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

function noIndex(response) {
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

function hasHarnessSession(request) {
  return /(?:^|;\s*)dsh-auth-[A-Za-z0-9_-]+=/.test(request.headers.get('cookie') || '');
}

function hasHarnessAdmission(request) {
  return new RegExp(`(?:^|;\\s*)${HARNESS_ADMISSION_COOKIE}=1(?:;|$)`).test(request.headers.get('cookie') || '');
}

function isHarnessRuntimePath(request, pathname) {
  return pathname.startsWith('/api/') || pathname.startsWith('/plugins/')
    // `/assets/` is shared by the public Da-vinci bundle and the embedded
    // native Harness. Only an already-admitted Harness session may reach its
    // private asset origin; otherwise this Worker must let ASSETS serve the
    // public onboarding artwork and application assets.
    || (pathname.startsWith('/assets/') && hasHarnessSession(request) && hasHarnessAdmission(request));
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

// Recover only the known relative-navigation failure mode. Keep the opaque
// session id and reject every suffix except one or more literal `overview`
// segments so malformed/cross-tenant routes never become trusted input.
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
  return harnessDocumentPath(pathname) !== null
    || pathname.startsWith('/assets/')
    || pathname === '/favicon.svg'
    || pathname === '/manifest.webmanifest';
}

async function harnessResponse(request, env) {
  if (!env.HARNESS_CHAT || typeof env.HARNESS_CHAT.fetch !== 'function') {
    return new Response('HIVE-MIND chat is temporarily unavailable', {
      status: 503,
      headers: { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  const pathname = new URL(request.url).pathname;
  const upstreamRequest = pathname === '/api/hivemind/embed/exchange'
    ? new Request(request, { redirect: 'manual' })
    : request;
  const response = await env.HARNESS_CHAT.fetch(upstreamRequest);
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

async function meetingTranscriptionResponse(request, env) {
  // The native Harness composer reuses the exact Core endpoint used by mobile
  // chat and AI Meeting Notes. Keeping the browser request same-origin avoids
  // CORS; this Worker does not select or duplicate the speech model.
  const configuredOrigin = String(env.HIVEMIND_CORE_ORIGIN || '');
  let coreOrigin;
  try {
    coreOrigin = new URL(configuredOrigin);
  } catch {
    return new Response('HIVE-MIND transcription is temporarily unavailable', {
      status: 503,
      headers: { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  if (coreOrigin.protocol !== 'https:') {
    return new Response('HIVE-MIND transcription is temporarily unavailable', {
      status: 503,
      headers: { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  const upstream = new URL(request.url);
  upstream.protocol = coreOrigin.protocol;
  upstream.host = coreOrigin.host;
  return fetch(new Request(upstream, request));
}

async function booleanFlagshipResponse(request, env, key) {
  let enabled = false;
  try {
    enabled = await env.FLAGS.getBooleanValue(key, false, flagshipContext(request, env));
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

// Core supplies the already authenticated organisation/user pair.  Browsers
// cannot use this route as a Flagship oracle, and a Flagship error never starts
// an email lifecycle.
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
      const details = await env.FLAGS.getBooleanDetails(dayZeroOnboardingFlagKey(env), false, {
        ...flagshipContext(request, env), targetingKey: `${orgId}:${userId}`, org_id: orgId, user_id: userId,
      });
      enabled = details.value === true;
      evaluationId = details.evaluationId;
    } catch {
      // Fail closed.
    }
  }
  return Response.json({
    key: DAY0_ONBOARDING_CONTRACT_KEY,
    source: 'cloudflare-flagship',
    enabled,
    ...(evaluationId ? { evaluation_id: evaluationId } : {}),
  }, { headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet' } });
}

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;

    if (pathname.startsWith('/hivemind/app/login')) {
      return Response.redirect(new URL('/hivemind/login', request.url), 302);
    }
    if (pathname === '/hivemind/app/new-session') {
      return Response.redirect(new URL(`${HARNESS_OVERVIEW_PATH}/new`, request.url), 302);
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

    // This exact endpoint belongs to HIVE Core, not the embedded Harness RPC
    // namespace. Route it before the broad native `/api/*` boundary.
    if (pathname === MEETING_TRANSCRIBE_PATH) {
      return noIndex(await meetingTranscriptionResponse(request, env));
    }

    if (pathname === DAY0_ONBOARDING_FLAG_PATH) {
      if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
      return dayZeroOnboardingFlagResponse(request, env);
    }

    // Da-vinci owns every application document, including session deep links.
    // The embedded native Harness client owns its runtime and plugin assets.
    if (isHarnessRuntimePath(request, pathname)) {
      const response = await harnessResponse(request, env);
      if ((request.headers.get('upgrade') || '').toLowerCase() === 'websocket') return response;
      return noIndex(response);
    }

    // next.preview is the sole public HIVE application authority. The Harness
    // Worker remains an internal service binding, including flag evaluation;
    // Control Plane must not depend on a second public chat hostname.
    if (pathname === HARNESS_CHAT_FLAG_PATH || pathname === UI_SHELL_FLAG_PATH) {
      return noIndex(await harnessResponse(request, env));
    }

    if (pathname === PARTNER_REFERRALS_FLAG_PATH) {
      return partnerReferralsFlagResponse(request, env);
    }
    if (pathname === '/manifest.webmanifest') {
      const manifestUrl = new URL('/manifest.json', request.url);
      return env.ASSETS.fetch(new Request(manifestUrl, request));
    }
    if (pathname === USE_TOOLS_UNIFIED_DAG_FLAG_PATH) {
      return booleanFlagshipResponse(request, env, USE_TOOLS_UNIFIED_DAG_FLAG_KEY);
    }
    if (pathname === ENABLE_TOOLS_HITL_FLAG_PATH) {
      let enabled = false;
      try {
        enabled = await env.FLAGS.getBooleanValue(ENABLE_TOOLS_HITL_FLAGSHIP_KEY, false, flagshipContext(request, env));
        if (enabled !== true) {
          enabled = await env.FLAGS.getBooleanValue(ENABLE_TOOLS_HITL_ENV_KEY, false, flagshipContext(request, env));
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
        enabled = await env.FLAGS.getBooleanValue(USE_TOOLS_DURABLE_AGENT_FLAGSHIP_KEY, false, flagshipContext(request, env));
        if (enabled !== true) {
          enabled = await env.FLAGS.getBooleanValue(USE_TOOLS_DURABLE_AGENT_ENV_KEY, false, flagshipContext(request, env));
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

    // Preserve an unauthenticated session/new deep link across the one-shot
    // Harness ticket exchange. It is only a navigation intent; authorization
    // still comes from the server-scoped Harness session list.
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
