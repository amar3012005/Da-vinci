import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './worker.mjs';
import {
  CONTENT_SECURITY_POLICY_REPORT_ONLY, PERMISSIONS_POLICY, STRICT_TRANSPORT_SECURITY, withSecurityHeaders,
} from './security-headers.mjs';

const HTML = '<!doctype html><html><head><title>x</title></head><body></body></html>';
const env = {
  RUNTIME_RUNNER_PUBLIC_ORIGIN: 'https://runtime-runner.singulancelabs.com',
  ENVIRONMENT: 'production',
  ASSETS: { fetch: async (request) => (new URL(request.url).pathname.endsWith('.js')
    ? new Response('console.log(1)', { headers: { 'content-type': 'text/javascript' } })
    : new Response(HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } })) },
};
const ctx = { waitUntil() {} };
const go = (url) => worker.fetch(new Request(url), env, ctx);

function assertBaseline(response, label) {
  assert.equal(response.headers.get('strict-transport-security'), 'max-age=15552000', label);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', label);
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', label);
  assert.equal(response.headers.get('permissions-policy'), PERMISSIONS_POLICY, label);
}

test('header values are the agreed ones', () => {
  assert.equal(STRICT_TRANSPORT_SECURITY, 'max-age=15552000');
  assert.doesNotMatch(STRICT_TRANSPORT_SECURITY, /includeSubDomains|preload/);
  assert.match(PERMISSIONS_POLICY, /microphone=\(self\)/);
  assert.doesNotMatch(PERMISSIONS_POLICY, /microphone=\(\)/);
  assert.match(CONTENT_SECURITY_POLICY_REPORT_ONLY, /frame-ancestors 'self' https:\/\/\*\.singulancelabs\.com$/);
});

test('HTML documents on every served host carry the baseline and a report-only CSP', async () => {
  for (const host of ['next', 'icarus', 'runtime-runner', 'dev'].map((h) => `${h}.singulancelabs.com`).concat('singulancelabs.com')) {
    const response = await go(`https://${host}/hivemind/login`);
    assertBaseline(response, host);
    if ((response.headers.get('content-type') ?? '').startsWith('text/html')) {
      assert.equal(response.headers.get('content-security-policy-report-only'), CONTENT_SECURITY_POLICY_REPORT_ONLY, host);
    }
  }
  const app = await go('https://next.singulancelabs.com/hivemind/app/overview/dreaming');
  assert.equal(app.headers.get('content-security-policy-report-only'), CONTENT_SECURITY_POLICY_REPORT_ONLY);
});

test('static assets get the baseline but no document CSP', async () => {
  const response = await go('https://next.singulancelabs.com/static/js/main.abc123.js');
  assertBaseline(response, 'asset');
  assert.equal(response.headers.get('content-security-policy-report-only'), null);
  assert.equal(await response.text(), 'console.log(1)');
});

test('the wrapper never adds an enforced CSP or X-Frame-Options', () => {
  const response = withSecurityHeaders(new Response(HTML, { headers: { 'content-type': 'text/html' } }));
  assert.equal(response.headers.get('x-frame-options'), null);
  assert.equal(response.headers.get('content-security-policy'), null);
});

test('existing app-document framing policy is preserved', async () => {
  const response = await go('https://next.singulancelabs.com/hivemind/app/overview/dreaming');
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(response.headers.get('content-security-policy'), "frame-ancestors 'self'");
  const pane = await go('https://next.singulancelabs.com/hivemind/app/overview?native_pane=1');
  assert.equal(pane.headers.get('x-frame-options'), null);
  assert.match(pane.headers.get('content-security-policy'), /runtime-runner\.singulancelabs\.com/);
});

test('redirects keep status and location and gain the baseline', async () => {
  const response = await go('https://singulancelabs.com/amar-sai-gadde');
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://amar.singulancelabs.com/');
  assertBaseline(response, 'redirect');
  assert.equal(response.headers.get('content-security-policy-report-only'), null);
});

test('upstream headers, cookies and policies are not overridden', async () => {
  const upstream = new Headers({
    'content-type': 'text/html', 'referrer-policy': 'no-referrer', 'strict-transport-security': 'max-age=1',
    'content-security-policy-report-only': "default-src 'none'",
  });
  upstream.append('set-cookie', 'a=1; Path=/; Secure');
  upstream.append('set-cookie', 'b=2; Path=/; Secure');
  const response = withSecurityHeaders(new Response('x', { status: 201, statusText: 'Created', headers: upstream }));
  assert.equal(response.status, 201);
  assert.equal(response.statusText, 'Created');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('strict-transport-security'), 'max-age=1');
  assert.equal(response.headers.get('content-security-policy-report-only'), "default-src 'none'");
  assert.deepEqual(response.headers.getSetCookie(), ['a=1; Path=/; Secure', 'b=2; Path=/; Secure']);
  assert.equal(await response.text(), 'x');
});

test('null-body, WebSocket and opaque responses are not broken', async () => {
  const noContent = withSecurityHeaders(new Response(null, { status: 204 }));
  assert.equal(noContent.status, 204);
  assertBaseline(noContent, '204');
  const notModified = withSecurityHeaders(new Response(null, { status: 304 }));
  assert.equal(notModified.status, 304);
  const fake = (props) => Object.defineProperties(Object.create(Response.prototype), Object.fromEntries(Object.entries(props).map(([k, value]) => [k, { value }])));
  const socket = fake({ status: 101, webSocket: {}, headers: new Headers() });
  assert.equal(withSecurityHeaders(socket), socket);
  const opaque = fake({ status: 0, type: 'opaque' });
  assert.equal(withSecurityHeaders(opaque), opaque);
  const plain = { notAResponse: true };
  assert.equal(withSecurityHeaders(plain), plain);
});
