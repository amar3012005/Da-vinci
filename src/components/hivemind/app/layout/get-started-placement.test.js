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

test('the HyperAgents checklist never floats over a composer: rooms get the sidebar chip, phones the home screen', () => {
  const { hyperAgentsStartPlacement, isComposerRoute } = require('./get-started-placement');
  for (const pathname of ['/hivemind/app/employee/dots/dot_a', '/hivemind/app/employee/harness', '/hivemind/app/employee/harness/session/x', '/hivemind/app/employee/976c0a88-8c22-4ea9-9638-d3296db486da', '/hivemind/app/employees/roster-room', '/hivemind/app/overview/new']) {
    expect(isComposerRoute(pathname)).toBe(true);
    expect(hyperAgentsStartPlacement({ pathname, phone: false })).toBe('sidebar');
    expect(hyperAgentsStartPlacement({ pathname, phone: true })).toBe('home');
  }
  for (const pathname of ['/hivemind/app/employee/apps', '/hivemind/app/employee/library', '/hivemind/app/employee/calendar', '/hivemind/app/crm']) {
    expect(isComposerRoute(pathname)).toBe(false);
    expect(hyperAgentsStartPlacement({ pathname, phone: false })).toBe('overlay');
  }
});

test('the shell floats the card only on overlay routes and the desktop sidebar holds the room chip', () => {
  const fs = require('fs'); const path = require('path');
  const shell = fs.readFileSync(path.join(__dirname, 'AppShell.jsx'), 'utf8');
  expect(shell).toMatch(/hyperAgentsStartPlacement\(\{ pathname: location\.pathname, phone: brainPhone \}\) === 'overlay' && <GetStartedCard/);
  const nav = fs.readFileSync(path.join(__dirname, 'DesktopHyperAgentsNavigation.jsx'), 'utf8');
  expect(nav).toMatch(/=== 'sidebar' && <div className="ha-get-started-seat"[^>]*><React\.Suspense fallback=\{null\}><GetStartedCard variant="home"/);
});
