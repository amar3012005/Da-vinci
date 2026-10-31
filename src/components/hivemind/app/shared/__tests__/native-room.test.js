import { closeNativeRoom, desktopRoomPlugin, hasNativeRooms, nativeWorkspaceAccess, onNativeRoomClosed, openNativeRoom, roomPlugin } from '../native-room';

jest.mock('../native-auth', () => ({ nativePlugin: {} }));

const EMPLOYEE = 'c14aaef5-24fb-46c2-806c-c3f6c1d88b07';

describe('native workspace access', () => {
  test('returns only the verdict of an accepted check', async () => {
    const plugin = { workspaceAccess: jest.fn().mockResolvedValue({ status: 200, enabled: true }) };
    await expect(nativeWorkspaceAccess(plugin)).resolves.toEqual({ enabled: true });
  });
  test('a disabled account is a verdict, not a failure', async () => {
    const plugin = { workspaceAccess: jest.fn().mockResolvedValue({ status: 200, enabled: false }) };
    await expect(nativeWorkspaceAccess(plugin)).resolves.toEqual({ enabled: false });
  });
  test.each([[{ status: 401 }], [{ status: 503 }], [{ status: 200 }], [{ status: 200, enabled: 'yes' }], [undefined]])('%j is unavailable, never a revocation', async result => {
    const plugin = { workspaceAccess: jest.fn().mockResolvedValue(result) };
    await expect(nativeWorkspaceAccess(plugin)).rejects.toThrow('workspace_access_unavailable');
  });
});

describe('native room', () => {
  test('opens one employee room by its path under the Runtime host', async () => {
    const plugin = { openRoom: jest.fn().mockResolvedValue(undefined) };
    await openNativeRoom(EMPLOYEE, { plugin });
    expect(plugin.openRoom).toHaveBeenCalledWith({ path: `/employees/${EMPLOYEE}` });
  });
  test('names the signed-in company and person so the room keeps its own history store for that scope only', async () => {
    const plugin = { openRoom: jest.fn().mockResolvedValue(undefined) };
    await openNativeRoom(EMPLOYEE, { plugin, scope: 'org-a:user-1' });
    expect(plugin.openRoom).toHaveBeenCalledWith({ path: `/employees/${EMPLOYEE}`, scope: 'org-a:user-1' });
  });
  test('closing and the close listener go through the plugin', async () => {
    const handle = { remove: jest.fn() };
    const plugin = { closeRoom: jest.fn().mockResolvedValue(undefined), addListener: jest.fn().mockResolvedValue(handle) };
    const listener = jest.fn();
    await expect(onNativeRoomClosed(listener, plugin)).resolves.toBe(handle);
    expect(plugin.addListener).toHaveBeenCalledWith('roomClosed', listener);
    await closeNativeRoom(undefined, plugin);
    expect(plugin.closeRoom).toHaveBeenCalled();
  });
});

describe('macOS desktop rooms', () => {
  const bridge = () => ({ openRoom: jest.fn().mockResolvedValue(undefined), closeRoom: jest.fn().mockResolvedValue(undefined), onRoomClosed: jest.fn(() => jest.fn()) });
  test('a browser has no native rooms; the Electron bridge or the iOS app does', () => {
    expect(hasNativeRooms({})).toBe(false);
    expect(hasNativeRooms({ singulanceDesktop: bridge() })).toBe(true);
    expect(hasNativeRooms({ Capacitor: { isNativePlatform: () => true } })).toBe(true);
  });
  test('the desktop plugin is chosen only when the bridge exists and the iOS app is absent', () => {
    expect(roomPlugin({})).toEqual({});
    expect(roomPlugin({ singulanceDesktop: bridge() })).not.toEqual({});
  });
  test('opens on tap with path and scope and closes only its own room', async () => {
    const b = bridge();
    const plugin = desktopRoomPlugin(b);
    await openNativeRoom(EMPLOYEE, { plugin, scope: 'org-a:user-1' });
    expect(b.openRoom).toHaveBeenCalledWith({ path: `/employees/${EMPLOYEE}`, scope: 'org-a:user-1' });
    await closeNativeRoom('someone-else', plugin);
    expect(b.closeRoom).not.toHaveBeenCalled();
    await closeNativeRoom(EMPLOYEE, plugin);
    expect(b.closeRoom).toHaveBeenCalledTimes(1);
    await closeNativeRoom(EMPLOYEE, plugin);
    expect(b.closeRoom).toHaveBeenCalledTimes(1);
  });
  test('Done in the room reaches the listener and can be unsubscribed', async () => {
    const b = bridge();
    const off = jest.fn();
    b.onRoomClosed.mockImplementation(cb => { b.fire = cb; return off; });
    const plugin = desktopRoomPlugin(b);
    const listener = jest.fn();
    const handle = await onNativeRoomClosed(listener, plugin);
    b.fire();
    expect(listener).toHaveBeenCalled();
    handle.remove();
    expect(off).toHaveBeenCalled();
  });
});
