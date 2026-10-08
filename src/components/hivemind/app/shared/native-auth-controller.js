export const NATIVE_AUTH_CALLBACK = 'singulance://auth/callback';
export const NATIVE_CONTROL_PLANE = 'https://api.singulancelabs.com';
const MAX_PENDING_MS = 10 * 60 * 1000;
const URL_TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Inject native storage/transport so authentication can be tested without real credentials. */
export function createNativeAuthController({ plugin, browser, crypto, now = Date.now }) {
  let exchanging = false;
  async function start() {
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
    await plugin.setCredential({ key: 'pendingAuth', value: JSON.stringify({ state, verifier, createdAt: now() }) });
    const url = new URL('/auth/mobile/start', NATIVE_CONTROL_PLANE);
    url.search = new URLSearchParams({ callback: NATIVE_AUTH_CALLBACK, state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
    try { await browser.open({ url: url.href }); }
    catch (error) { await plugin.removeCredential({ key: 'pendingAuth' }); throw error; }
  }
  async function complete(rawUrl) {
    const url = new URL(rawUrl);
    if (url.protocol !== 'singulance:' || url.hostname !== 'auth' || url.pathname !== '/callback' || url.username || url.password || url.port || url.hash) return false;
    const code = url.searchParams.get('code'); const state = url.searchParams.get('state');
    if (url.searchParams.getAll('code').length !== 1 || url.searchParams.getAll('state').length !== 1 || !URL_TOKEN.test(code || '') || !URL_TOKEN.test(state || '')) throw new Error('invalid_native_callback');
    if (exchanging) return false;
    exchanging = true;
    try {
      const { value } = await plugin.getCredential({ key: 'pendingAuth' });
      let pending; try { pending = JSON.parse(value || 'null'); } catch { throw new Error('invalid_native_pending_auth'); }
      if (!pending || pending.state !== state || !URL_TOKEN.test(pending.verifier || '') || !Number.isFinite(pending.createdAt) || now() - pending.createdAt < 0 || now() - pending.createdAt > MAX_PENDING_MS) throw new Error('native_auth_state_mismatch_or_expired');
      // Consume before exchange: a delivered link cannot replay after restart or failed exchange.
      await plugin.removeCredential({ key: 'pendingAuth' });
      const result = await plugin.request({ url: `${NATIVE_CONTROL_PLANE}/auth/mobile/exchange`, method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, authorize: false, body: JSON.stringify({ code, state, callback: NATIVE_AUTH_CALLBACK, code_verifier: pending.verifier }) });
      if (result.status !== 200) throw new Error('native_auth_exchange_failed');
      const data = JSON.parse(result.data);
      if (data.token_type !== 'Bearer' || typeof data.session_token !== 'string' || data.session_token.length < 16 || data.expires_in <= 0) throw new Error('invalid_native_session');
      await plugin.setCredential({ key: 'cpToken', value: data.session_token });
      await browser.close().catch(() => {});
      return true;
    } finally { exchanging = false; }
  }
  async function logout() {
    try { await plugin.request({ url: `${NATIVE_CONTROL_PLANE}/auth/mobile/revoke`, method: 'POST', authorize: true, headers: { 'Content-Type': 'application/json' }, body: '{}' }); }
    finally { await Promise.all([plugin.removeCredential({ key: 'cpToken' }), plugin.removeCredential({ key: 'pendingAuth' })]); }
  }
  return { start, complete, logout };
}
