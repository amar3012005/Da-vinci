/** Native-store builds are consumption-only until approved native billing exists. */
export function isNativeApp(browser = typeof window === 'undefined' ? null : window) {
  if (process.env.REACT_APP_NATIVE_APP === 'true') return true;
  try { return browser?.Capacitor?.isNativePlatform?.() === true; }
  catch { return false; }
}
