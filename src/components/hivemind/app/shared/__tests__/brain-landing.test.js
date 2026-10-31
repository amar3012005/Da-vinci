import { BRAIN_LEGACY_KEY, LAST_HARNESS_SESSION_KEY, brainLandingPath, isBareOverview, normalizeBrainEntry, rememberBrainMode } from '../brain-landing';
import { openFinalLink } from '../open-final-link';

const store = (initial = {}) => { const data = { ...initial }; return { getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = String(value); }, removeItem: key => { delete data[key]; } }; };

test('the bare overview lands on the remembered session, else the new chat', () => {
  expect(isBareOverview('/hivemind/app/overview')).toBe(true);
  expect(isBareOverview('/hivemind/app/overview/new')).toBe(false);
  expect(brainLandingPath(store())).toBe('/hivemind/app/overview/new');
  expect(brainLandingPath(store({ [LAST_HARNESS_SESSION_KEY]: '/hivemind/app/overview/session/s1' }))).toBe('/hivemind/app/overview/session/s1');
  expect(brainLandingPath(store({ [LAST_HARNESS_SESSION_KEY]: '/somewhere/else' }))).toBe('/hivemind/app/overview/new');
});

test('a legacy company keeps the bare overview, and leaving legacy clears the marker', () => {
  const legacy = store();
  rememberBrainMode(true, legacy);
  expect(legacy.getItem(BRAIN_LEGACY_KEY)).toBe('1');
  expect(brainLandingPath(legacy)).toBeNull();
  rememberBrainMode(false, legacy);
  expect(brainLandingPath(legacy)).toBe('/hivemind/app/overview/new');
});

test('a cold-loaded bare overview URL is replaced in place without a history entry', () => {
  const replaceState = jest.fn();
  const win = { location: { pathname: '/hivemind/app/overview', search: '?a=1', hash: '#h' }, sessionStorage: store(), history: { state: null, replaceState } };
  expect(normalizeBrainEntry(win)).toBe(true);
  expect(replaceState).toHaveBeenCalledWith(null, '', '/hivemind/app/overview/new?a=1#h');
  replaceState.mockClear();
  expect(normalizeBrainEntry({ ...win, location: { ...win.location, pathname: '/hivemind/app/overview/new' } })).toBe(false);
  expect(normalizeBrainEntry({ ...win, sessionStorage: store({ [BRAIN_LEGACY_KEY]: '1' }) })).toBe(false);
  expect(replaceState).not.toHaveBeenCalled();
});

test('a link written with the Brain host to an employee page loads the Runtime host directly', () => {
  const room = '/hivemind/app/employee/dots/employee/11111111-1111-4111-8111-111111111111';
  const assign = jest.fn(); const open = jest.fn();
  const win = { location: { href: 'https://next.singulancelabs.com/hivemind/app/overview/new', assign }, parent: null };
  win.parent = win;
  openFinalLink(`https://next.singulancelabs.com${room}`, { win, open });
  expect(open).toHaveBeenCalledWith(`https://runtime-runner.singulancelabs.com${room}`);
  expect(assign).not.toHaveBeenCalled();
  openFinalLink('https://example.com/x', { win, open });
  expect(assign).toHaveBeenCalledWith('https://example.com/x');
});
