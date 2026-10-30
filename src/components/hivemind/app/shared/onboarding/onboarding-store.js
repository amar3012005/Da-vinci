import { useEffect, useMemo, useSyncExternalStore } from 'react';
import i18n from '../../../../../i18n';
import { isNativeApp } from '../native-app';
import './onboarding-i18n';
import {
  LEGACY_RUNTIME_RAIL_KEY, LEGACY_SURFACES, ONBOARDING_VERSION, RUNTIME_CHECKPOINT_STEPS, STEP_IDS,
} from './registry';

/**
 * Browser side of the walkthrough. The server record (OpenDot, `/api/hivemind/onboarding`) owns progress; this module keeps
 * a per-person cache for an instant first paint, batches step events, carries older browser-only progress over once, and
 * bridges window events (dial saved, language picked, Runtime checkpoints) into the record.
 */
export const ONBOARDING_ENDPOINT = '/api/hivemind/onboarding';
const cacheKey = scope => `hm.onboarding.v1:${scope}`;
const migratedKey = scope => `hm.onboarding.migrated.v1:${scope}`;
/** Set when the person picks a language by hand on this device; a server language never overrides it. */
export const EXPLICIT_LANGUAGE_KEY = 'hm.lang.explicit';

const storage = {
  get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { window.localStorage.setItem(key, value); } catch { /* Optional cache: only the instant first paint is lost. */ } },
};

/** `phone` under 768px, matching the shell's phone layouts. */
export function currentDevice() {
  try { return window.matchMedia('(max-width: 767px)').matches ? 'phone' : 'desktop'; } catch { return 'desktop'; }
}

const stores = new Map();

/**
 * One store per person and company (`scope` is `userId:orgId`).
 * @param {string} scope
 * @param {{ fetcher?: typeof fetch, delay?: number }} [options]
 * @returns {object} the store
 */
export function onboardingStore(scope, { fetcher, delay = 400 } = {}) {
  if (!scope) return null;
  const existing = stores.get(scope);
  if (existing && !fetcher) return existing;
  const doFetch = fetcher || ((...args) => fetch(...args));
  let view = null;
  try { view = JSON.parse(storage.get(cacheKey(scope)) || 'null'); } catch { view = null; }
  let error = '';
  const listeners = new Set();
  let queue = [];
  let extra = {};
  let timer = null;
  let loading = null;
  const offline = isNativeApp();

  const emit = () => { for (const listener of listeners) listener(); };
  const accept = next => {
    if (!next || !Array.isArray(next.steps)) return;
    view = next; error = '';
    storage.set(cacheKey(scope), JSON.stringify(next));
    emit();
  };
  const optimistic = (step, status) => {
    if (!view) return;
    const rank = { todo: 0, seen: 1, skipped: 2, done: 3 };
    view = { ...view, steps: view.steps.map(item => item.id === step && rank[status] > rank[item.status] ? { ...item, status, at: Date.now() } : item) };
    emit();
  };
  const post = async body => {
    if (offline) return null;
    const response = await doFetch(ONBOARDING_ENDPOINT, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`onboarding ${response.status}`);
    const next = await response.json();
    accept(next);
    return next;
  };
  const flush = async () => {
    timer = null;
    const events = queue; const body = { ...extra, events }; queue = []; extra = {};
    if (!events.length && !Object.keys(body).some(key => key !== 'events')) return;
    try { await post(body); }
    catch {
      // Keep the batch for the next flush; progress already shows optimistically.
      queue = [...events, ...queue].slice(-20);
      extra = { ...body, ...extra }; delete extra.events;
      error = i18n.t('error', { ns: 'onboarding', defaultValue: 'Your progress is saved. It will show again in a moment.' });
      emit();
    }
  };
  const schedule = () => { if (!timer) timer = setTimeout(flush, delay); };

  const store = {
    scope,
    get: () => view,
    error: () => error,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    /** Read the record from the server; at most one read in flight. */
    refresh() {
      if (offline) return Promise.resolve(view);
      if (loading) return loading;
      loading = doFetch(ONBOARDING_ENDPOINT, { credentials: 'include', headers: { accept: 'application/json' } })
        .then(response => response.ok ? response.json() : Promise.reject(new Error(`onboarding ${response.status}`)))
        .then(next => { accept(next); return next; })
        .catch(() => { error = view ? '' : i18n.t('error', { ns: 'onboarding', defaultValue: 'Your progress is saved. It will show again in a moment.' }); emit(); return view; })
        .finally(() => { loading = null; });
      return loading;
    },
    /**
     * Record one walkthrough event.
     * @param {'onb_step_view'|'onb_step_done'|'onb_step_skip'|'onb_resume'|'onb_replay'|'onb_dismiss'} type
     * @param {string|null} [step]
     */
    track(type, step = null) {
      if (step && !STEP_IDS.includes(step)) return;
      queue.push({ type, step, version: ONBOARDING_VERSION, locale: (i18n.language || 'en').split('-')[0], device: currentDevice(), at: Date.now() });
      if (type === 'onb_step_done') optimistic(step, 'done');
      if (type === 'onb_step_skip') optimistic(step, 'skipped');
      if (type === 'onb_dismiss' && view) { view = { ...view, open: false }; emit(); }
      if (type === 'onb_replay' && view) { view = { ...view, open: true }; emit(); }
      schedule();
    },
    /** The person confirmed an interface language; employees use it when the profile names none. */
    confirmLocale(locale) { extra.locale = locale; optimistic('language', 'done'); schedule(); },
    /** Older first-run surfaces the person closed. */
    closeSurfaces(ids) { extra.surfaces = [...new Set([...(extra.surfaces || []), ...ids])]; if (view) { view = { ...view, surfaces: { ...view.surfaces, ...Object.fromEntries(ids.map(id => [id, Date.now()])) } }; emit(); } schedule(); },
    /** Milestones only the browser sees: `authority_set`, `proactive_opened`, `company_awake`. */
    milestone(id) { extra.milestones = [...new Set([...(extra.milestones || []), id])]; schedule(); },
    flush,
  };
  stores.set(scope, store);
  return store;
}

/**
 * Carry older browser-only progress into the server record once per person and company: closed tours become surfaces and
 * the Runtime rail's checked steps become done events.
 * @param {object} store - From {@link onboardingStore}.
 * @param {{ userId: string, orgId: string }} ids
 * @returns {boolean} whether anything was carried over
 */
export function migrateLegacyProgress(store, { userId, orgId }) {
  if (!store || storage.get(migratedKey(store.scope))) return false;
  let carried = false;
  const surfaces = Object.values(LEGACY_SURFACES).filter(entry => { const key = entry.key(userId, orgId); const raw = key && storage.get(key); return raw && entry.closed(raw); }).map(entry => entry.surface);
  if (surfaces.length) { store.closeSurfaces(surfaces); carried = true; }
  try {
    const rail = JSON.parse(storage.get(LEGACY_RUNTIME_RAIL_KEY(store.scope)) || '{}');
    for (const [field, step] of Object.entries(RUNTIME_CHECKPOINT_STEPS)) if (rail[field] === true) { store.track('onb_step_done', step); carried = true; }
  } catch { /* A corrupt rail cache carries nothing over. */ }
  storage.set(migratedKey(store.scope), '1');
  return carried;
}

/**
 * Apply the server's confirmed language on a device where the person never picked one by hand.
 * @param {string|null} locale - The server record's language.
 * @returns {boolean} whether the language changed
 */
export function adoptServerLocale(locale) {
  if (!locale || storage.get(EXPLICIT_LANGUAGE_KEY)) return false;
  const current = (i18n.language || 'en').split('-')[0];
  if (current === locale.split('-')[0]) return false;
  void i18n.changeLanguage(locale);
  return true;
}

/**
 * Connect a store to the page once, however many components use it: the first read, the one-time carry-over, the server
 * language, and the window events (focus, language picked, dial saved, Runtime checkpoints).
 * @param {object} store - From {@link onboardingStore}.
 * @param {{ userId: string, orgId: string }} ids
 * @returns {() => void} detach
 */
function attach(store, { userId, orgId }) {
  store.attached = (store.attached || 0) + 1;
  if (store.attached > 1) return () => { store.attached -= 1; };
  void store.refresh().then(next => {
    if (migrateLegacyProgress(store, { userId, orgId })) void store.flush();
    adoptServerLocale(next?.locale);
  });
  const onFocus = () => { if (!document.hidden) void store.refresh(); };
  const onLanguage = event => {
    const language = event.detail?.language;
    if (!language) return;
    storage.set(EXPLICIT_LANGUAGE_KEY, '1');
    store.confirmLocale(language);
  };
  const onMilestone = event => {
    if (event.detail?.milestone) store.milestone(event.detail.milestone);
    if (event.detail?.step) store.track('onb_step_done', event.detail.step);
  };
  const onCheckpoint = event => {
    const data = event.detail;
    if (data?.version !== 1) return;
    for (const [field, step] of Object.entries(RUNTIME_CHECKPOINT_STEPS)) if (data[field] === true) store.track('onb_step_done', step);
  };
  window.addEventListener('focus', onFocus);
  window.addEventListener('hivemind:ui-language', onLanguage);
  window.addEventListener('hm:onboarding', onMilestone);
  window.addEventListener('hivemind:runtime-get-started', onCheckpoint);
  return () => {
    store.attached -= 1;
    if (store.attached > 0) return;
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('hivemind:ui-language', onLanguage);
    window.removeEventListener('hm:onboarding', onMilestone);
    window.removeEventListener('hivemind:runtime-get-started', onCheckpoint);
  };
}

/**
 * The walkthrough for the signed-in person: the server view (cached first), its store, and the last save error.
 * @param {{ userId?: string, orgId?: string }} ids
 * @returns {{ view: object|null, error: string, store: object|null }}
 */
export function useOnboarding({ userId, orgId }) {
  const scope = userId && orgId ? `${userId}:${orgId}` : null;
  const store = useMemo(() => onboardingStore(scope), [scope]);
  const view = useSyncExternalStore(store ? store.subscribe : noopSubscribe, store ? store.get : nothing, nothing);
  const error = store ? store.error() : '';
  useEffect(() => store ? attach(store, { userId, orgId }) : undefined, [store, userId, orgId]);
  return { view, error, store };
}

const noopSubscribe = () => () => {};
const nothing = () => null;

/** Test helper: forget every store. */
export function resetOnboardingStores() { stores.clear(); }
