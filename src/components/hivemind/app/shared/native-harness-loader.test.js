jest.mock('es-module-lexer/js', () => ({ parse: jest.fn(() => [[]]) }), { virtual: true });
import { parse } from 'es-module-lexer/js';
import { createNativeHarnessLoader } from './native-harness-loader';
function response(text, type) { return { ok: true, headers: { get: () => type }, text: async () => text, arrayBuffer: async () => new Uint8Array([1,2,3]).buffer }; }
test('prefetches sibling module sources together without duplicate fetches', async () => {
  parse.mockImplementation(() => [[]]);
  const text = 'export { a } from "./a.js"; export { b } from "./b.js";';
  parse.mockReturnValueOnce([['./a.js', './b.js'].map(n => ({ d: -1, n, s: text.indexOf(n), e: text.indexOf(n) + n.length }))]);
  const original = URL.createObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:test');
  let active = 0, peak = 0;
  const calls = [];
  try {
    const loader = createNativeHarnessLoader(async url => {
      calls.push(url);
      if (url.endsWith('/root.js')) return response(text, 'text/javascript');
      active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 5)); active--;
      return response('', 'text/javascript');
    });
    await loader.prepareModule('https://next.singulancelabs.com/assets/root.js');
    expect(peak).toBe(2);
    expect(calls).toHaveLength(3);
    await loader.prepareModule('https://next.singulancelabs.com/assets/root.js');
    expect(calls).toHaveLength(3);
  } finally { URL.createObjectURL = original; }
});
test('CSS resources load concurrently, duplicate assets load once and source ordering stays intact', async () => {
  let active = 0, peak = 0; const calls = [];
  const fetcher = async url => {
    if (url.endsWith('.css')) return response('.a{src:url(./fonts/a.woff2)}.b{src:url(./fonts/b.woff2)}.c{src:url(./fonts/a.woff2)}', 'text/css');
    calls.push(url); active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5)); active--;
    return response('', 'font/woff2');
  };
  const style = await createNativeHarnessLoader(fetcher).loadStyle('https://next.singulancelabs.com/assets/main.css');
  expect(calls).toHaveLength(2); expect(peak).toBe(2);
  expect(style.textContent).toMatch(/^\.a.*\.b.*\.c/);
  expect(style.textContent.match(/data:font\/woff2/g)).toHaveLength(3);
  style.remove();
});
test('SPA fallback HTML is rejected and a corrected asset can be retried', async () => {
  let bad = true;
  const fetcher = async url => url.endsWith('.css') ? response('.a{src:url(./fonts/a.woff2)}', 'text/css') : response('', bad ? 'text/html' : 'font/woff2');
  const loader = createNativeHarnessLoader(fetcher);
  await expect(loader.loadStyle('https://next.singulancelabs.com/assets/main.css')).rejects.toThrow('stylesheet asset');
  bad = false;
  const style = await loader.loadStyle('https://next.singulancelabs.com/assets/main.css');
  expect(style.textContent).toContain('data:font/woff2'); style.remove();
});
