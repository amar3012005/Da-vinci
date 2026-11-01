/**
 * Baseline browser security headers for every response the Worker returns.
 * Headers an inner handler or upstream already set are kept, so route-specific
 * policies (for example the enforced `frame-ancestors` on app documents) win.
 * `X-Frame-Options` and an enforced Content-Security-Policy are deliberately
 * absent here: employee rooms are framed across the next and runtime-runner
 * origins and the iOS/macOS shells load the site.
 */

/**
 * HSTS without `includeSubDomains`: origin hosts such as harness-chat-origin
 * answer plain HTTP and admin.singulancelabs.com has no working TLS, so a
 * parent-domain pin would break them.
 */
export const STRICT_TRANSPORT_SECURITY = 'max-age=15552000';

/** Microphone stays on for voice mode and dictation; other sensors are denied. */
export const PERMISSIONS_POLICY = 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)';

/**
 * Report-only policy derived from the origins the app loads: Google Fonts,
 * Cloudflare Turnstile, PostHog EU, Composio logos and OAuth, icon CDNs, the
 * SINGULANCE subdomains and the voice WebSocket endpoints. No report endpoint.
 */
export const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://*.posthog.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.singulancelabs.com wss://*.singulancelabs.com https://*.posthog.com https://connect.composio.dev https://api.stripe.com wss://api.cartesia.ai",
  "frame-src 'self' https://*.singulancelabs.com https://challenges.cloudflare.com https://js.stripe.com https://connect.composio.dev https://cal.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.singulancelabs.com https://connect.composio.dev",
  "frame-ancestors 'self' https://*.singulancelabs.com",
].join('; ');

const ALWAYS = [
  ['strict-transport-security', STRICT_TRANSPORT_SECURITY],
  ['x-content-type-options', 'nosniff'],
  ['referrer-policy', 'strict-origin-when-cross-origin'],
  ['permissions-policy', PERMISSIONS_POLICY],
];

/**
 * Adds the baseline security headers to a response without overriding existing ones.
 * WebSocket upgrades, opaque responses and responses whose headers cannot be
 * rebuilt are returned unchanged. The body stream is passed through, not read.
 * @param {Response} response Response produced by the Worker or an upstream.
 * @returns {Response} The same response when exempt, otherwise a copy with added headers.
 */
export function withSecurityHeaders(response) {
  if (!(response instanceof Response)) return response;
  if (response.status === 101 || response.webSocket || response.type === 'opaque' || response.type === 'opaqueredirect') return response;
  const headers = new Headers(response.headers);
  for (const [name, value] of ALWAYS) if (!headers.has(name)) headers.set(name, value);
  const html = /^text\/html\b/i.test(headers.get('content-type') ?? '');
  if (html && !headers.has('content-security-policy-report-only')) {
    headers.set('content-security-policy-report-only', CONTENT_SECURITY_POLICY_REPORT_ONLY);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
