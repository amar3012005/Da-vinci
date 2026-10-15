/** App-only recovery. Server authorization remains authoritative. */
export function createNativeSessionRecovery({ request, admit, establish, checkBridge }) {
  let pending;
  let generation = 0;
  let scope = 0;
  const refresh = () => {
    if (pending) return pending;
    const owner = scope;
    const assertOwner = () => { if (owner !== scope) throw new DOMException('Account changed', 'AbortError'); };
    const current = (async () => {
      await checkBridge();
      assertOwner();
      const admission = await admit();
      assertOwner();
      if (admission?.mode !== 'harness' || typeof admission.ticket !== 'string' || !admission.ticket) {
        throw new Error('This iPhone app could not obtain a secure chat session.');
      }
      await establish(admission.ticket);
      assertOwner();
      generation++;
    })();
    pending = current;
    void current.finally(() => { if (pending === current) pending = undefined; }).catch(() => {});
    return current;
  };
  return {
    refresh,
    reset() { scope++; generation++; pending = undefined; },
    async fetch(input, init = {}) {
      if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const owner = scope;
      await checkBridge();
      if (owner !== scope || init.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      const pathname = new URL(String(input), 'https://next.singulancelabs.com').pathname;
      const read = ['GET', 'HEAD'].includes(String(init.method || 'GET').toUpperCase());
      // Retry reads only. Never replay a prompt, upload, approval or other mutation.
      const recoverable = read && pathname.startsWith('/api/') && !pathname.startsWith('/api/hivemind/session/');
      const before = generation;
      const response = await request(input, init);
      if (owner !== scope) throw new DOMException('Account changed', 'AbortError');
      const html = response.ok && /text\/html/i.test(response.headers.get('content-type') || '')
        && ['/api/hivemind/employees', '/api/hivemind/boot', '/api/hivemind/workspace-shell'].includes(pathname);
      if (!recoverable || (!html && ![401, 403].includes(response.status))) return response;
      if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (generation === before) await refresh();
      if (owner !== scope) throw new DOMException('Account changed', 'AbortError');
      if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const retried = await request(input, init);
      if (owner !== scope) throw new DOMException('Account changed', 'AbortError');
      return retried;
    },
  };
}

export function nativeAdmissionMessage(error) {
  const data = error?.response?.data;
  const code = data?.code || data?.error?.code || data?.error;
  if (code === 'MOBILE_RUNNER_NOT_READY') {
    return 'You are signed in, but this service has not enabled iPhone chat access yet. Signing in again will not resolve this.';
  }
  if (error?.response?.status === 401) return 'Your sign-in has expired. Please sign in again.';
  if (error?.response?.status === 403) return 'This account does not currently have permission to open this chat.';
  return 'Your iPhone could not connect to chat. Check your connection and try again.';
}
