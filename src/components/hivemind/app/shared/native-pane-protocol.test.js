import { detectNativePane, paneSource } from './native-pane-protocol';
const runtime = new URL('https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness');
test('trusted embedded Runtime remains conversation-only after query loss', () => {
  expect(detectNativePane(runtime, true, 'https://runtime-runner.singulancelabs.com/')).toBe('runtime');
  expect(detectNativePane(runtime, true, 'https://next.singulancelabs.com/')).toBe('runtime');
});
test('top-level and untrusted frames retain normal shell', () => {
  expect(detectNativePane(runtime, false, 'https://next.singulancelabs.com/')).toBeNull();
  expect(detectNativePane(runtime, true, 'https://example.com/')).toBeNull();
  expect(detectNativePane(runtime, true, '')).toBeNull();
});
test('explicit pane source and Brain embedding retain their owner', () => {
  expect(detectNativePane(new URL(paneSource(runtime.pathname, 'runtime')), true, '')).toBe('runtime');
  expect(detectNativePane(new URL('https://next.singulancelabs.com/hivemind/app/overview/new'), true, runtime.origin)).toBe('brain');
  expect(detectNativePane(new URL('https://next.singulancelabs.com/hivemind/app/connectors'), true, runtime.origin)).toBeNull();
});
