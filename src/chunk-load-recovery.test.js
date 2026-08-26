import { installChunkLoadRecovery, isChunkLoadFailure } from './chunk-load-recovery';

function fakeWindow({ storageDenied = false, previous = null } = {}) {
  const listeners = {};
  const values = new Map(previous == null ? [] : [['hm_chunk_reload_at', String(previous)]]);
  return {
    listeners,
    location: { reload: jest.fn() },
    sessionStorage: {
      getItem: jest.fn((key) => {
        if (storageDenied) throw new Error('storage denied');
        return values.get(key) || null;
      }),
      setItem: jest.fn((key, value) => {
        if (storageDenied) throw new Error('storage denied');
        values.set(key, value);
      }),
    },
    addEventListener: jest.fn((name, handler) => { listeners[name] = handler; }),
    removeEventListener: jest.fn(),
  };
}

test('recognizes runtime and script-element chunk failures', () => {
  expect(isChunkLoadFailure({ reason: new Error('Loading chunk 7069 failed') })).toBe(true);
  expect(isChunkLoadFailure({ target: { src: 'https://example.com/static/js/7069.hash.chunk.js' } })).toBe(true);
  expect(isChunkLoadFailure({ message: 'ordinary application error' })).toBe(false);
});

test('reloads once and suppresses a reload loop', () => {
  const browserWindow = fakeWindow();
  installChunkLoadRecovery(browserWindow, () => 100_000);
  browserWindow.listeners.unhandledrejection({ reason: new Error('ChunkLoadError') });
  browserWindow.listeners.unhandledrejection({ reason: new Error('ChunkLoadError') });
  expect(browserWindow.location.reload).toHaveBeenCalledTimes(1);
});

test('still reloads once when browser storage is unavailable', () => {
  const browserWindow = fakeWindow({ storageDenied: true });
  installChunkLoadRecovery(browserWindow, () => 100_000);
  browserWindow.listeners.error({ target: { src: '/static/js/missing.chunk.js' } });
  browserWindow.listeners.error({ target: { src: '/static/js/missing.chunk.js' } });
  expect(browserWindow.location.reload).toHaveBeenCalledTimes(1);
});
