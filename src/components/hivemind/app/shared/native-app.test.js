import { isNativeApp } from './native-app';

test('native billing policy uses a native platform instead of narrow screen or user agent', () => {
  expect(isNativeApp({ innerWidth: 320 })).toBe(false);
  expect(isNativeApp({ Capacitor: { isNativePlatform: () => false } })).toBe(false);
  expect(isNativeApp({ Capacitor: { isNativePlatform: () => true } })).toBe(true);
  expect(isNativeApp({ Capacitor: { isNativePlatform: () => { throw new Error('missing bridge'); } } })).toBe(false);
});

test('packaged native build remains consumption-only before bridge initialization', () => {
  const previous = process.env.REACT_APP_NATIVE_APP;
  process.env.REACT_APP_NATIVE_APP = 'true';
  try { expect(isNativeApp(null)).toBe(true); }
  finally {
    if (previous === undefined) delete process.env.REACT_APP_NATIVE_APP;
    else process.env.REACT_APP_NATIVE_APP = previous;
  }
});
