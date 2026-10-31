/**
 * Haptics and sound for every shell. One call, `haptic(kind)`, picks the platform's mechanism:
 * iOS packaged app -> `SingulanceNative.haptic({ kind })`; macOS app -> `window.singulanceDesktop.haptic(kind)`;
 * Android and web -> short `navigator.vibrate` patterns. Nothing fires under `prefers-reduced-motion` or when the person
 * turned haptics off, and a missing or failing native method is ignored: feedback never delays or fails an action.
 */
import { nativePlugin } from './native-auth';

export const HAPTIC_KINDS = ['light', 'soft', 'warning', 'success', 'selection', 'error'];
/** Vibration patterns in milliseconds for Android and web. */
export const VIBRATION_PATTERNS = { light: 10, soft: 8, selection: 6, success: [12, 40, 12], warning: [20, 50, 20], error: [30, 40, 30, 40, 30] };
/** Mirrors of the person's Notifications settings, readable without knowing who is signed in. */
export const HAPTICS_MIRROR_KEY = 'hm_native_touch_feedback';
export const SOUND_MIRROR_KEY = 'hm_notify_sound';

function readFlag(storage, key, fallback) {
  try { const value = storage.getItem(key); return value === null || value === undefined ? fallback : value !== 'off'; }
  catch { return fallback; /* Storage can be blocked; the default applies. */ }
}

/** @returns {boolean} Whether haptics are on for this device (default on). */
export function hapticsEnabled(storage = typeof window === 'undefined' ? null : window.localStorage) {
  return storage ? readFlag(storage, HAPTICS_MIRROR_KEY, true) : true;
}
/** @returns {boolean} Whether the Needs you sound is on (default on). */
export function soundEnabled(storage = typeof window === 'undefined' ? null : window.localStorage) {
  return storage ? readFlag(storage, SOUND_MIRROR_KEY, true) : true;
}
/** Write the two device mirrors from the person's settings. */
export function mirrorFeedbackSettings({ haptics, sound }, storage = window.localStorage) {
  try { storage.setItem(HAPTICS_MIRROR_KEY, haptics ? 'on' : 'off'); storage.setItem(SOUND_MIRROR_KEY, sound ? 'on' : 'off'); }
  catch { /* Storage blocked: the settings page still holds the choice for this session. */ }
}

/**
 * Which mechanism serves this window.
 * @returns {'ios' | 'desktop' | 'vibrate' | 'none'} Mechanism name.
 */
export function hapticPlatform(win = window, plugin = nativePlugin) {
  const platform = win.Capacitor?.getPlatform?.();
  if (platform === 'ios' && win.Capacitor?.isNativePlatform?.() && plugin) return 'ios';
  if (typeof win.singulanceDesktop?.haptic === 'function') return 'desktop';
  if (typeof win.navigator?.vibrate === 'function') return 'vibrate';
  return 'none';
}

/**
 * Fire one haptic. Safe to call anywhere; returns the mechanism used, or `null` when nothing fired.
 * @param {'light' | 'soft' | 'warning' | 'success' | 'selection' | 'error'} kind - Moment.
 * @param {{ win?: Window, plugin?: object, enabled?: boolean, reducedMotion?: boolean }} [options] - Test and shell overrides.
 * @returns {string | null} Mechanism.
 */
export function haptic(kind, { win = typeof window === 'undefined' ? null : window, plugin = nativePlugin, enabled, reducedMotion } = {}) {
  if (!win || !HAPTIC_KINDS.includes(kind)) return null;
  if (!(enabled ?? hapticsEnabled(win.localStorage))) return null;
  let reduced = reducedMotion;
  if (reduced === undefined) { try { reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true; } catch { reduced = false; } }
  if (reduced) return null;
  const mechanism = hapticPlatform(win, plugin);
  try {
    if (mechanism === 'ios') { Promise.resolve(plugin.haptic?.({ kind })).catch(() => {}); /* An older app shell lacks the method; the rejection is ignored. */ }
    else if (mechanism === 'desktop') win.singulanceDesktop.haptic(kind);
    else if (mechanism === 'vibrate') win.navigator.vibrate(VIBRATION_PATTERNS[kind]);
    else return null;
  } catch { return null; /* Unsupported hardware or a throwing bridge: feedback is optional. */ }
  return mechanism;
}

/**
 * A short two-note chime for a Needs you arrival. Only when the sound setting is on; browsers that block audio before a gesture stay silent.
 * @returns {boolean} Whether a tone was started.
 */
export function playNeedsYouSound({ win = typeof window === 'undefined' ? null : window, enabled } = {}) {
  if (!win || !(enabled ?? soundEnabled(win.localStorage))) return false;
  const Context = win.AudioContext || win.webkitAudioContext;
  if (!Context) return false;
  try {
    const context = new Context();
    const gain = context.createGain();
    gain.gain.value = 0.04;
    gain.connect(context.destination);
    [660, 880].forEach((frequency, index) => {
      const tone = context.createOscillator();
      tone.frequency.value = frequency;
      tone.connect(gain);
      tone.start(context.currentTime + index * 0.12);
      tone.stop(context.currentTime + index * 0.12 + 0.1);
    });
    return true;
  } catch { return false; /* Audio can be unavailable or blocked. */ }
}
