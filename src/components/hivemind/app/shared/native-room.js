import { useSyncExternalStore } from 'react';
import { nativePlugin } from './native-auth';
import { isNativeApp } from './native-app';

let desktopRoomsFailed = false;
const failureListeners = new Set();

/**
 * Electron preload bridge for native rooms (macOS app), or `null` in a browser, the iOS app, a macOS app older than
 * 2.3.0 (SINGULANCE 2.2.0 has no `singulanceDesktop`) or one whose bridge lacks the room methods.
 */
export function desktopRoomBridge(win = typeof window === 'undefined' ? null : window) {
  const bridge = win?.singulanceDesktop;
  if (!bridge || typeof bridge.version !== 'number' || bridge.version < 1) return null;
  if (typeof bridge.openRoom !== 'function' || typeof bridge.closeRoom !== 'function' || typeof bridge.onRoomClosed !== 'function') return null;
  return desktopRoomsFailed ? null : bridge;
}

/**
 * Stops using the macOS native room for this document after the bridge failed to open one, so the in-page web room
 * takes over. Subscribers (see `useHasNativeRooms`) re-render.
 */
export function markDesktopRoomsUnavailable() {
  if (desktopRoomsFailed) return;
  desktopRoomsFailed = true;
  failureListeners.forEach(listener => listener());
}

/** True when employee rooms open as a native full-screen room: the iOS app or a macOS app with a working room bridge. Browsers keep the web room. */
export function hasNativeRooms(win = typeof window === 'undefined' ? null : window) {
  return isNativeApp(win) || desktopRoomBridge(win) !== null;
}

/** `hasNativeRooms()` that re-renders when the macOS bridge is given up on. */
export function useHasNativeRooms() {
  return useSyncExternalStore(
    listener => { failureListeners.add(listener); return () => failureListeners.delete(listener); },
    () => hasNativeRooms(),
  );
}

/**
 * Adapts the Electron bridge to the iOS plugin's room methods so both share one code path.
 * `closeRoom({path})` closes only when that path is the room on screen; the bridge itself closes whatever is open.
 */
export function desktopRoomPlugin(bridge) {
  let current = null;
  return {
    openRoom: async ({ path, scope }) => { current = path; return bridge.openRoom({ path, ...(scope ? { scope } : {}) }); },
    closeRoom: async ({ path } = {}) => {
      if (path && current !== path) return undefined;
      current = null;
      return bridge.closeRoom?.();
    },
    addListener: async (event, listener) => {
      const off = event === 'roomClosed' ? bridge.onRoomClosed?.(() => { current = null; listener(); }) : null;
      return { remove: () => { if (typeof off === 'function') off(); else off?.remove?.(); } };
    },
  };
}

let desktopPlugin = null;
let desktopBridge = null;
/** The room plugin for this document: the iOS plugin, or the macOS bridge adapter when the Electron bridge exists. */
export function roomPlugin(win = typeof window === 'undefined' ? null : window) {
  const bridge = !isNativeApp(win) ? desktopRoomBridge(win) : null;
  if (!bridge) return nativePlugin;
  if (bridge !== desktopBridge) { desktopBridge = bridge; desktopPlugin = desktopRoomPlugin(bridge); }
  return desktopPlugin;
}

/**
 * Workspace-mode access for the packaged app.
 * @returns {Promise<{enabled: boolean}>} The Worker's verdict for the signed-in account.
 * @throws {Error} `workspace_access_unavailable` when the session is rejected or the verdict is missing.
 */
export async function nativeWorkspaceAccess(plugin = nativePlugin) {
  const result = await plugin.workspaceAccess();
  if (result?.status !== 200 || typeof result.enabled !== 'boolean') throw new Error('workspace_access_unavailable');
  return { enabled: result.enabled };
}

/**
 * Opens (or switches) the native full-screen OpenDot room of one employee.
 * @param {string} employeeId - employee id.
 * @param {{ scope?: string, plugin?: object }} [options] - `org:user` of the signed-in person (rooms of one scope keep one
 *   persistent web store, the room's own history cache, and the stores of other scopes are removed; without it the room
 *   uses a store discarded on close) and the SingulanceNative plugin.
 * @returns {Promise<void>} resolves when the room is shown.
 */
export function openNativeRoom(employeeId, { scope, plugin = roomPlugin() } = {}) {
  return plugin.openRoom({ path: `/employees/${employeeId}`, ...(scope ? { scope } : {}) });
}

/**
 * Closes the native room without emitting `roomClosed`.
 * @param {string} [employeeId] - close only when this employee's room is the one on screen (a newer room stays open).
 * @param {object} [plugin] - the SingulanceNative plugin.
 * @returns {Promise<void>} resolves when handled.
 */
export function closeNativeRoom(employeeId, plugin = roomPlugin()) {
  return plugin.closeRoom(employeeId ? { path: `/employees/${employeeId}` } : {});
}

/** Subscribes to the person closing the native room with its Done button; resolves to a handle with `remove()`. */
export function onNativeRoomClosed(listener, plugin = roomPlugin()) {
  return plugin.addListener('roomClosed', listener);
}
