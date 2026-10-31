/**
 * Which items may show an in-app banner, and the one-at-a-time banner queue.
 */
export const BANNER_AUTO_HIDE_MS = 5000;

/**
 * The autonomy dial gates banners: Observe shows none, Suggest only briefs, Prepare and above everything.
 * An unset level behaves as Prepare, as the dial itself draws it.
 */
export function autonomyAllows(level, category) {
  const value = Number.isInteger(level) ? level : 2;
  if (value <= 0) return false;
  if (value === 1) return category === 'briefs';
  return true;
}

/** Minutes since midnight of "HH:MM". */
const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Local quiet hours, which may wrap midnight. */
export function inQuietHours(quietHours, now = new Date()) {
  if (!quietHours?.enabled) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const start = minutes(quietHours.start);
  const end = minutes(quietHours.end);
  if (start === end) return false;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

/**
 * @param {{ category: string }} item - Arriving item.
 * @param {{ level?: number | null, settings: object, now?: Date }} context - Autonomy level and the person's settings.
 * @returns {boolean} Whether a banner may show. Needs you passes quiet hours; everything else waits.
 */
export function bannerAllowed(item, { level, settings, now = new Date() }) {
  if (!autonomyAllows(level, item.category)) return false;
  if (settings?.categories?.[item.category] === false) return false;
  if (item.category !== 'needs_you' && inQuietHours(settings?.quietHours, now)) return false;
  return true;
}

/** Needs you banners stay until tapped or dismissed. */
export const isSticky = (item) => item.category === 'needs_you';

/**
 * One banner at a time. A burst from one employee in one category merges into the visible or queued banner (`count` rises).
 * Needs you replaces a visible non-sticky banner and goes ahead of queued ones.
 * @param {{ onChange: (banner: object | null) => void, setTimer?: Function, clearTimer?: Function, autoHideMs?: number }} options - Change callback and timer overrides.
 */
export function createBannerQueue({ onChange, setTimer = setTimeout, clearTimer = clearTimeout, autoHideMs = BANNER_AUTO_HIDE_MS }) {
  let current = null;
  let queue = [];
  let timer = null;
  const sameStream = (a, b) => a.category === b.category && (a.item.employee?.id || '') === (b.item.employee?.id || '');
  const arm = () => {
    clearTimer(timer); timer = null;
    if (current && !isSticky(current.item)) timer = setTimer(() => { current = null; next(); }, autoHideMs);
  };
  const next = () => { current = queue.shift() || null; arm(); onChange(current); };
  return {
    push(item) {
      const entry = { item, count: 1, ids: [item.id] };
      if (current && sameStream(current, entry)) { current = { item, count: current.count + 1, ids: [...current.ids, item.id] }; arm(); onChange(current); return; }
      const queued = queue.findIndex(waiting => sameStream(waiting, entry));
      if (queued >= 0) { const waiting = queue[queued]; queue[queued] = { item, count: waiting.count + 1, ids: [...waiting.ids, item.id] }; return; }
      if (!current) { current = entry; arm(); onChange(current); return; }
      if (isSticky(item) && !isSticky(current.item)) { queue.unshift(current); current = entry; arm(); onChange(current); return; }
      if (isSticky(item)) { const firstPlain = queue.findIndex(waiting => !isSticky(waiting.item)); queue.splice(firstPlain < 0 ? queue.length : firstPlain, 0, entry); return; }
      queue.push(entry);
    },
    dismiss() { clearTimer(timer); next(); },
    /** Drop a banner whose item was answered elsewhere. */
    remove(id) {
      queue = queue.filter(waiting => !waiting.ids.includes(id) || waiting.ids.length > 1);
      if (current?.ids.includes(id) && current.ids.length === 1) { clearTimer(timer); next(); }
    },
    clear() { clearTimer(timer); current = null; queue = []; onChange(null); },
    get current() { return current; },
    get pending() { return queue.length; },
  };
}
