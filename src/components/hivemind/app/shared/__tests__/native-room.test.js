import { closeNativeRoom, nativeWorkspaceAccess, onNativeRoomClosed, openNativeRoom } from '../native-room';

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
    await closeNativeRoom(plugin);
    expect(plugin.closeRoom).toHaveBeenCalled();
  });
});
