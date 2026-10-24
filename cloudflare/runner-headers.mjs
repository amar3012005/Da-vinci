/**
 * Request headers the Worker forwards to the native Harness runner: content
 * negotiation, the runner session cookie and bearer credential, conditional and
 * range reads, the browser Origin and fetch metadata for the runner's
 * same-authority check, request correlation, and WebSocket upgrade fields.
 * Client-supplied tenant (`x-hivemind-*`), user, authority (`host`,
 * `forwarded`, `x-real-ip`) and `x-forwarded-*` headers are never forwarded.
 */
const RUNNER_REQUEST_HEADERS = [
  'accept', 'accept-encoding', 'accept-language', 'cache-control', 'content-length', 'content-type', 'pragma',
  'authorization', 'cookie',
  'if-match', 'if-modified-since', 'if-none-match', 'if-range', 'if-unmodified-since', 'range', 'last-event-id',
  'origin', 'referer', 'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-user', 'user-agent',
  'idempotency-key', 'x-request-id',
  'connection', 'upgrade', 'sec-websocket-extensions', 'sec-websocket-key', 'sec-websocket-protocol', 'sec-websocket-version',
  'cf-connecting-ip',
];

/** Tenant and occurrence headers of bearer-authenticated service calls to the runner. */
const SERVICE_CALL_HEADERS = ['x-hivemind-tenant-id', 'x-hivemind-trigger-id', 'x-hivemind-occurrence-id'];

/**
 * Builds runner request headers from the forwarding allowlist.
 * `x-forwarded-for` is derived from Cloudflare's `cf-connecting-ip`, never copied from the client;
 * the caller sets `x-forwarded-host` and `x-forwarded-proto` from the request URL.
 * @param {Request} request Browser request received by the Worker.
 * @returns {Headers} Headers to send to the runner.
 */
export function runnerRequestHeaders(request) {
  const headers = new Headers();
  for (const name of RUNNER_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  // Service calls (for example the dreamer trigger) name their tenant and occurrence in headers. The runner trusts them only
  // together with its dispatch bearer, so forward them only beside a Bearer credential; browser requests never carry them.
  if (/^Bearer\s+\S/u.test(request.headers.get('authorization') ?? '')) {
    for (const name of SERVICE_CALL_HEADERS) {
      const value = request.headers.get(name);
      if (value !== null) headers.set(name, value);
    }
  }
  const clientIp = request.headers.get('cf-connecting-ip');
  if (clientIp) headers.set('x-forwarded-for', clientIp);
  return headers;
}
