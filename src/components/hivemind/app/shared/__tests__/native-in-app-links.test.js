jest.mock('../native-app', () => ({ isNativeApp: jest.fn(() => true) }));
const { isNativeApp } = require('../native-app');
const { bindNativeInAppLinks, inAppPath, openProductPage } = require('../native-in-app-links');

beforeEach(() => { isNativeApp.mockReturnValue(true); });

test('product pages on the product hosts map to app routes; other links stay external', () => {
  expect(inAppPath('https://next.singulancelabs.com/hivemind/app/overview/new')).toBe('/hivemind/app/overview/new');
  expect(inAppPath('https://runtime-runner.singulancelabs.com/hivemind/app/employee/apps?x=1#a')).toBe('/hivemind/app/employee/apps?x=1#a');
  expect(inAppPath('https://next.singulancelabs.com/privacy')).toBeNull();
  expect(inAppPath('https://evil.example/hivemind/app')).toBeNull();
  expect(inAppPath('https://next.singulancelabs.com:8443/hivemind/app')).toBeNull();
  expect(inAppPath('http://next.singulancelabs.com/hivemind/app')).toBeNull();
  expect(inAppPath('https://next.singulancelabs.com/hivemind/app', { native: false })).toBeNull();
});

test('in the packaged app a product link click routes in place and the shell gets a navigation hook', () => {
  const navigate = jest.fn();
  const stop = bindNativeInAppLinks(navigate, document);
  const link = document.createElement('a');
  link.href = 'https://next.singulancelabs.com/hivemind/app/overview/new';
  document.body.append(link);
  link.click();
  expect(navigate).toHaveBeenCalledWith('/hivemind/app/overview/new');
  window.__hmNativeNavigate('/hivemind/app/crm');
  expect(navigate).toHaveBeenLastCalledWith('/hivemind/app/crm');
  openProductPage('https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness');
  expect(navigate).toHaveBeenLastCalledWith('/hivemind/app/employee/harness');
  stop();
  expect(window.__hmNativeNavigate).toBeUndefined();
  link.remove();
});

test('a web browser binds nothing', () => {
  isNativeApp.mockReturnValue(false);
  const navigate = jest.fn();
  bindNativeInAppLinks(navigate, document)();
  expect(window.__hmNativeNavigate).toBeUndefined();
});
