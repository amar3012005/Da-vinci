import { startPlacement, isNativeChatRoute } from './get-started-placement';
test('phone chat routes dock the pill in the top bar, never the bottom overlay', () => {
  for (const pathname of ['/hivemind/app/overview', '/hivemind/app/overview/session/abc', '/hivemind/app/overview/new', '/hivemind/app/employee/harness', '/hivemind/app/employee/harness/room-1']) {
    expect(isNativeChatRoute(pathname)).toBe(true);
    expect(startPlacement({ pathname, phone: true })).toBe('top-bar');
  }
});
test('desktop chat and non-chat phone pages keep the floating overlay', () => {
  expect(startPlacement({ pathname: '/hivemind/app/overview/session/abc', phone: false })).toBe('overlay');
  expect(startPlacement({ pathname: '/hivemind/app/knowledge', phone: true })).toBe('overlay');
  expect(startPlacement({ pathname: '/hivemind/app/employee/dots/dot-a', phone: true })).toBe('overlay');
});
