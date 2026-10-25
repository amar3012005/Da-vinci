jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: null, org: null }) }));
jest.mock('../../shared/api-client', () => ({
  __esModule: true,
  default: { controlPlane: {}, core: {} },
}));

import {
  establishHarnessSession,
  HARNESS_BOOT_STAGES,
  LoadingSurface,
  harnessBootRevision,
  harnessShellUrl,
  nativeHarnessMounted,
  waitForNativeHarnessMount,
  executeExternalScript,
} from '../HarnessSurface';
import HarnessSurface from '../HarnessSurface';
import { createNativeHarnessLoader } from '../../shared/native-harness-loader';

describe('HarnessSurface module cache', () => {
  it('refreshes a failed Runtime module once and then uses its original script URL', async () => {
    const previousFetch = global.fetch;
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, headers: { get: () => 'text/javascript' }, arrayBuffer: async () => new ArrayBuffer(0) }));
    const src = '/plugins/??@deepseek-ai/dsh-client-modules/client.js&rev=c5ac06ee9d77';
    const pending = executeExternalScript(src, { recoverRuntime: true });
    document.head.querySelector('script[data-dsh-native-script]').dispatchEvent(new Event('error'));
    await new Promise(resolve => setTimeout(resolve, 0));
    const retry = document.head.querySelector('script[data-dsh-native-script]');
    expect(retry.getAttribute('src')).toBe(src);
    retry.dispatchEvent(new Event('load'));
    await pending;
    expect(global.fetch).toHaveBeenCalledWith(src, { credentials: 'include', cache: 'reload' });
    retry.remove();
    global.fetch = previousFetch;
  });

  it('rejects a refreshed authorization failure without executing its body', async () => {
    const previousFetch = global.fetch;
    global.fetch = jest.fn(async () => ({ ok: false, status: 401, headers: { get: () => 'application/json' } }));
    const pending = executeExternalScript('/plugins/native.js', { recoverRuntime: true });
    const rejected = expect(pending).rejects.toThrow('HTTP 401');
    document.head.querySelector('script[data-dsh-native-script]').dispatchEvent(new Event('error'));
    await rejected;
    expect(document.head.querySelector('script[data-dsh-native-script]')).toBeNull();
    global.fetch = previousFetch;
  });
  beforeAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('keys the native shell by the release graph instead of a random mount id', () => {
    const rows = [{ kind: 'global', name: '__DSH_BOOT__', value: { rev: 'release-abc' } }];
    expect(harnessShellUrl(rows)).toBe('/assets/harness-shell.js?rev=release-abc');
    expect(harnessShellUrl(rows)).toBe(harnessShellUrl(rows));
  });

  it('uses one stable fallback when an older runner omits a graph revision', () => {
    expect(harnessShellUrl([])).toBe('/assets/harness-shell.js?rev=current');
  });

  it('uses the boot revision as the in-page module-system identity', () => {
    const rows = [{ kind: 'global', name: '__DSH_BOOT__', value: { rev: 'release-abc' } }];
    expect(harnessBootRevision(rows)).toBe('release-abc');
    expect(harnessBootRevision([])).toBeNull();
  });

  it('covers a phone Runtime room with the room frame, not a blank loader', () => {
    const previousMatch = window.matchMedia;
    window.matchMedia = jest.fn(query => ({ matches: query.includes('max-width'), addEventListener: jest.fn(), removeEventListener: jest.fn() }));
    window.history.pushState({}, '', '/hivemind/app/employee/harness');
    const root = document.createElement('div');
    document.body.appendChild(root);
    const { createRoot } = require('react-dom/client');
    const { act } = require('react');
    const reactRoot = createRoot(root);
    act(() => reactRoot.render(<LoadingSurface stage={2} />));
    expect(root.querySelector('[data-optimistic-phone-room="runtime"]')).not.toBeNull();
    expect(root.querySelector('.optimistic-phone-room-composer')).not.toBeNull();
    expect(root.textContent).not.toContain('Connecting…');
    act(() => reactRoot.unmount());
    root.remove();
    window.history.pushState({}, '', '/');
    window.matchMedia = previousMatch;
  });

  it('keeps one diffusion label across native boot milestones', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const { createRoot } = require('react-dom/client');
    const { act } = require('react');
    const reactRoot = createRoot(root);

    act(() => reactRoot.render(<LoadingSurface stage={2} />));

    const progress = root.querySelector('[role="status"]');
    expect(progress).not.toBeNull();
    expect(root.textContent).toContain('Connecting…');
    expect(root.querySelector('.hm-chat-opening-mark')).toBeNull();
    expect(root.querySelector('.ascii-workspace-loading__visual')?.getAttribute('aria-hidden')).toBe('true');

    act(() => reactRoot.render(<LoadingSurface stage={3} />));
    expect(root.textContent).toContain('Connecting…');
    expect(root.textContent).not.toContain('3/4');
    expect(root.textContent).not.toContain('4/4');

    act(() => reactRoot.unmount());
    root.remove();
  });

  it('reveals an interactive composer without waiting for the history sidebar', () => {
    const root = document.createElement('div');
    expect(nativeHarnessMounted(root)).toBe(false);
    root.innerHTML = '<aside aria-label="HIVE chat sessions"></aside>';
    expect(nativeHarnessMounted(root)).toBe(false);
    root.innerHTML = '<div data-composer-seat=""></div>';
    expect(nativeHarnessMounted(root)).toBe(true);
    expect(HARNESS_BOOT_STAGES.at(-1)).toBe('Opening chat');
  });
  it('does not expose the cold Brain bootstrap seat before native session context settles', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div data-composer-seat="" data-hivemind-composer-ready="false"></div>';
    expect(nativeHarnessMounted(root, { brain: true })).toBe(false);
    root.querySelector('[data-composer-seat]').setAttribute('data-hivemind-composer-ready', 'true');
    expect(nativeHarnessMounted(root, { brain: true })).toBe(true);
    expect(root.querySelector('aside')).toBeNull();
  });
});
jest.mock('../QueryStarters', () => () => null);
jest.mock('../../shared/native-harness-loader', () => ({ createNativeHarnessLoader: jest.fn() }));
jest.mock('../../shared/native-app', () => ({ isNativeApp: () => true }));
jest.mock('../../shared/native-auth', () => ({ nativePlugin: {} }));
jest.mock('../../shared/native-harness-transport', () => ({
  createNativeHarnessFetch: () => (...args) => global.fetch(...args),
  createNativeHarnessStream: jest.fn(), createNativeSaveFile: jest.fn(),
}));

it('a shell import completing after route exit cannot mount over the outer React root', async () => {
  const { createRoot } = require('react-dom/client');
  const { act } = require('react');
  let finishImport;
  let importStarted;
  const started = new Promise(resolve => { importStarted = resolve; });
  const pending = new Promise(resolve => { finishImport = resolve; });
  let capturedRequest;
  const standaloneMount = jest.fn();
  const loader = {
    loadStyle: jest.fn(async () => {}), prepareModule: jest.fn(async () => {}),
    importModule: jest.fn(async () => {
      capturedRequest = window.__DSH_EMBED_REQUEST__;
      importStarted();
      await pending;
      // Native apps/web/src/main.ts falls back to #root when no embed request
      // exists. A cancelled request is its explicit no-mount signal.
      const request = window.__DSH_EMBED_REQUEST__;
      if (request?.cancelled) return;
      if (!request) standaloneMount(document.getElementById('root'));
    }),
  };
  createNativeHarnessLoader.mockReturnValue(loader);
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async () => ({ ok: true, status:200, clone: () => ({json:async()=>({principal:{}})}), json: async () => ({
    styles: ['/test.css'], injections: [{ kind: 'global', name: '__DSH_BOOT__', value: { rev: 'cancel-test' } }],
  }) }));
  window.__HIVE_HARNESS_BOOT_REV__ = 'cancel-test';
  const host = document.createElement('div'); host.id = 'root'; document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(<HarnessSurface sessionEstablished />); });
    await started;
    act(() => root.render(<div>Connected apps</div>));
    expect(capturedRequest.cancelled).toBe(true);
    await act(async () => { finishImport(); await pending; });
    expect(standaloneMount).not.toHaveBeenCalled();
    expect(host.textContent).toBe('Connected apps');
  } finally {
    act(() => root.unmount()); host.remove(); global.fetch = previousFetch;
    delete window.__HIVE_HARNESS_BOOT_REV__;
    delete window.__DSH_EMBED_REQUEST__;
  }
});

it('reattaches the same native app and draft across chat navigation without booting again', async () => {
  const { createRoot } = require('react-dom/client');
  const { act } = require('react');
  const { parkNativeHarnessSeat, clearNativeHarnessSeat } = require('../../shared/native-harness-seat');
  const previousPath = window.location.pathname;
  const previousFetch = global.fetch;
  const app = { dispose: jest.fn() };
  const seat = document.createElement('div');
  seat.innerHTML = '<textarea data-composer-seat>Saved draft</textarea>';
  const draft = seat.querySelector('textarea');
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  createNativeHarnessLoader.mockClear();
  global.fetch = jest.fn(async () => ({ status: 200 }));
  window.__DSH_EMBED_APP__ = app;
  window.history.replaceState({}, '', '/hivemind/app/overview');
  parkNativeHarnessSeat(app, seat, window.location.pathname, ":");
  try {
    await act(async () => { root.render(<HarnessSurface sessionEstablished />); });
    expect(host.contains(draft)).toBe(true);
    window.history.replaceState({}, '', '/hivemind/app/employee/harness/session/another');
    await act(async () => { root.render(null); });
    expect(app.dispose).not.toHaveBeenCalled();
    await act(async () => { root.render(<HarnessSurface sessionEstablished />); });
    expect(host.querySelector('textarea')).toBe(draft);
    expect(draft.value).toBe('Saved draft');
    expect(window.__DSH_EMBED_APP__).toBe(app);
    expect(createNativeHarnessLoader).not.toHaveBeenCalled();
    expect(global.fetch.mock.calls.every(([, options]) => options.method === 'HEAD' && options.cache === 'no-store')).toBe(true);
    window.history.replaceState({}, '', '/hivemind/app/settings');
    await act(async () => { root.unmount(); });
    expect(app.dispose).toHaveBeenCalledTimes(1);
  } finally {
    clearNativeHarnessSeat(); host.remove(); global.fetch = previousFetch;
    window.history.replaceState({}, '', previousPath);
    delete window.__DSH_EMBED_APP__; delete window.__DSH_EMBED_REQUEST__;
  }
});


describe('native mount transport recovery', () => {
  afterEach(() => { jest.useRealTimers(); });
  it('keeps the mounted client observable after the slow-connection threshold', async () => {
    jest.useFakeTimers();
    const container = document.createElement('div');
    const onSlow = jest.fn();
    const controller = new AbortController();
    let resolved = false;
    const pending = waitForNativeHarnessMount(container, controller.signal, { onSlow }).then(() => { resolved = true; });
    jest.advanceTimersByTime(30000);
    await Promise.resolve();
    expect(onSlow).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(false);
    container.innerHTML = '<div data-composer-seat></div>';
    await pending;
    expect(resolved).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
  it('releases a slow mount observer on cancellation without re-mounting or sending', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const pending = waitForNativeHarnessMount(document.createElement('div'), controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(jest.getTimerCount()).toBe(0);
    await expect(waitForNativeHarnessMount(document.createElement('div'), controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});

 it('surfaces native plugin failure instead of hiding it behind Connecting', async () => {
   const container = document.createElement('div');
   container.innerHTML = '<div data-dsh-boot>HARNESS<div>Failed to load plugins</div><div>example: import failed</div></div>';
   await expect(waitForNativeHarnessMount(container)).rejects.toThrow('example: import failed');
 });
 it('surfaces a native failure that appears during boot', async () => {
   const container = document.createElement('div');
   container.innerHTML = '<div data-dsh-boot><div data-dsh-boot-spinner></div></div>';
   const pending = waitForNativeHarnessMount(container);
   container.firstChild.innerHTML = '<div>Failed to load plugins: example</div>';
   await expect(pending).rejects.toThrow('Failed to load plugins: example');
 });

it('reveals the native Runtime root before session selection supplies a composer', () => {
 const container = document.createElement('div');
 container.innerHTML = '<div data-slot="root"><main>Loading session</main></div>';
 expect(nativeHarnessMounted(container)).toBe(true);
 expect(nativeHarnessMounted(container, { brain: true })).toBe(false);
});

it('keeps the Runtime settling root covered until the transcript and composer are ready', async () => {
 const old = window.location.pathname;
 window.history.replaceState({}, '', '/hivemind/app/employee/harness/session/saved');
 const container = document.createElement('div');
 container.innerHTML = '<div data-slot="root"><div data-agent-room data-phase="settling"><div data-composer-seat></div></div></div>';
 try {
   expect(nativeHarnessMounted(container)).toBe(false);
   const ready = waitForNativeHarnessMount(container);
   container.querySelector('[data-agent-room]').setAttribute('data-phase', 'active');
   await ready;
   expect(nativeHarnessMounted(container)).toBe(true);
 } finally { window.history.replaceState({}, '', old); }
});


describe('Runtime admission ownership', () => {
  const api = require('../../shared/api-client').default;
  const previousPath = window.location.pathname;
  afterEach(() => { window.history.replaceState({}, '', previousPath); });
  it('rejects Brain legacy admission without leaving the Runtime room', async () => {
    const room = '/hivemind/app/employee/harness/session/existing';
    window.history.replaceState({}, '', room);
    api.controlPlane.post = jest.fn(async () => ({ data: { mode: 'legacy' } }));
    await expect(establishHarnessSession()).rejects.toThrow('Runtime admission is temporarily unavailable');
    expect(window.location.pathname).toBe(room);
  });
  it('preserves the legacy rollback contract for Brain', async () => {
    window.history.replaceState({}, '', '/hivemind/app/overview/new');
    api.controlPlane.post = jest.fn(async () => ({ data: { mode: 'legacy' } }));
    await expect(establishHarnessSession()).resolves.toEqual({ mode: 'legacy' });
  });
});

it('reserves the composer band on the harness mount before the native composer renders', async () => {
  const { createRoot } = require('react-dom/client');
  const { act } = require('react');
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const previousFetch = global.fetch;
  global.fetch = jest.fn(() => new Promise(() => {}));
  try {
    await act(async () => { root.render(<HarnessSurface sessionEstablished />); });
    expect(host.querySelector('[data-hivemind-harness-surface] > .hm-harness-composer-reserve')).not.toBeNull();
    expect(host.querySelector('[data-composer-seat]')).toBeNull();
  } finally {
    act(() => root.unmount());
    host.remove();
    global.fetch = previousFetch;
  }
});
