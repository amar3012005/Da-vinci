import { nativePlugin } from './native-auth';

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

/** Opens (or switches) the native full-screen OpenDot room of one employee. */
export function openNativeRoom(employeeId, plugin = nativePlugin) {
  return plugin.openRoom({ path: `/employees/${employeeId}` });
}

/** Closes the native room without emitting `roomClosed`. */
export function closeNativeRoom(plugin = nativePlugin) {
  return plugin.closeRoom();
}

/** Subscribes to the person closing the native room with its Done button; resolves to a handle with `remove()`. */
export function onNativeRoomClosed(listener, plugin = nativePlugin) {
  return plugin.addListener('roomClosed', listener);
}
