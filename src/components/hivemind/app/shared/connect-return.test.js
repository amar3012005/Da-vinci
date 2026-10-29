import fs from 'node:fs';
import path from 'node:path';
import {
  appReturnLink, bindConnectReturnLinks, connectClient, connectReturnUrl, parseConnectReturn, returnTarget, safeReturnPath, targetFromAppLink,
} from './connect-return';

test('the callback is a public https first-party page that names the starting page', () => {
  const url = new URL(connectReturnUrl({ origin: 'https://next.singulancelabs.com', toolkit: 'hubspot', returnPath: '/hivemind/app/connectors', client: 'desktop' }));
  expect(url.origin + url.pathname).toBe('https://next.singulancelabs.com/hivemind/connect-return');
  expect(url.searchParams.get('composio_toolkit')).toBe('hubspot');
  expect(url.searchParams.get('return')).toBe('/hivemind/app/connectors');
  expect(url.searchParams.get('client')).toBe('desktop');
});

test('a webview origin is replaced by the product origin and web omits the client flag', () => {
  const native = new URL(connectReturnUrl({ origin: 'capacitor://localhost', toolkit: 'gmail', returnPath: '/hivemind/m/connectors', client: 'native' }));
  expect(native.origin).toBe('https://next.singulancelabs.com');
  expect(new URL(connectReturnUrl({ origin: 'https://singulancelabs.com', toolkit: 'gmail', returnPath: '/hivemind/app/connectors' })).searchParams.has('client')).toBe(false);
});

test('return paths outside the app are replaced by the Connectors page', () => {
  for (const bad of ['https://evil.example/x', '//evil.example', '/other', '/hivemind/login?create=1', '/hivemind/app/../x\\y', '', null]) {
    expect(safeReturnPath(bad)).toBe('/hivemind/app/connectors');
  }
  expect(safeReturnPath('/hivemind/app/employee/apps?x=1')).toBe('/hivemind/app/employee/apps?x=1');
});

test('the provider result is carried onto the starting page, never to login', () => {
  const result = parseConnectReturn('?composio_toolkit=hubspot&status=success&connected_account_id=ca_1&return=%2Fhivemind%2Fapp%2Fconnectors%3Fa%3D1&client=desktop');
  expect(returnTarget(result)).toBe('/hivemind/app/connectors?a=1&composio_toolkit=hubspot&status=success&connected_account_id=ca_1');
  expect(returnTarget(parseConnectReturn('?composio_toolkit=x&return=https%3A%2F%2Fevil.example'))).toBe('/hivemind/app/connectors?composio_toolkit=x');
  expect(returnTarget(result)).not.toContain('login');
});

test('the app deep link round-trips to the same target', () => {
  const result = parseConnectReturn('?composio_toolkit=hubspot&connected_account_id=ca_1&return=%2Fhivemind%2Fm%2Fconnectors');
  const link = appReturnLink(result);
  expect(link.startsWith('singulance://connect-return?')).toBe(true);
  expect(targetFromAppLink(link)).toBe('/hivemind/m/connectors?composio_toolkit=hubspot&status=success&connected_account_id=ca_1');
  expect(targetFromAppLink('singulance://auth/callback?code=a&state=b')).toBeNull();
  expect(targetFromAppLink('https://x.test/connect-return')).toBeNull();
});

test('the desktop and mobile apps load the starting page when the link arrives', async () => {
  const load = jest.fn();
  let desktopHandler;
  const remove = jest.fn();
  const browser = { electron: { isElectron: true, onDeepLink: (cb) => { desktopHandler = cb; return remove; } } };
  let nativeHandler;
  const capacitorApp = { addListener: jest.fn(async (_event, cb) => { nativeHandler = cb; return { remove }; }) };
  const dispose = bindConnectReturnLinks({ browser, load, capacitorApp });
  desktopHandler('singulance://connect-return?composio_toolkit=hubspot&status=success&return=%2Fhivemind%2Fapp%2Fconnectors');
  desktopHandler('singulance://auth/callback?code=a');
  await Promise.resolve();
  nativeHandler({ url: 'singulance://connect-return?composio_toolkit=gmail&return=%2Fhivemind%2Fm%2Fconnectors' });
  expect(load.mock.calls.map(([path]) => path)).toEqual([
    '/hivemind/app/connectors?composio_toolkit=hubspot&status=success',
    '/hivemind/m/connectors?composio_toolkit=gmail',
  ]);
  dispose();
  expect(remove).toHaveBeenCalledTimes(2);
});

test('connectClient tells the desktop app, the mobile app and the browser apart', () => {
  expect(connectClient({ electron: { isElectron: true } })).toBe('desktop');
  expect(connectClient({ Capacitor: { isNativePlatform: () => true } })).toBe('native');
  expect(connectClient({})).toBe('web');
});

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('the return page is a public route and every connect start uses it', () => {
  const app = read('HiveMindApp.jsx');
  const route = app.indexOf('path="connect-return"');
  expect(route).toBeGreaterThan(-1);
  expect(app.lastIndexOf('<ProtectedRoute', route)).toBeLessThan(app.lastIndexOf('<Route path="login"', route));
  for (const file of ['pages/Connectors.jsx', 'pages/ComposioToolkitBrowser.jsx', 'mobile/pages/MobileConnectors.jsx', 'hyperagents/HqRuntimeConsole.jsx', 'mobile/pages/TalkToHiveMobile.jsx', 'layout/NativeMobileAppsSheet.jsx']) {
    expect(read(file)).toContain('connectReturnUrl(');
  }
});

test('the Connectors page reloads its list when the provider returns', () => {
  const page = read('pages/Connectors.jsx');
  expect(page).toContain("searchParams.get('composio_toolkit')");
  expect(page).toMatch(/composioReturnToolkit[\s\S]{0,900}refetchOAuth\(\)/);
});
