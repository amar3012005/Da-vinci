import { createAgentRosterCache } from './agent-roster-cache';
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
