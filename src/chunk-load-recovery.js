const RELOAD_MARKER = 'hm_chunk_reload_at';
const RELOAD_WINDOW_MS = 60_000;
const CHUNK_FAILURE = /ChunkLoadError|Loading chunk \d+ failed|\/static\/js\/[^/]+\.chunk\.js/i;

function failureText(event) {
  const value = event?.reason || event?.error || event?.message || event?.target?.src || '';
  return value instanceof Error ? `${value.name}: ${value.message}` : String(value);
}

export function isChunkLoadFailure(event) {
  return CHUNK_FAILURE.test(failureText(event));
}

function showRecovery(browserWindow) {
  const doc = browserWindow.document;
  if (!doc?.body || doc.getElementById('hm-chunk-recovery')) return;
  const panel = doc.createElement('section');
  panel.id = 'hm-chunk-recovery';
  panel.setAttribute('role', 'alert');
  panel.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#f7f7f5;color:#18202a;font:16px system-ui;padding:24px';
  const card = doc.createElement('div');
  card.style.cssText = 'max-width:420px;text-align:center';
  const heading = doc.createElement('h1');
  heading.textContent = 'The app could not finish loading';
  const description = doc.createElement('p');
  description.textContent = 'A connection problem interrupted the download. Retry to load the current version. Your saved conversations remain unchanged.';
  const retry = doc.createElement('button');
  retry.textContent = 'Retry';
  retry.style.cssText = 'border:0;border-radius:10px;background:#18202a;color:white;padding:12px 24px;font:inherit;cursor:pointer';
  retry.addEventListener('click', () => browserWindow.location.reload());
  card.append(heading, description, retry);
  panel.append(card);
  doc.body.append(panel);
  retry.focus();
}

export function installChunkLoadRecovery(browserWindow = window, now = () => Date.now()) {
  const recover = (event) => {
    if (!isChunkLoadFailure(event)) return;

    const timestamp = now();
    try {
      const previous = Number(browserWindow.sessionStorage.getItem(RELOAD_MARKER) || 0);
      if (timestamp - previous < RELOAD_WINDOW_MS) { showRecovery(browserWindow); return; }
      browserWindow.sessionStorage.setItem(RELOAD_MARKER, String(timestamp));
    } catch {
      if (browserWindow.__hmChunkReloadAttempted) { showRecovery(browserWindow); return; }
      browserWindow.__hmChunkReloadAttempted = true;
    }

    browserWindow.location.reload();
  };

  browserWindow.addEventListener('error', recover, true);
  browserWindow.addEventListener('unhandledrejection', recover);

  return () => {
    browserWindow.removeEventListener('error', recover, true);
    browserWindow.removeEventListener('unhandledrejection', recover);
  };
}
