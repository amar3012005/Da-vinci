import axios from 'axios';
import { NATIVE_CONTROL_PLANE } from './native-auth-controller';

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
    let body = config.data;
    if (body != null && typeof body !== 'string') {
      if (typeof FormData !== 'undefined' && body instanceof FormData) throw new Error('native_binary_upload_requires_file_transport');
      body = JSON.stringify(body);
    }
    if (body != null) headers['Content-Type'] = 'application/json';
    const result = await plugin.request({ url: url.href, method: String(config.method || 'GET').toUpperCase(), headers, ...(body != null ? { body } : {}), authorize: true });
    if (config.signal?.aborted) throw new axios.CanceledError('canceled');
    let data; try { data = JSON.parse(result.data); } catch { data = result.data; }
    const response = { data, status: result.status, statusText: '', headers: result.headers || {}, config, request: null };
    if (!(config.validateStatus || (status => status >= 200 && status < 300))(result.status)) throw new axios.AxiosError('Native request failed', result.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', config, null, response);
    return response;
  };
}
