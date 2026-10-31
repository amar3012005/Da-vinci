import { createAgentRosterCache, ROSTER_KEPT_MS } from './agent-roster-cache';
test('reuses roster immediately across mounts and joins concurrent loads', async () => {
  let finish;
  const fetchProfiles = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  const cache = createAgentRosterCache(fetchProfiles);
  const first = cache.load('user:org'); const second = cache.load('user:org');
  await Promise.resolve();
  expect(fetchProfiles).toHaveBeenCalledTimes(1);
  finish([{ id: 'romeo' }]);
  await Promise.all([first, second]);
  expect(cache.peek('user:org')).toEqual([{ id: 'romeo' }]);
  await cache.load('user:org');
  expect(fetchProfiles).toHaveBeenCalledTimes(1);
});
test('keeps users and organizations separate and refreshes after expiry', async () => {
  let time = 1000;
  const fetchProfiles = jest.fn(async () => [{ id: String(time) }]);
  const cache = createAgentRosterCache(fetchProfiles, () => time);
  await cache.load('u1:org1');
  expect(cache.peek('u2:org1')).toBeUndefined();
  expect(cache.peek('u1:org2')).toBeUndefined();
  time += 30001;
  await cache.load('u1:org1');
  expect(fetchProfiles).toHaveBeenCalledTimes(2);
  await cache.load('u1:org1', { force: true });
  expect(fetchProfiles).toHaveBeenCalledTimes(3);
});
test('does not cache a failed request and permits recovery', async () => {
  const load = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  const cache = createAgentRosterCache(load);
  await expect(cache.load('user:org')).rejects.toThrow('offline');
  await expect(cache.load('user:org')).resolves.toEqual([]);
  expect(load).toHaveBeenCalledTimes(2);
});
test('paints only scoped minimal roster from browser cache then revalidates', async () => {
  const storage = new Map();
  const store = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
  const first = createAgentRosterCache(async () => [{ id: 'one', name: 'Feynmann', role_archetype: 'Researcher', persona: 'private', policy_rules: { open_dot_employee: { version: 1, dot_id: 'dot-one', state: 'bound' }, secret: 'private' } }], () => 1000, store);
  await first.load('user-a:org-a');
  const fetchProfiles = jest.fn(async () => [{ id: 'two', name: 'Current' }]);
  const second = createAgentRosterCache(fetchProfiles, () => 2000, store);
  expect(second.peek('user-a:org-a')).toMatchObject([{ id: 'one', name: 'Feynmann', role_archetype: 'Researcher', policy_rules: { open_dot_employee: { version: 1, dot_id: 'dot-one', state: 'bound' } } }]);
  expect(second.peek('user-b:org-a')).toBeUndefined();
  expect(JSON.stringify([...storage.values()])).not.toContain('private');
  await second.load('user-a:org-a');
  expect(fetchProfiles).toHaveBeenCalledTimes(1);
  expect(second.peek('user-a:org-a')[0].id).toBe('two');
  // Local-first: the last known team still paints after hours offline; it is dropped after a week.
  expect(createAgentRosterCache(fetchProfiles, () => 2000 + 6 * 3600_000, store).peek('user-a:org-a')[0].id).toBe('two');
  expect(createAgentRosterCache(fetchProfiles, () => 2000 + ROSTER_KEPT_MS + 1, store).peek('user-a:org-a')).toBeUndefined();
});
test('a ready event forces a new catalog read after an in-flight stale read', async () => {
  let finish;
  const fetchProfiles = jest.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue([{ id: 'new' }]);
  const cache = createAgentRosterCache(fetchProfiles);
  const first = cache.load('user:org');
  await Promise.resolve();
  const refreshed = cache.load('user:org', { force: true });
  finish([{ id: 'old' }]);
  await Promise.all([first, refreshed]);
  expect(fetchProfiles).toHaveBeenCalledTimes(2);
  expect(cache.peek('user:org')).toEqual([{ id: 'new' }]);
});

test('persists the saved look and profile revision, but still no persona or policy', async () => {
  const storage = new Map();
  const store = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
  const appearance = { version: 1, provider: 'humation', seed: 'momo' };
  const observe = jest.fn();
  const first = createAgentRosterCache(async () => [{ id: 'one', name: 'Momo', policy_rules: { appearance, native_lifecycle: { profile_revision: 4, secret: 'private' }, secret: 'private' } }], () => 1000, store, observe);
  await first.load('user-a:org-a');
  const raw = [...storage.values()].join('');
  expect(raw).not.toContain('private');
  expect(JSON.parse(raw).profiles[0].policy_rules).toEqual({ appearance, native_lifecycle: { profile_revision: 4 } });
  expect(observe).toHaveBeenCalledTimes(1);
  const second = createAgentRosterCache(jest.fn(), () => 1001, store, observe);
  expect(second.peek('user-a:org-a')[0].policy_rules.appearance).toEqual(appearance);
  expect(observe).toHaveBeenCalledTimes(2);
});
