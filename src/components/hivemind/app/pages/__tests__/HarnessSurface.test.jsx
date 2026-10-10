jest.mock('../../shared/api-client', () => ({
  __esModule: true,
  default: { controlPlane: {}, core: {} },
}));

import {
  HARNESS_BOOT_STAGES,
  LoadingSurface,
  harnessBootRevision,
  harnessShellUrl,
  nativeHarnessMounted,
} from '../HarnessSurface';
import HarnessSurface from '../HarnessSurface';
import { createNativeHarnessLoader } from '../../shared/native-harness-loader';

describe('HarnessSurface module cache', () => {
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

  it('shows a bounded native boot progress indicator using real milestones', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const { createRoot } = require('react-dom/client');
    const { act } = require('react');
    const reactRoot = createRoot(root);

    act(() => reactRoot.render(<LoadingSurface stage={2} />));

    const progress = root.querySelector('[role="status"]');
    expect(progress).not.toBeNull();
    expect(root.textContent).toContain(HARNESS_BOOT_STAGES[2]);
    expect(root.querySelector('.hm-chat-opening-mark')).not.toBeNull();

    act(() => reactRoot.render(<LoadingSurface stage={3} />));
    expect(root.textContent).toContain(HARNESS_BOOT_STAGES[3]);
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
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({
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
  parkNativeHarnessSeat(app, seat, window.location.pathname);
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
