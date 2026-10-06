import { Capacitor } from '@capacitor/core';
import { prepareNativeEntry, installNativeLifecycle } from './runtime';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';

jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: jest.fn(), getPlatform: () => 'ios' } }));
jest.mock('@capacitor/app', () => ({ App: { addListener: jest.fn() } }));
jest.mock('@capacitor/network', () => ({ Network: { addListener: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());
test('browser website routing remains untouched', () => {
  Capacitor.isNativePlatform.mockReturnValue(false);
  const browser = { history: { replaceState: jest.fn() } };
  prepareNativeEntry(browser);
  expect(browser.history.replaceState).not.toHaveBeenCalled();
});
test('native root opens legacy mobile workspace with DSH Brain', () => {
  Capacitor.isNativePlatform.mockReturnValue(true);
  const browser = { document: { documentElement: { dataset: {} } }, location: { pathname: '/' }, history: { replaceState: jest.fn() } };
  prepareNativeEntry(browser);
  expect(browser.history.replaceState).toHaveBeenCalledWith(null, '', '/hivemind/m/chat');
  expect(browser.document.documentElement.dataset.nativePlatform).toBe('ios');
});
test('native entry preserves existing routes', () => {
  Capacitor.isNativePlatform.mockReturnValue(true);
  const browser = { document: { documentElement: { dataset: {} } }, location: { pathname: '/hivemind/app/employee/harness' }, history: { replaceState: jest.fn() } };
  prepareNativeEntry(browser);
  expect(browser.history.replaceState).not.toHaveBeenCalled();
});
test('resume and network changes notify existing recovery without sending work', async () => {
  Capacitor.isNativePlatform.mockReturnValue(true);
  const removeApp = jest.fn(), removeNetwork = jest.fn();
  App.addListener.mockResolvedValue({ remove: removeApp });
  Network.addListener.mockResolvedValue({ remove: removeNetwork });
  const browser = { dispatchEvent: jest.fn() };
  const dispose = await installNativeLifecycle(browser);
  App.addListener.mock.calls[0][1]({ isActive: true });
  Network.addListener.mock.calls[0][1]({ connected: false });
  Network.addListener.mock.calls[0][1]({ connected: true });
  expect(browser.dispatchEvent.mock.calls.map(([event]) => event.type)).toEqual(['focus', 'resize', 'offline', 'online']);
  dispose();
  expect(removeApp).toHaveBeenCalledTimes(1);
  expect(removeNetwork).toHaveBeenCalledTimes(1);
});
test('partial listener setup is cleaned up on failure', async () => {
  Capacitor.isNativePlatform.mockReturnValue(true);
  const remove = jest.fn();
  App.addListener.mockResolvedValue({ remove });
  Network.addListener.mockRejectedValue(new Error('native unavailable'));
  await expect(installNativeLifecycle({})).rejects.toThrow('native unavailable');
  expect(remove).toHaveBeenCalledTimes(1);
});
