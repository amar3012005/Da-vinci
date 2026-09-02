const STATIC_ASSET_PREFIX = '/static/';
const AGENT_SETUP_PREFIX = '/agent-setup/';
const DISCOVERY_PATHS = new Set(['/robots.txt', '/llms.txt', '/llms-full.txt', '/sitemap.xml']);
const PARTNER_REFERRALS_FLAG_PATH = '/__hivemind/feature-flags/partner-referrals';
const PARTNER_REFERRALS_FLAG_KEY = 'partner_referrals_v1';
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

async function partnerReferralsFlagResponse(request, env) {
  let enabled = false;
  try {
    enabled = await env.FLAGS.getBooleanValue(PARTNER_REFERRALS_FLAG_KEY, false, {
      environment: 'production',
      surface: 'hivemind-web',
      hostname: hostname(request),
    });
  } catch {
    // The public gate fails closed if Flagship cannot be evaluated.
  }

  return new Response(JSON.stringify({
    key: PARTNER_REFERRALS_FLAG_KEY,
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

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;

    if (pathname === PARTNER_REFERRALS_FLAG_PATH) {
      return partnerReferralsFlagResponse(request, env);
    }

    // The same Worker powers the public marketing hostname and authenticated
    // application hostnames. Never advertise private hosts through discovery
    // files, even though all assets are stored in one bundle.
    if (DISCOVERY_PATHS.has(pathname) && !PUBLIC_MARKETING_HOSTS.has(hostname(request))) {
      return privateDiscoveryResponse(pathname);
    }

    const response = await env.ASSETS.fetch(request);

    // SPA fallback must never turn a missing executable asset into index.html.
    if ((pathname.startsWith(STATIC_ASSET_PREFIX) || pathname.startsWith(AGENT_SETUP_PREFIX)) && isHtml(response)) {
      return missingAssetResponse();
    }

    return PUBLIC_MARKETING_HOSTS.has(hostname(request)) ? response : noIndex(response);
  },
};
