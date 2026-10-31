import { compareVersions, createUpdateStore, decideUpdate, detectPlatform, isDismissed, mainBundleFromManifest, rememberDismissal, runningMainBundle } from '../app-update';

jest.mock('../native-app', () => ({ isNativeApp: win => win?.Capacitor?.isNativePlatform?.() === true }));

const json = value => ({ ok: true, json: async () => value });

describe('platform and versions', () => {
  test('detects macOS, iOS and web', () => {
    expect(detectPlatform({ electron: { isElectron: true } })).toBe('macos');
    expect(detectPlatform({ Capacitor: { isNativePlatform: () => true } })).toBe('ios');
    expect(detectPlatform({})).toBe('web');
  });
  test('compares dotted versions numerically', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.9', '1.0')).toBeLessThan(0);
  });
  test('reads the main bundle from the manifest and the running document', () => {
    expect(mainBundleFromManifest({ files: { 'main.js': '/static/js/main.abc123.js' } })).toBe('/static/js/main.abc123.js');
    expect(mainBundleFromManifest({})).toBe('');
    expect(runningMainBundle({ scripts: [{ getAttribute: () => 'https://x.test/static/js/main.abc123.js' }] })).toBe('/static/js/main.abc123.js');
  });
});

describe('decideUpdate per platform', () => {
  test('web offers a reload only when the deployed bundle differs', () => {
    expect(decideUpdate({ platform: 'web', webBundle: { running: '/static/js/main.aaa.js', latest: '/static/js/main.aaa.js' } })).toBeNull();
    expect(decideUpdate({ platform: 'web', webBundle: { running: '', latest: '/static/js/main.bbb.js' } })).toBeNull();
    expect(decideUpdate({ platform: 'web', webBundle: { running: '/static/js/main.aaa.js', latest: '/static/js/main.bbb.js' } })).toEqual({ kind: 'reload', version: 'bbb' });
  });
  test('macOS shows progress while downloading and a restart once downloaded', () => {
    expect(decideUpdate({ platform: 'macos', desktop: { state: 'none' } })).toBeNull();
    expect(decideUpdate({ platform: 'macos', desktop: { state: 'error' } })).toBeNull();
    expect(decideUpdate({ platform: 'macos', desktop: { state: 'downloading', version: '2.0.0', percent: 41.6 } })).toEqual({ kind: 'download', version: '2.0.0', percent: 42 });
    expect(decideUpdate({ platform: 'macos', desktop: { state: 'downloaded', version: '2.0.0' } })).toEqual({ kind: 'install', version: '2.0.0' });
  });
  test('iOS opens the store only for a newer published version or build over https', () => {
    const published = { ios: { version: '1.2.0', build: 7, url: 'https://testflight.apple.com/join/x' } };
    expect(decideUpdate({ platform: 'ios', running: { version: '1.2.0', build: '7' }, published })).toBeNull();
    expect(decideUpdate({ platform: 'ios', running: { version: '1.2.0', build: '6' }, published })).toMatchObject({ kind: 'store', url: published.ios.url });
    expect(decideUpdate({ platform: 'ios', running: { version: '1.1.9', build: '99' }, published })).toMatchObject({ kind: 'store' });
    expect(decideUpdate({ platform: 'ios', running: { version: '1.0.0' }, published: { ios: { version: '2.0.0', url: 'http://insecure' } } })).toBeNull();
    expect(decideUpdate({ platform: 'ios', running: { version: '1.0.0' }, published: null })).toBeNull();
  });
});

describe('dismissal per version', () => {
  test('remembers and survives storage failures', () => {
    const data = {};
    const storage = { getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
    expect(isDismissed('bbb', storage)).toBe(false);
    rememberDismissal('bbb', storage);
    expect(isDismissed('bbb', storage)).toBe(true);
    expect(isDismissed('ccc', storage)).toBe(false);
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(isDismissed('bbb', broken)).toBe(false);
    expect(() => rememberDismissal('bbb', broken)).not.toThrow();
  });
});

describe('update store', () => {
  test('web store reads the manifest with no-store and reports a newer bundle', async () => {
    const fetch = jest.fn().mockResolvedValue(json({ files: { 'main.js': '/static/js/main.new.js' } }));
    const doc = { scripts: [{ getAttribute: () => '/static/js/main.old.js' }] };
    const store = createUpdateStore({ win: {}, doc, fetch });
    const off = store.subscribe(() => {});
    await store.refresh();
    expect(fetch).toHaveBeenCalledWith('/asset-manifest.json', expect.objectContaining({ cache: 'no-store' }));
    expect(store.snapshot().update).toEqual({ kind: 'reload', version: 'new' });
    off();
  });
  test('macOS store follows the Electron update events and asks for a check', async () => {
    let push;
    const electron = { isElectron: true, onUpdateStatus: cb => { push = cb; return jest.fn(); }, checkForUpdates: jest.fn() };
    const store = createUpdateStore({ win: { electron }, doc: null, fetch: jest.fn().mockResolvedValue(json({})) });
    const off = store.subscribe(() => {});
    await store.refresh();
    expect(electron.checkForUpdates).toHaveBeenCalled();
    push({ state: 'downloaded', version: '3.0.0' });
    expect(store.snapshot().update).toEqual({ kind: 'install', version: '3.0.0' });
    off();
  });
  test('iOS store compares the packaged build with the published file', async () => {
    const fetch = jest.fn().mockResolvedValue(json({ ios: { version: '1.1.0', build: 3, url: 'https://apps.apple.com/app/x' } }));
    const store = createUpdateStore({ win: { Capacitor: { isNativePlatform: () => true } }, doc: null, fetch, appInfo: async () => ({ version: '1.0.0', build: '1' }) });
    const off = store.subscribe(() => {});
    await new Promise(resolve => setTimeout(resolve, 0));
    await store.refresh();
    expect(fetch).toHaveBeenCalledWith('/app-versions.json', expect.objectContaining({ cache: 'no-store' }));
    expect(store.snapshot().update).toMatchObject({ kind: 'store', version: '1.1.0 (3)' });
    off();
  });
});
