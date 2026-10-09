import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { createNativeAuthController } from './native-auth-controller';

export const nativePlugin = registerPlugin('SingulanceNative');
let controller;
export function nativeAuth() {
  if (!controller) controller = createNativeAuthController({ plugin: nativePlugin, browser: Browser, crypto: window.crypto, platform: Capacitor.getPlatform() });
  return controller;
}

export async function bindNativeAuthCallbacks(onAuthenticated, onError) {
  let active = true;
  const handle = async ({ url }) => {
    try { if (await nativeAuth().complete(url)) { if (active) onAuthenticated(); } }
    catch { if (active) onError?.('Sign-in could not be completed. Please start again.'); }
  };
  const listener = await App.addListener('appUrlOpen', handle);
  const launch = await App.getLaunchUrl();
  if (launch?.url) await handle(launch);
  return () => { active = false; listener.remove(); };
}
