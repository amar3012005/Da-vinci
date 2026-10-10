import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Exercise the actual polling callbacks, with API/storage/UI boundaries stubbed.
const source = readFileSync(new URL('./WorkspaceNotifications.jsx', import.meta.url), 'utf8');
function polling() {
  const state = { rows: [], toasts: [], announcements: [], announcementRequests: 0, seen: new Set() };
  const context = vm.createContext({
    window: { localStorage: { getItem: key => state.seen.has(key) ? 'seen' : null } },
    noticeSeenKey: notice => notice.id,
    useCallback: callback => callback,
    initialized: { current: false }, knownIds: { current: new Set() }, announcementId: { current: null },
    setItems: rows => { state.items = rows; }, setUnread: count => { state.unread = count; },
    setToast: toast => state.toasts.push(toast), setAnnouncement: item => state.announcements.push(item),
    apiClient: {
      listWorkspaceNotifications: async () => ({ items: state.rows, unread: state.rows.length }),
      nextWorkspaceAnnouncement: async () => { state.announcementRequests++; return { announcement: null }; },
    },
  });
  const start = source.indexOf('  const unseenLifecycle = useCallback(');
  const end = source.indexOf('\n  useEffect(', start);
  assert.ok(start > 0 && end > start, 'notification polling callbacks exist');
  vm.runInContext(`${source.slice(start, end)}\nglobalThis.poll = load;`, context);
  return { state, poll: () => context.poll() };
}
const attention = (id, action) => ({ id, type: 'runtime.attention', data: { action, inboxPersisted: true } });
const lifecycle = { id: 'email-one', type: 'lifecycle.email.sent' };

test('notify and wake receipts never open or queue automatic popups across polls', async () => {
  const { state, poll } = polling();
  state.rows = [attention('notify-one', 'notify')];
  await poll();
  state.rows.unshift(attention('wake-one', 'wake'));
  await poll();
  await poll();
  assert.deepEqual(state.toasts, []);
  assert.equal(state.items.length, 2);
  assert.equal(state.unread, 2);
  assert.equal(state.announcementRequests, 3);
});
test('fresh entry still surfaces an unread lifecycle email alongside Runtime receipts', async () => {
  const { state, poll } = polling();
  state.rows = [attention('wake-one', 'wake'), lifecycle];
  await poll();
  assert.deepEqual(state.toasts, [lifecycle]);
});
test('new lifecycle email still surfaces during polling', async () => {
  const { state, poll } = polling();
  await poll();
  state.rows = [lifecycle];
  await poll();
  assert.deepEqual(state.toasts, [lifecycle]);
});
test('seen or read lifecycle emails stay suppressed on entry', async () => {
  const { state, poll } = polling();
  state.seen.add(lifecycle.id);
  state.rows = [attention('notify-one', 'notify'), lifecycle, { ...lifecycle, id: 'read-email', readAt: '2026-10-10' }];
  await poll();
  assert.deepEqual(state.toasts, []);
});
