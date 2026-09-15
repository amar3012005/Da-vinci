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

export function installChunkLoadRecovery(browserWindow = window, now = () => Date.now()) {
  const recover = (event) => {
    if (!isChunkLoadFailure(event)) return;

    const timestamp = now();
    try {
      const previous = Number(browserWindow.sessionStorage.getItem(RELOAD_MARKER) || 0);
      if (timestamp - previous < RELOAD_WINDOW_MS) return;
      browserWindow.sessionStorage.setItem(RELOAD_MARKER, String(timestamp));
    } catch {
      if (browserWindow.__hmChunkReloadAttempted) return;
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
