import { Capacitor, registerPlugin } from '@capacitor/core';

const Haptics = registerPlugin('Haptics');
export const HAPTICS_PREFERENCE = 'hm_native_touch_feedback';
export function touchFeedbackEnabled(storage = window.localStorage) {
  try { return storage.getItem(HAPTICS_PREFERENCE) !== 'off'; }
  catch { return true; }
}

/** Intentional touch feedback only; never a claim that a request succeeded. */
export function bindNativeTouchFeedback({ document, storage, plugin = Haptics, available = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics') }) {
  if (!available) return () => {};
  let lastTap = -Infinity;
  const tap = event => {
    if (!event.isTrusted || !touchFeedbackEnabled(storage) || document.querySelector('[data-voice-active]')) return;
    const target = event.target?.closest?.('[data-native-mobile-add], [data-native-mobile-plugin], [data-agent-room-link], [data-native-composer-primary]');
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true' || !window.matchMedia('(max-width: 900px)').matches) return;
    const now = performance.now();
    if (now - lastTap < 100) return;
    lastTap = now;
    // Failure or unsupported hardware must never delay the actual control.
    try { Promise.resolve(plugin.impact({ style: 'LIGHT' })).catch(() => {}); }
    catch { /* An older native shell may not expose this optional plugin. */ }
  };
  document.addEventListener('click', tap);
  return () => document.removeEventListener('click', tap);
}
