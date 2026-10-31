import { deriveNotificationItems, takeArrivals, markItemRead, normalizeDeepLink } from '../model';
import { autonomyAllows, bannerAllowed, createBannerQueue, inQuietHours } from '../banner-rules';
import { loadSettings, saveSettings, settingsKey, DEFAULT_SETTINGS } from '../settings';
import { haptic, hapticPlatform } from '../../platform-haptics';

const roster = [{ id: 'e1', name: 'Maya' }];
const bell = [
  { id: 'n1', type: 'lifecycle.email.sent', title: 'Day 1', createdAt: '2026-10-31T08:00:00Z', data: { href: '/hivemind/app/x' } },
  { id: 'n2', type: 'task.done', title: 'Report ready', readAt: '2026-10-31T09:00:00Z', createdAt: '2026-10-31T09:00:00Z', data: { employeeId: 'e1' } },
  { id: 'n3', type: 'task.done', title: 'Other company', org_id: 'org_b', createdAt: '2026-10-31T10:00:00Z' },
];
const cards = [{ id: 'msg_a', employeeId: 'E1', dotId: 'd', conversationId: 'c', createdAt: Date.parse('2026-10-31T11:00:00Z'), kind: 'approval', title: 'Send reply' }];

describe('model', () => {
  const items = deriveNotificationItems({ companyId: 'org_a', bell, needsYou: cards, roster });
  test('derives categories, read state, employees and deep links; drops other companies', () => {
    expect(items.map(item => item.id)).toEqual(['needs_you:msg_a', 'bell:n2', 'bell:n1']);
    expect(items[0]).toMatchObject({ category: 'needs_you', read: false, companyId: 'org_a', employee: { id: 'E1', name: 'Maya' }, deepLink: 'hivemind:needs-you:msg_a' });
    expect(items[1]).toMatchObject({ category: 'results', read: true, employee: { id: 'e1', name: 'Maya' } });
    expect(items[2]).toMatchObject({ category: 'briefs', deepLink: '/hivemind/app/x' });
  });
  test('no company, no items', () => expect(deriveNotificationItems({ bell, needsYou: cards })).toEqual([]));
  test('arrivals are unseen unread items, oldest first', () => {
    const seen = new Set(['bell:n1']);
    expect(takeArrivals(items, seen).map(item => item.id)).toEqual(['needs_you:msg_a']);
    expect(takeArrivals(items, seen)).toEqual([]);
  });
  test('mark read calls the bell API only for unread bell items', async () => {
    const client = { markWorkspaceNotificationRead: jest.fn().mockResolvedValue({}) };
    expect(await markItemRead(items[2], client)).toBe(true);
    expect(await markItemRead(items[1], client)).toBe(false);
    expect(await markItemRead(items[0], client)).toBe(false);
    expect(client.markWorkspaceNotificationRead).toHaveBeenCalledWith('n1');
  });
  test('singulance deep links become in-app paths', () => expect(normalizeDeepLink('singulance://app/hivemind/app/overview')).toBe('/hivemind/app/overview'));
});

describe('banner rules', () => {
  const settings = DEFAULT_SETTINGS;
  test('autonomy dial gates categories', () => {
    expect(['needs_you', 'results', 'briefs'].map(c => autonomyAllows(0, c))).toEqual([false, false, false]);
    expect(['needs_you', 'results', 'briefs'].map(c => autonomyAllows(1, c))).toEqual([false, false, true]);
    expect(['needs_you', 'results', 'briefs'].map(c => autonomyAllows(2, c))).toEqual([true, true, true]);
    expect(autonomyAllows(undefined, 'results')).toBe(true);
  });
  test('category toggles and quiet hours; Needs you passes quiet hours', () => {
    const quiet = { ...settings, quietHours: { enabled: true, start: '22:00', end: '07:00' } };
    const night = new Date(2026, 9, 31, 23, 30);
    expect(inQuietHours(quiet.quietHours, night)).toBe(true);
    expect(inQuietHours(quiet.quietHours, new Date(2026, 9, 31, 12, 0))).toBe(false);
    expect(bannerAllowed({ category: 'results' }, { level: 3, settings: quiet, now: night })).toBe(false);
    expect(bannerAllowed({ category: 'needs_you' }, { level: 3, settings: quiet, now: night })).toBe(true);
    expect(bannerAllowed({ category: 'results' }, { level: 3, settings: { ...settings, categories: { ...settings.categories, results: false } } })).toBe(false);
  });
  describe('queue', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());
    const item = (id, category = 'results', employee = 'e1') => ({ id, category, employee: { id: employee, name: employee }, title: id });
    test('auto-hides after 5 s and shows the next', () => {
      const seen = []; const queue = createBannerQueue({ onChange: banner => seen.push(banner?.item.id ?? null) });
      queue.push(item('a', 'results', 'e1')); queue.push(item('b', 'results', 'e2'));
      expect(queue.current.item.id).toBe('a');
      jest.advanceTimersByTime(5000);
      expect(queue.current.item.id).toBe('b');
      jest.advanceTimersByTime(5000);
      expect(queue.current).toBeNull();
    });
    test('a burst from one employee coalesces into one banner and restarts the timer', () => {
      const queue = createBannerQueue({ onChange: () => {} });
      queue.push(item('a')); jest.advanceTimersByTime(4000); queue.push(item('b')); queue.push(item('c'));
      expect(queue.current.count).toBe(3); expect(queue.pending).toBe(0);
      jest.advanceTimersByTime(4000); expect(queue.current).not.toBeNull();
      jest.advanceTimersByTime(1000); expect(queue.current).toBeNull();
    });
    test('Needs you is sticky and replaces a plain banner', () => {
      const queue = createBannerQueue({ onChange: () => {} });
      queue.push(item('a', 'results', 'e1')); queue.push(item('n', 'needs_you', 'e2'));
      expect(queue.current.item.id).toBe('n'); expect(queue.pending).toBe(1);
      jest.advanceTimersByTime(60000); expect(queue.current.item.id).toBe('n');
      queue.dismiss(); expect(queue.current.item.id).toBe('a');
    });
    test('an answered card is removed', () => {
      const queue = createBannerQueue({ onChange: () => {} });
      queue.push(item('n', 'needs_you', 'e2')); queue.remove('n'); expect(queue.current).toBeNull();
    });
  });
});

describe('settings', () => {
  test('persist per person and mirror device flags', () => {
    window.localStorage.clear();
    expect(loadSettings('c', 'u')).toEqual(expect.objectContaining({ haptics: true }));
    saveSettings('c', 'u', { ...DEFAULT_SETTINGS, haptics: false, categories: { ...DEFAULT_SETTINGS.categories, briefs: false } });
    expect(loadSettings('c', 'u')).toMatchObject({ haptics: false, categories: { briefs: false, needs_you: true } });
    expect(loadSettings('c', 'other').haptics).toBe(true);
    expect(window.localStorage.getItem('hm_native_touch_feedback')).toBe('off');
    window.localStorage.setItem(settingsKey('c', 'bad'), '{nope');
    expect(loadSettings('c', 'bad')).toEqual(loadSettings('c', 'none'));
  });
  test('storage that throws falls back to defaults', () => {
    const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
    expect(loadSettings('c', 'u', broken).haptics).toBe(true);
    expect(() => saveSettings('c', 'u', DEFAULT_SETTINGS, broken)).not.toThrow();
  });
});

describe('haptic adapter', () => {
  const win = (extra = {}) => ({ localStorage: { getItem: () => null }, matchMedia: () => ({ matches: false }), navigator: {}, ...extra });
  test('iOS uses the native plugin', () => {
    const plugin = { haptic: jest.fn().mockResolvedValue() };
    const w = win({ Capacitor: { getPlatform: () => 'ios', isNativePlatform: () => true } });
    expect(haptic('warning', { win: w, plugin })).toBe('ios');
    expect(plugin.haptic).toHaveBeenCalledWith({ kind: 'warning' });
  });
  test('iOS plugin missing the method or rejecting does not throw', () => {
    const w = win({ Capacitor: { getPlatform: () => 'ios', isNativePlatform: () => true } });
    expect(() => haptic('light', { win: w, plugin: {} })).not.toThrow();
    expect(() => haptic('light', { win: w, plugin: { haptic: () => Promise.reject(new Error('x')) } })).not.toThrow();
  });
  test('macOS app bridge, then vibrate, then nothing', () => {
    const desktop = jest.fn();
    expect(haptic('selection', { win: win({ singulanceDesktop: { haptic: desktop } }), plugin: {} })).toBe('desktop');
    expect(desktop).toHaveBeenCalledWith('selection');
    const vibrate = jest.fn();
    expect(haptic('success', { win: win({ navigator: { vibrate } }), plugin: {} })).toBe('vibrate');
    expect(vibrate).toHaveBeenCalledWith([12, 40, 12]);
    expect(haptic('success', { win: win(), plugin: {} })).toBeNull();
    expect(hapticPlatform(win(), {})).toBe('none');
  });
  test('reduced motion, the setting and unknown kinds silence it', () => {
    const vibrate = jest.fn();
    expect(haptic('light', { win: win({ navigator: { vibrate } }), reducedMotion: true })).toBeNull();
    expect(haptic('light', { win: win({ navigator: { vibrate } }), enabled: false })).toBeNull();
    expect(haptic('nope', { win: win({ navigator: { vibrate } }) })).toBeNull();
    expect(haptic('light', { win: win({ navigator: { vibrate }, matchMedia: () => ({ matches: true }) }) })).toBeNull();
    expect(vibrate).not.toHaveBeenCalled();
  });
});
