import { describe, expect, it, vi } from 'vitest';
import { createRootHarnessFetch, normalizeHarnessInjections, selectHarnessFetch } from '../harness-transport.js';

const appOrigin = 'https://app.example.test';

describe('native Harness same-origin transport', () => {
  it('roots injection scripts and graph entries/batches while retaining query strings', () => {
    const rows = [
      { kind: 'script-src', src: 'plugins/ui-chat/lib/client.js?rev=4' },
      { kind: 'script-preload', src: '/plugins/ui-chat/style.css?rev=4' },
      {
        kind: 'global',
        name: '__DSH_BOOT__',
        value: {
          rev: '4',
          entries: [{ name: 'chat', url: 'plugins/ui-chat/lib/client.js?rev=4' }],
          batches: [{ id: 'batch-a', url: '/plugins/ui-chat/batch.js?rev=4#entry' }],
        },
      },
    ];

    const normalized = normalizeHarnessInjections(rows, appOrigin);
    expect(normalized[0].src).toBe('/plugins/ui-chat/lib/client.js?rev=4');
    expect(normalized[1].src).toBe('/plugins/ui-chat/style.css?rev=4');
    expect(normalized[2].value).toEqual({
      rev: '4',
      entries: [{ name: 'chat', url: '/plugins/ui-chat/lib/client.js?rev=4' }],
      batches: [{ id: 'batch-a', url: '/plugins/ui-chat/batch.js?rev=4#entry' }],
    });
    expect(rows[2].value.entries[0].url).toBe('plugins/ui-chat/lib/client.js?rev=4');
  });

  it('rejects foreign-origin injection URLs', () => {
    expect(() => normalizeHarnessInjections([
      { kind: 'script-src', src: 'https://attacker.example/module.js' },
    ], appOrigin)).toThrow(/authenticated application origin/u);
  });

  it('roots string and URL RPC inputs and preserves RequestInit and AbortSignal', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok'));
    const rootFetch = createRootHarnessFetch(appOrigin, fetchImpl);
    const controller = new AbortController();
    const init = { method: 'POST', body: '{"method":"initialize"}', headers: { authorization: 'Bearer test' }, signal: controller.signal };

    await rootFetch('api/remote.mux?room=alpha&rev=8', init);
    await rootFetch(new URL('/rpc?method=tools.list', appOrigin), init);

    expect(fetchImpl).toHaveBeenNthCalledWith(1, new URL('/api/remote.mux?room=alpha&rev=8', appOrigin), init);
    expect(fetchImpl).toHaveBeenNthCalledWith(2, new URL('/rpc?method=tools.list', appOrigin), init);
    expect(fetchImpl.mock.calls[0][1]).toBe(init);
    expect(fetchImpl.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it('rejects foreign-origin RPC inputs without calling browser fetch', async () => {
    const fetchImpl = vi.fn();
    const rootFetch = createRootHarnessFetch(appOrigin, fetchImpl);

    await expect(rootFetch('https://attacker.example/rpc', {})).rejects.toThrow(/authenticated application origin/u);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('retains the shell-owned authenticated carrier instead of substituting browser fetch', () => {
    const nativeFetch = vi.fn();
    const browserFetch = vi.fn();
    expect(selectHarnessFetch(appOrigin, nativeFetch, browserFetch)).toBe(nativeFetch);
    expect(selectHarnessFetch(appOrigin, undefined, browserFetch)("api/hivemind/boot", {})).toBeUndefined();
    expect(browserFetch).toHaveBeenCalledWith(new URL('/api/hivemind/boot', appOrigin), {});
  });
});
