import { startPlacement, isNativeChatRoute } from './get-started-placement';
test('native chat routes include the employee harness and the Brain overview chat', () => {
  for (const pathname of ['/hivemind/app/overview', '/hivemind/app/overview/session/abc', '/hivemind/app/overview/new', '/hivemind/app/employee/harness', '/hivemind/app/employee/harness/room-1']) {
    expect(isNativeChatRoute(pathname)).toBe(true);
  }
  expect(isNativeChatRoute('/hivemind/app/knowledge')).toBe(false);
});
test('phones keep Get Started on the home screen, never over a room', () => {
  for (const pathname of ['/hivemind/app/overview/session/abc', '/hivemind/app/knowledge', '/hivemind/app/employee/dots/dot-a']) {
    expect(startPlacement({ pathname, phone: true })).toBe('home');
  }
});
test('desktop keeps the floating overlay', () => {
  expect(startPlacement({ pathname: '/hivemind/app/overview/session/abc', phone: false })).toBe('overlay');
  expect(startPlacement({ pathname: '/hivemind/app/knowledge', phone: false })).toBe('overlay');
});
