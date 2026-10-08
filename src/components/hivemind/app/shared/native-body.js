const MAX_BODY_BYTES = 8 * 1024 * 1024;
export function bytesToBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return btoa(binary);
}
export function base64ToBytes(value) {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}
/** Let the browser build the multipart boundary; never manually discard uploaded bytes. */
export async function nativeRequestBody(body, contentType) {
  if (body == null) return {};
  if (typeof body === 'string') {
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) throw new Error('native_request_body_too_large');
    return { body, bodyEncoding: 'utf8', contentType: contentType || 'application/json' };
  }
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
    const reader = body.getReader(); const chunks = []; let length = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        length += value.byteLength; if (length > MAX_BODY_BYTES) { await reader.cancel(); throw new Error('native_request_body_too_large'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { body: bytesToBase64(bytes), bodyEncoding: 'base64', contentType: contentType || 'application/octet-stream' };
  }
  if ((typeof FormData !== 'undefined' && body instanceof FormData) || (typeof Blob !== 'undefined' && body instanceof Blob) || body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    const form = typeof FormData !== 'undefined' && body instanceof FormData;
    const request = new Request('https://localhost/', { method: 'POST', body, ...(!form && contentType ? { headers: { 'Content-Type': contentType } } : {}) });
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength > MAX_BODY_BYTES) throw new Error('native_request_body_too_large');
    return { body: bytesToBase64(bytes), bodyEncoding: 'base64', contentType: request.headers.get('Content-Type') || 'application/octet-stream' };
  }
  return nativeRequestBody(JSON.stringify(body), contentType);
}
