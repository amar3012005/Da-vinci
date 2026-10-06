import { Capacitor } from '@capacitor/core';

export const isNativeApp = () => Capacitor.isNativePlatform();

/** Start the packaged application inside the existing mobile workspace. */
export function prepareNativeEntry(browser = window) {
  if (!isNativeApp()) return;
  browser.document.documentElement.dataset.nativePlatform = Capacitor.getPlatform();
  if (browser.location.pathname === '/') {
    browser.history.replaceState(null, '', '/hivemind/m/chat');
  }
}

/** Native foreground/network changes feed the existing browser recovery seams. */
export async function installNativeLifecycle(browser = window) {
  if (!isNativeApp()) return () => {};
  const [{ App }, { Network }] = await Promise.all([
    import('@capacitor/app'), import('@capacitor/network'),
  ]);
  const handles = [];
  try {
    handles.push(await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        browser.dispatchEvent(new Event('focus'));
        browser.dispatchEvent(new Event('resize'));
      }
    }));
    handles.push(await Network.addListener('networkStatusChange', ({ connected }) => {
      browser.dispatchEvent(new Event(connected ? 'online' : 'offline'));
    }));
    return () => { handles.forEach(handle => handle.remove()); };
  } catch (error) {
    handles.forEach(handle => handle.remove());
    throw error;
  }
}
