import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const source = name => readFileSync(new URL(`../src/components/hivemind/app/${name}`, import.meta.url), 'utf8');

test('Brain main reserves its header without counting the MobileShell safe area twice', () => {
  const shell = source('layout/AppShell.jsx');
  assert.match(shell, /paddingTop: '56px'/);
  assert.doesNotMatch(shell, /paddingTop: 'calc\(env\(safe-area-inset-top, 0px\) \+ 56px\)'/);
  assert.match(source('mobile/MobileShell.jsx'), /paddingTop: 'env\(safe-area-inset-top, 0px\)'/);
});
test('compact native frame consumes the safe top once and gives rooms remaining height', () => {
  const shell = source('layout/AppShell.jsx');
  assert.match(shell, /data-native-compact-chat=\{\(nativeChatRoom && employeeCompact\) \|\| undefined\}/);
  assert.match(shell, /nativeChatRoom && employeeCompact \? \{ paddingTop: 'env\(safe-area-inset-top, 0px\)' \}/);
  const css = source('layout/mobile-chat-viewport.css');
  assert.match(css, /height:calc\(var\(--hm-app-viewport-height, 100dvh\) - 56px - env\(safe-area-inset-top, 0px\)\)/);
  assert.match(css, /\[data-native-compact-chat\] \[data-os-harness-rooms\] \{ height:100%; \}/);
  assert.ok(css.split('\n').filter(line => line.startsWith('[')).every(line => line.startsWith('[data-native-compact-chat]')));
});
test('legacy Add and Apps retain defaults and native callers explicitly opt into keyboard bounds', () => {
  const sheets = source('mobile/LegacyChatSheets.jsx');
  assert.equal((sheets.match(/nativeViewport = false/g) || []).length, 2);
  assert.match(source('layout/MobileBrainAddSheet.jsx'), /LegacyMobileAddSheet nativeViewport/);
  assert.match(source('layout/NativeMobileAppsSheet.jsx'), /LegacyMobileAppsSheet nativeViewport/);
  assert.doesNotMatch(source('mobile/pages/TalkToHiveMobile.jsx'), /nativeViewport/);
  assert.match(source('layout/Sidebar.jsx'), /mobileDrawer \? \{ paddingTop: 'env\(safe-area-inset-top, 0px\)', paddingBottom: 'env\(safe-area-inset-bottom, 0px\)'/);
});

test('employee drawer and dismiss control respect keyboard height and notch inset', () => {
  const drawer = source('layout/EmployeeMobileNavigation.jsx');
  assert.match(drawer, /height: 'var\(--hm-app-viewport-height, 100dvh\)'/);
  assert.match(drawer, /top: 'calc\(env\(safe-area-inset-top, 0px\) \+ 8px\)'/);
});
