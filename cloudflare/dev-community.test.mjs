import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { CommunityStore, CommunityError, DevCommunity, devCommunity } from './dev-community.mjs';

let clock = 1_000_000;
let seq = 0;
const newStore = () => {
  const db = new DatabaseSync(':memory:');
  const sql = (query, ...params) => {
    const statement = db.prepare(query);
    return /^\s*(SELECT|WITH)/i.test(query) ? statement.all(...params) : (statement.run(...params), []);
  };
  return new CommunityStore(sql, { now: () => clock, id: () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}` });
};
const ada = { id: 'u-ada', email: 'ada@uni.example' };
const lin = { id: 'u-lin', email: 'lin@lab.example' };
const profile = (handle, extra = {}) => ({ handle, name: 'Ada', role: 'student', affiliation: 'TU Hannover', interests: ['Memory', 'agents'], ...extra });
const code = (fn) => { try { fn(); } catch (e) { assert.ok(e instanceof CommunityError); return e.code; } return null; };

test('a signed-in account registers a profile once and keeps its handle unique', () => {
  const store = newStore();
  assert.deepEqual(store.me(null), { signedIn: false, email: null, member: null });
  assert.equal(store.me(ada).member, null);
  const me = store.saveProfile(ada, profile('ada-l'));
  assert.equal(me.member.handle, 'ada-l');
  assert.deepEqual(me.member.interests, ['memory', 'agents']);
  assert.equal(code(() => store.saveProfile(lin, profile('ada-l'))), 'handle_taken');
  assert.equal(code(() => store.saveProfile(lin, profile('A'))), 'invalid_handle');
  assert.equal(code(() => store.saveProfile(lin, profile('lin-w', { links: ['javascript:alert(1)'] }))), 'invalid_link');
  store.saveProfile(ada, profile('ada-l', { bio: 'Updated' }));
  assert.equal(store.member('ada-l').member.bio, 'Updated');
  assert.equal(store.stats().members, 1);
  assert.equal('email' in store.member('ada-l').member, false);
});

test('only members post; threads, replies and activity order work', () => {
  const store = newStore();
  assert.equal(code(() => store.createPost(ada, { channel: 'research', title: 'Hello world', body: 'x' })), 'profile_required');
  store.saveProfile(ada, profile('ada-l'));
  store.saveProfile(lin, profile('lin-w', { name: 'Lin' }));
  const first = store.createPost(ada, { channel: 'research', title: 'Reading group on .amr', body: 'Who is in?' }).post;
  clock += 10;
  const second = store.createPost(lin, { channel: 'startups', title: 'Looking for a cofounder', body: 'Agents + health' }).post;
  assert.deepEqual(store.posts().posts.map(p => p.id), [second.id, first.id]);
  clock += 10;
  const thread = store.createReply(lin, first.id, { body: 'Count me in' });
  assert.equal(thread.replies.length, 1);
  assert.equal(thread.post.replyCount, 1);
  assert.deepEqual(store.posts().posts.map(p => p.id), [first.id, second.id]);
  assert.deepEqual(store.posts({ channel: 'startups' }).posts.map(p => p.id), [second.id]);
  assert.equal(code(() => store.posts({ channel: 'nope' })), 'invalid_channel');
  assert.equal(code(() => store.createPost(ada, { channel: 'research', title: 'no', body: 'x' })), 'invalid_title');
});

test('authors or admins delete, and posting is rate limited', () => {
  const store = newStore();
  store.saveProfile(ada, profile('ada-l'));
  store.saveProfile(lin, profile('lin-w'));
  const post = store.createPost(ada, { channel: 'help', title: 'Install fails', body: 'On Windows' }).post;
  assert.equal(code(() => store.remove(lin, 'post', post.id)), 'forbidden');
  assert.deepEqual(store.remove(lin, 'post', post.id, true), { deleted: true });
  assert.equal(code(() => store.post(post.id)), 'not_found');
  for (let i = 0; i < 5; i++) store.createPost(ada, { channel: 'help', title: `Question ${i}`, body: 'b' });
  assert.equal(code(() => store.createPost(ada, { channel: 'help', title: 'One more', body: 'b' })), 'slow_down');
  clock += 600_001;
  assert.ok(store.createPost(ada, { channel: 'help', title: 'Later', body: 'b' }).post.id);
});

const fakeEnv = () => {
  const store = newStore();
  const object = Object.create(DevCommunity.prototype);
  object.store = store;
  return { ENVIRONMENT: 'production', DEV_COMMUNITY_ADMINS: 'admin@singulancelabs.com',
    DEV_COMMUNITY: { idFromName: () => 'global', get: () => object },
    ASSETS: { fetch: async () => new Response('<div id="root"></div>', { headers: { 'content-type': 'text/html' } }) } };
};
const req = (path, init = {}) => new Request(`https://dev.singulancelabs.com${path}`, init);
const json = (method, body) => ({ method, headers: { origin: 'https://dev.singulancelabs.com', 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('the dev host serves the app, ignores other hosts and guards writes', async () => {
  const env = fakeEnv();
  const signedOut = { lookupUser: async () => null };
  const signedIn = { lookupUser: async () => ada };
  assert.equal(await devCommunity(new Request('https://singulancelabs.com/'), env, signedOut), null);
  for (const path of ['/', '/join', '/forum', '/forum/research', '/u/ada-l', '/profile', '/tools']) {
    const page = await devCommunity(req(path), env, signedOut);
    assert.equal(page.status, 200, path);
    assert.match(await page.text(), /root/);
  }
  assert.equal((await devCommunity(req('/wp-admin'), env, signedOut)).status, 404);
  assert.equal((await devCommunity(req('/hivemind/login'), env, signedOut)).headers.get('location'), 'https://next.singulancelabs.com/hivemind/login');
  assert.deepEqual(await (await devCommunity(req('/api/dev/me'), env, signedOut)).json(), { signedIn: false, email: null, member: null });
  assert.equal((await devCommunity(req('/api/dev/me', json('PUT', profile('ada-l'))), env, signedOut)).status, 401);
  assert.equal((await devCommunity(req('/api/dev/me', { ...json('PUT', profile('ada-l')), headers: { origin: 'https://evil.example', 'content-type': 'application/json' } }), env, signedIn)).status, 403);
  const saved = await devCommunity(req('/api/dev/me', json('PUT', profile('ada-l'))), env, signedIn);
  assert.equal((await saved.json()).member.handle, 'ada-l');
  const created = await devCommunity(req('/api/dev/posts', json('POST', { channel: 'research', title: 'First thread', body: 'Hello' })), env, signedIn);
  assert.equal(created.status, 201);
  const { post } = await created.json();
  assert.equal((await (await devCommunity(req(`/api/dev/posts/${post.id}`), env, signedOut)).json()).post.title, 'First thread');
  assert.equal((await (await devCommunity(req('/api/dev/stats'), env, signedOut)).json()).threads, 1);
  const outage = await devCommunity(req('/api/dev/me'), env, { lookupUser: async () => { throw new Error('down'); } });
  assert.equal(outage.status, 503);
});
