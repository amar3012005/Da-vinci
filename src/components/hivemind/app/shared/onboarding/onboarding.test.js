import locales from './onboarding-locales.json';
import { STEPS, STEP_IDS, STEP_TILE, LEGACY_SURFACES, BRAIN_STEPS, BRAIN_STEP_IDS, MILESTONE_BRAIN_STEP, isBrainOnly, completedCount, nextStepId } from './registry';
import { currentPlatform, onboardingStore, migrateLegacyProgress, adoptServerLocale, resetOnboardingStores, EXPLICIT_LANGUAGE_KEY, ONBOARDING_ENDPOINT } from './onboarding-store';
import i18n from '../../../../../i18n';

jest.mock('../../../../../i18n', () => ({ __esModule: true, default: { language: 'en', t: (key, options) => options?.defaultValue || key, changeLanguage: jest.fn(), addResourceBundle: jest.fn() } }));

const keys = (value, prefix = '') => Object.entries(value).flatMap(([key, item]) => item && typeof item === 'object' ? keys(item, `${prefix}${key}.`) : [`${prefix}${key}`]);
const view = (statuses = {}, extra = {}) => ({ version: 1, open: true, locale: null, surfaces: {}, steps: STEP_IDS.map(id => ({ id, status: statuses[id] || 'todo', ready: false })), proactive: { state: 'waiting', item: null }, ...extra });

beforeEach(() => { localStorage.clear(); resetOnboardingStores(); jest.useRealTimers(); });

test('one registry: the server step ids in order, a tile each, and no two neighbours share a tile', () => {
  expect(STEP_IDS).toEqual(['language', 'awaken', 'meet', 'first_task', 'authority', 'connect_app', 'first_proactive', 'shared_brain', 'brief_team']);
  for (let index = 1; index < STEP_IDS.length; index += 1) expect(STEP_TILE[STEP_IDS[index]]).not.toBe(STEP_TILE[STEP_IDS[index - 1]]);
  expect(STEPS.find(step => step.id === 'awaken').skippable).toBe(false);
});

test('every walkthrough locale, Arabic included, has every English key with the same placeholders and no internal names', () => {
  const english = keys(locales.en).sort();
  expect(Object.keys(locales)).toEqual(['en', 'de', 'es', 'fr', 'hi', 'ja', 'ar']);
  const placeholders = text => [...String(text).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(match => match[1]).sort().join(',');
  const flat = value => Object.fromEntries(keys(value).map(key => [key, key.split('.').reduce((node, part) => node[part], value)]));
  for (const [language, strings] of Object.entries(locales)) {
    expect(keys(strings).sort()).toEqual(english);
    for (const [key, text] of Object.entries(flat(strings))) expect([language, key, placeholders(text)]).toEqual([language, key, placeholders(flat(locales.en)[key])]);
    for (const id of STEP_IDS) expect(strings.steps[id].title.length).toBeGreaterThan(0);
    expect(JSON.stringify(strings)).not.toMatch(/\bDot\b|tenant|harness|onb_/i);
    if (language !== 'en') expect(strings.steps.meet.title).not.toBe(locales.en.steps.meet.title);
  }
});

test('the next step passes over moments that have not happened yet, never faking them', () => {
  const steps = view({ language: 'done', awaken: 'done', meet: 'done', first_task: 'done', authority: 'skipped', connect_app: 'done' }).steps;
  expect(nextStepId(steps)).toBe('brief_team');
  expect(nextStepId(steps.map(step => step.id === 'first_proactive' ? { ...step, ready: true } : step))).toBe('first_proactive');
  expect(nextStepId(steps.map(step => step.id === 'brief_team' ? { ...step, status: 'done' } : step))).toBe('first_proactive');
  expect(completedCount(steps)).toBe(6);
  expect(nextStepId(STEP_IDS.map(id => ({ id, status: 'done' })))).toBeNull();
});

function fetcher(responses) {
  const calls = [];
  const fn = jest.fn(async (url, init = {}) => {
    calls.push({ url, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null });
    const next = responses.length > 1 ? responses.shift() : responses[0];
    if (next instanceof Error) throw next;
    return { ok: next.status ? next.status < 400 : true, status: next.status || 200, json: async () => next.body || next };
  });
  fn.calls = calls;
  return fn;
}

test('reads the server record, caches it per person, and batches events into one POST', async () => {
  jest.useFakeTimers();
  const fetch = fetcher([view(), view({ meet: 'skipped' })]);
  const store = onboardingStore('u:o', { fetcher: fetch, delay: 50 });
  await store.refresh();
  expect(store.get().steps).toHaveLength(9);
  expect(JSON.parse(localStorage.getItem('hm.onboarding.v1:u:o')).steps).toHaveLength(9);
  store.track('onb_step_view', 'meet');
  store.track('onb_step_skip', 'meet');
  store.track('onb_step_done', 'not-a-step');
  expect(store.get().steps.find(step => step.id === 'meet').status).toBe('skipped');
  jest.advanceTimersByTime(60);
  await Promise.resolve(); await Promise.resolve();
  const posts = fetch.calls.filter(call => call.method === 'POST');
  expect(posts).toHaveLength(1);
  expect(posts[0].url).toBe(ONBOARDING_ENDPOINT);
  expect(posts[0].body.events.map(event => [event.type, event.step, event.device, event.version, event.platform])).toEqual([['onb_step_view', 'meet', 'desktop', 1, 'web'], ['onb_step_skip', 'meet', 'desktop', 1, 'web']]);
});

test('a failed save keeps the batch for the next flush and says progress is saved', async () => {
  const fetch = fetcher([new Error('offline'), view()]);
  const store = onboardingStore('u:o', { fetcher: fetch, delay: 1 });
  store.track('onb_step_done', 'first_task');
  store.confirmLocale('de');
  await store.flush();
  expect(store.error()).toMatch(/saved/);
  await store.flush();
  const post = fetch.calls.at(-1);
  expect(post.body.events[0].step).toBe('first_task');
  expect(post.body.locale).toBe('de');
});

test('older browser-only progress is carried over once: closed tours become surfaces, checked Runtime rail steps become done', () => {
  localStorage.setItem(LEGACY_SURFACES.companyTour.key('u', 'o'), JSON.stringify({ step: 5, done: true }));
  localStorage.setItem('hm.tour.overview', '2');
  localStorage.setItem('hivemind.runtime-get-started:v2:u:o', JSON.stringify({ companyUnderstood: true, teamIntroduced: false }));
  const store = onboardingStore('u:o', { fetcher: fetcher([view()]) });
  const surfaces = jest.spyOn(store, 'closeSurfaces'); const track = jest.spyOn(store, 'track');
  expect(migrateLegacyProgress(store, { userId: 'u', orgId: 'o' })).toBe(true);
  expect(surfaces).toHaveBeenCalledWith(['company_tour:editorial-v1', 'brain_tour:2']);
  expect(track).toHaveBeenCalledWith('onb_step_done', 'awaken');
  expect(track).not.toHaveBeenCalledWith('onb_step_done', 'meet');
  expect(migrateLegacyProgress(store, { userId: 'u', orgId: 'o' })).toBe(false);
});

test('a language confirmed on another device applies here unless the person picked one by hand on this device', () => {
  expect(adoptServerLocale('de')).toBe(true);
  expect(i18n.changeLanguage).toHaveBeenCalledWith('de');
  expect(adoptServerLocale('en')).toBe(false);
  localStorage.setItem(EXPLICIT_LANGUAGE_KEY, '1');
  i18n.changeLanguage.mockClear();
  expect(adoptServerLocale('ja')).toBe(false);
  expect(i18n.changeLanguage).not.toHaveBeenCalled();
});

test('the funnel client class is web in a browser, ios in the iOS app and macos in the macOS app', () => {
  expect(currentPlatform()).toBe('web');
  window.Capacitor = { getPlatform: () => 'ios' };
  expect(currentPlatform()).toBe('ios');
  window.Capacitor = { getPlatform: () => 'electron' };
  expect(currentPlatform()).toBe('macos');
  window.Capacitor = { getPlatform: () => 'web' };
  expect(currentPlatform()).toBe('web');
  delete window.Capacitor;
});

describe('Brain-only steps on the server record', () => {
  const brainView = (statuses = {}, extra = {}) => ({ ...view({}, { tier: 'brain_only' }), brainSteps: BRAIN_STEP_IDS.map(id => ({ id, status: statuses[id] || 'todo', at: null })), ...extra });

  test('seven Brain steps in order, each with a route, and the team card hides only when the server says Brain-only', () => {
    expect(BRAIN_STEP_IDS).toEqual(['language', 'company', 'source', 'ask', 'remember', 'connect', 'invite']);
    expect(BRAIN_STEPS.every(step => step.to.startsWith('/hivemind/app/'))).toBe(true);
    expect(isBrainOnly({ tier: 'brain_only' })).toBe(true);
    expect(isBrainOnly({ tier: 'team' })).toBe(false);
    expect(isBrainOnly(null)).toBe(false);
  });

  test('a cited answer is reported once, ticks ask at once, and is not sent again after the server shows it done', async () => {
    const fetch = fetcher([brainView(), brainView({ ask: 'done' })]);
    const store = onboardingStore('u:o', { fetcher: fetch, delay: 1 });
    await store.refresh();
    store.milestone('answer_cited');
    expect(store.get().brainSteps.find(step => step.id === 'ask').status).toBe('done');
    await store.flush();
    const post = fetch.calls.find(call => call.method === 'POST');
    expect(post.body.milestones).toEqual(['answer_cited']);
    const calls = fetch.calls.length;
    store.milestone('answer_cited');
    await store.flush();
    expect(fetch.calls.length).toBe(calls);
  });

  test('the ask step cannot be completed by a done event or a click, only by its milestone', async () => {
    const fetch = fetcher([brainView()]);
    const store = onboardingStore('u:o', { fetcher: fetch, delay: 1 });
    await store.refresh();
    store.track('onb_step_done', 'ask');
    store.track('onb_step_done', 'source');
    await store.flush();
    expect(store.get().brainSteps.every(step => step.status === 'todo')).toBe(true);
    expect(fetch.calls.some(call => call.method === 'POST')).toBe(false);
    store.track('onb_step_view', 'ask');
    await store.flush();
    expect(fetch.calls.find(call => call.method === 'POST').body.events).toEqual([expect.objectContaining({ type: 'onb_step_view', step: 'ask' })]);
    expect(Object.keys(MILESTONE_BRAIN_STEP).sort()).toEqual(['answer_cited', 'app_connected', 'company_saved', 'invite_sent', 'memory_saved', 'source_added']);
  });
});
