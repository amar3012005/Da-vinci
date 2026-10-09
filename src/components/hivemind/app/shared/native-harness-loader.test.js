jest.mock('es-module-lexer/js', () => ({ parse: () => [[]] }), { virtual: true });
import { createNativeHarnessLoader } from './native-harness-loader';
function response(text, type) { return { ok: true, headers: { get: () => type }, text: async () => text, arrayBuffer: async () => new Uint8Array([1,2,3]).buffer }; }
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
