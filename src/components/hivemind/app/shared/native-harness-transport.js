import { base64ToBytes, nativeRequestBody } from './native-body';
const RUNNER = 'https://next.singulancelabs.com';
const LOCAL_ORIGINS = new Set(['capacitor://localhost', 'https://localhost', 'http://localhost']);

export function trustedHarnessUrl(input) {
  const url = new URL(String(input), RUNNER);
  if (url.origin !== RUNNER && !LOCAL_ORIGINS.has(`${url.protocol}//${url.host}`)) throw new Error('untrusted_native_harness_origin');
  if (url.username || url.password || url.hash || !['/api/', '/plugins/', '/assets/'].some(prefix => url.pathname.startsWith(prefix))) throw new Error('untrusted_native_harness_path');
  return `${RUNNER}${url.pathname}${url.search}`;
}

/** Native OS cookie jar carries authenticated runner HTTP; no global browser fetch changes. */
export function createNativeHarnessFetch(plugin) {
  return async (input, init = {}) => {
    if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const headers = new Headers(init.headers);
    const body = await nativeRequestBody(init.body, headers.get('content-type'));
    const { contentType, ...options } = body;
    const result = await plugin.request({ url: trustedHarnessUrl(input), method: init.method || 'GET', headers: { Accept: headers.get('accept') || '*/*', ...(contentType ? { 'Content-Type': contentType } : {}) }, ...options, responseType: 'base64', authorize: false });
    if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return new Response([204, 205, 304].includes(result.status) || init.method === 'HEAD' ? null : result.encoding === 'base64' ? base64ToBytes(result.data) : result.data, { status: result.status, headers: result.headers });
  };
}

/** Decode the current DSH Remote mux frames into the existing RpcStreamOpen seam. */
export function createNativeHarnessStream(plugin) {
  return async function* openStream(endpoint, payload, signal) {
    if (signal.aborted) throw signal.reason || new DOMException('Aborted', 'AbortError');
    const id = crypto.randomUUID();
    const queue = []; let wake; let ended = false; let failure;
    const waitForFrame = () => new Promise(resolve => { wake = resolve; });
    const notify = () => { wake?.(); wake = undefined; };
    const fail = error => { failure = error; ended = true; notify(); };
    const abort = () => fail(signal.reason || new DOMException('Aborted', 'AbortError'));
    const listener = await plugin.addListener('streamEvent', event => {
      if (event.id !== id || ended) return;
      if (event.type === 'error') { fail(new Error('Native Harness stream interrupted')); return; }
      if (event.type === 'end') { ended = true; notify(); return; }
      if (event.type !== 'frame') return;
      try {
        const frame = JSON.parse(event.data);
        if (!frame || typeof frame !== 'object' || frame.streamId !== id) throw new Error('Native Harness stream correlation failed');
        const keys = Object.keys(frame).sort().join(',');
        if (frame.type === 'item' && ['streamId,type', 'streamId,type,value'].includes(keys)) {
          if (queue.length >= 1024) throw new Error('Native Harness stream queue exceeded');
          queue.push(frame.value); notify();
        } else if (frame.type === 'end' && keys === 'streamId,type') { ended = true; notify(); }
        else if (frame.type === 'error' && keys === 'error,streamId,type' && frame.error && typeof frame.error.code === 'string' && typeof frame.error.message === 'string' && frame.error.details && typeof frame.error.details === 'object' && !Array.isArray(frame.error.details) && Object.keys(frame.error).sort().join(',') === 'code,details,message') {
          const error = new Error(frame.error.message); error.name = 'RemoteError'; error.code = frame.error.code; error.details = frame.error.details; fail(error);
        } else throw new Error('Invalid native Harness stream frame');
      } catch (error) { fail(error); }
    });
    signal.addEventListener('abort', abort, { once: true });
    try {
      if (signal.aborted) abort();
      if (!ended) await plugin.openStream({ id, endpoint, payload });
      while (true) {
        if (failure) throw failure;
        if (queue.length) { yield queue.shift(); continue; }
        if (ended) return;
        await waitForFrame();
      }
    } finally {
      signal.removeEventListener('abort', abort);
      await plugin.closeStream({ id }).catch(() => {});
      await listener.remove();
    }
  };
}
