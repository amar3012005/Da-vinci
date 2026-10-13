import axios from 'axios';
import { nativeRequestBody, base64ToBytes } from './native-body';
import { NATIVE_CONTROL_PLANE } from './native-auth-controller';

let lastSessionCheckAt = 0;

/** Keep bearer credentials inside the trusted OS plugin, including on failed requests. */
export function createNativeApiAdapter(plugin, { coreProxy = false } = {}) {
  return async config => {
    const path = String(config.url || '');
    if (!path.startsWith('/') || path.startsWith('//') || /[\\\r\n]/.test(path)) throw new Error('untrusted_native_api_path');
    const segments = path.split('?')[0].split('/');
    if (segments.some(segment => { try { return ['.', '..'].includes(decodeURIComponent(segment)); } catch { return true; } })) throw new Error('untrusted_native_api_path');
    if (coreProxy && !path.startsWith('/api/')) throw new Error('unsupported_native_core_path');
    const mapped = coreProxy ? `/v1/proxy/${path.slice(5)}` : path;
    const url = new URL(mapped, NATIVE_CONTROL_PLANE);
    const params = new URLSearchParams(config.params || {});
    for (const [key, value] of params) url.searchParams.append(key, value);
    if (config.signal?.aborted) throw new axios.CanceledError('canceled');
    const headers = { Accept: 'application/json' };
    const requestedType = config.headers?.get?.('Content-Type') || config.headers?.['Content-Type'] || config.headers?.['content-type'];
    const payload = await nativeRequestBody(config.data, requestedType);
    if (payload.contentType) headers['Content-Type'] = payload.contentType;
    const { contentType, ...bodyOptions } = payload;
    const binary = ['blob', 'arraybuffer'].includes(config.responseType);
    const result = await plugin.request({ url: url.href, method: String(config.method || 'GET').toUpperCase(), headers, ...bodyOptions, responseType: binary ? 'base64' : 'text', authorize: mapped !== '/auth/email/config' });
    if (config.signal?.aborted) throw new axios.CanceledError('canceled');
    // Expired native sessions must return to authenticated bootstrap instead
    // of leaving an old account/roster visible behind generic request errors.
    // Bootstrap verifies the session; a route-specific 401 alone cannot log out.
    // A 403 from a private route can also mean the bearer is stale (the roster
    // reported "Could not refresh" on 403 with no way to recover). Bootstrap is
    // idempotent, so throttle the re-check to one per 30s.
    if ((result.status === 401 || result.status === 403) && !mapped.startsWith('/auth/') && mapped !== '/v1/bootstrap' && typeof window !== 'undefined') {
      const now = Date.now();
      if (now - lastSessionCheckAt > 30000) {
        lastSessionCheckAt = now;
        window.dispatchEvent(new Event('hm:native-session-check'));
      }
    }
    let data;
    if (binary) {
      const bytes = base64ToBytes(result.data);
      data = config.responseType === 'blob' ? new Blob([bytes], { type: result.headers?.['Content-Type'] || result.headers?.['content-type'] || 'application/octet-stream' }) : bytes.buffer;
    } else {
      try { data = JSON.parse(result.data); } catch { data = result.data; }
    }
    const response = { data, status: result.status, statusText: '', headers: result.headers || {}, config, request: null };
    if (!(config.validateStatus || (status => status >= 200 && status < 300))(result.status)) throw new axios.AxiosError('Native request failed', result.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', config, null, response);
    return response;
  };
}
