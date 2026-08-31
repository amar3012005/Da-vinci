const ALLOWED_ORIGINS = new Set([
  'https://next.singulancelabs.com',
  'https://next.preview.singulancelabs.com',
]);
const allowedOrigin = (origin) => {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try { return ['localhost', '127.0.0.1'].includes(new URL(origin).hostname); } catch { return false; }
};

window.addEventListener('message', (event) => {
  if (event.source !== window || !allowedOrigin(event.origin)) return;
  const message = event.data;
  if (!message || message.source !== 'singulance-app' || message.version !== 1) return;
  if (!['HM_COMPANION_STATUS', 'HM_GROUP_CURRENT_TAB'].includes(message.type)) return;
  chrome.runtime.sendMessage({ source: 'singulance-web', version: 1, type: message.type })
    .then((response) => window.postMessage({ source: 'singulance-companion', version: 1, requestId: message.requestId, ...response }, event.origin))
    .catch(() => window.postMessage({ source: 'singulance-companion', version: 1, requestId: message.requestId, ok: false }, event.origin));
});

window.postMessage({ source: 'singulance-companion', version: 1, type: 'HM_COMPANION_READY', installed: true }, location.origin);
