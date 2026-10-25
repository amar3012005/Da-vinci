import { sessionUser } from './account-mode-access.mjs';

// dev.singulancelabs.com: the SINGULANCE developer community. Identity is the existing
// SINGULANCE account (the .singulancelabs.com session cookie, checked against Core); this module
// stores only community data: member profiles, forum threads and replies.
export const DEV_HOST = 'dev.singulancelabs.com';
export const CHANNELS = ['research', 'open-source', 'startups', 'show-and-tell', 'help'];
const ROLES = ['student', 'researcher', 'engineer', 'founder', 'other'];
const LIMITS = { post: [6, 600_000], reply: [30, 600_000] };
const headers = { 'cache-control': 'private, no-store', 'cdn-cache-control': 'no-store', 'x-robots-tag': 'noindex' };
const reply = (value, status = 200) => Response.json(value, { status, headers });

export class CommunityError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
const fail = (code, status) => { throw new CommunityError(code, status); };
const text = (value, min, max, code) => {
  const v = typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';
  if (v.length < min || v.length > max) fail(code);
  return v;
};
const optional = (value, max, code) => (value == null || value === '' ? '' : text(value, 0, max, code));

/** All community storage. `sql(query, ...params)` returns an array of row objects. */
export class CommunityStore {
  constructor(sql, { now = () => Date.now(), id = () => crypto.randomUUID() } = {}) {
    this.sql = sql; this.now = now; this.id = id;
    sql(`CREATE TABLE IF NOT EXISTS members (user_id TEXT PRIMARY KEY, email TEXT NOT NULL, handle TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL, role TEXT NOT NULL, affiliation TEXT NOT NULL, bio TEXT NOT NULL, interests TEXT NOT NULL,
      links TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
    sql(`CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, author_id TEXT NOT NULL, channel TEXT NOT NULL,
      title TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL, last_activity INTEGER NOT NULL,
      reply_count INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0)`);
    sql(`CREATE TABLE IF NOT EXISTS replies (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, author_id TEXT NOT NULL,
      body TEXT NOT NULL, created_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)`);
    sql(`CREATE TABLE IF NOT EXISTS actions (user_id TEXT NOT NULL, kind TEXT NOT NULL, at INTEGER NOT NULL)`);
    sql('CREATE INDEX IF NOT EXISTS posts_activity ON posts (deleted, last_activity)');
    sql('CREATE INDEX IF NOT EXISTS replies_post ON replies (post_id, created_at)');
    sql('CREATE INDEX IF NOT EXISTS actions_user ON actions (user_id, kind, at)');
  }

  publicMember(row) {
    if (!row) return null;
    return { handle: row.handle, name: row.name, role: row.role, affiliation: row.affiliation, bio: row.bio,
      interests: JSON.parse(row.interests), links: JSON.parse(row.links), joinedAt: row.created_at };
  }
  memberRow(userId) { return this.sql('SELECT * FROM members WHERE user_id = ?', userId)[0] || null; }
  requireMember(user) { return this.memberRow(user.id) || fail('profile_required', 403); }

  me(user) {
    const row = user && this.memberRow(user.id);
    return { signedIn: Boolean(user), email: user?.email || null, member: row ? this.publicMember(row) : null };
  }

  saveProfile(user, input = {}) {
    const handle = text(input.handle, 3, 24, 'invalid_handle').toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{2,23}$/.test(handle)) fail('invalid_handle');
    const role = ROLES.includes(input.role) ? input.role : fail('invalid_role');
    const interests = Array.isArray(input.interests) ? input.interests : [];
    if (interests.length > 8) fail('too_many_interests');
    const tags = [...new Set(interests.map(t => text(t, 1, 24, 'invalid_interest').toLowerCase()))];
    const links = Array.isArray(input.links) ? input.links : [];
    if (links.length > 3) fail('too_many_links');
    const urls = links.map(l => {
      const v = text(l, 8, 200, 'invalid_link');
      try { const u = new URL(v); if (u.protocol !== 'https:') throw 0; return u.toString(); } catch { return fail('invalid_link'); }
    });
    const row = { handle, name: text(input.name, 1, 60, 'invalid_name'), role,
      affiliation: optional(input.affiliation, 80, 'invalid_affiliation'), bio: optional(input.bio, 400, 'invalid_bio'),
      interests: JSON.stringify(tags), links: JSON.stringify(urls) };
    const taken = this.sql('SELECT user_id FROM members WHERE handle = ?', handle)[0];
    if (taken && taken.user_id !== user.id) fail('handle_taken', 409);
    const now = this.now();
    if (this.memberRow(user.id)) {
      this.sql(`UPDATE members SET email = ?, handle = ?, name = ?, role = ?, affiliation = ?, bio = ?, interests = ?, links = ?, updated_at = ?
        WHERE user_id = ?`, user.email, row.handle, row.name, row.role, row.affiliation, row.bio, row.interests, row.links, now, user.id);
    } else {
      this.sql(`INSERT INTO members (user_id, email, handle, name, role, affiliation, bio, interests, links, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, user.id, user.email, row.handle, row.name, row.role, row.affiliation, row.bio, row.interests, row.links, now, now);
    }
    return this.me(user);
  }

  member(handle) {
    const row = this.sql('SELECT * FROM members WHERE handle = ?', String(handle || '').toLowerCase())[0] || fail('not_found', 404);
    const posts = this.sql(`SELECT p.*, m.handle, m.name FROM posts p JOIN members m ON m.user_id = p.author_id
      WHERE p.author_id = ? AND p.deleted = 0 ORDER BY p.created_at DESC LIMIT 20`, row.user_id).map(p => this.postSummary(p));
    return { member: this.publicMember(row), posts };
  }

  members(limit = 24) {
    return this.sql('SELECT * FROM members ORDER BY created_at DESC LIMIT ?', Math.min(Math.max(Number(limit) || 24, 1), 60)).map(r => this.publicMember(r));
  }

  stats() {
    const count = q => this.sql(q)[0]?.n || 0;
    return { members: count('SELECT COUNT(*) AS n FROM members'), threads: count('SELECT COUNT(*) AS n FROM posts WHERE deleted = 0'),
      replies: count('SELECT COUNT(*) AS n FROM replies WHERE deleted = 0'),
      affiliations: count("SELECT COUNT(DISTINCT lower(affiliation)) AS n FROM members WHERE affiliation != ''") };
  }

  postSummary(p) {
    return { id: p.id, channel: p.channel, title: p.title, excerpt: p.body.slice(0, 220), createdAt: p.created_at,
      lastActivity: p.last_activity, replyCount: p.reply_count, author: { handle: p.handle, name: p.name } };
  }

  posts({ channel, before } = {}) {
    const params = [];
    let where = 'p.deleted = 0';
    if (channel) { if (!CHANNELS.includes(channel)) fail('invalid_channel'); where += ' AND p.channel = ?'; params.push(channel); }
    if (before) { where += ' AND p.last_activity < ?'; params.push(Number(before)); }
    const rows = this.sql(`SELECT p.*, m.handle, m.name FROM posts p JOIN members m ON m.user_id = p.author_id
      WHERE ${where} ORDER BY p.last_activity DESC LIMIT 30`, ...params);
    return { posts: rows.map(p => this.postSummary(p)), next: rows.length === 30 ? rows[rows.length - 1].last_activity : null };
  }

  post(id, user) {
    const p = this.sql(`SELECT p.*, m.handle, m.name FROM posts p JOIN members m ON m.user_id = p.author_id
      WHERE p.id = ? AND p.deleted = 0`, String(id))[0] || fail('not_found', 404);
    const replies = this.sql(`SELECT r.*, m.handle, m.name FROM replies r JOIN members m ON m.user_id = r.author_id
      WHERE r.post_id = ? AND r.deleted = 0 ORDER BY r.created_at ASC LIMIT 500`, p.id)
      .map(r => ({ id: r.id, body: r.body, createdAt: r.created_at, author: { handle: r.handle, name: r.name }, mine: user?.id === r.author_id }));
    return { post: { ...this.postSummary(p), body: p.body, mine: user?.id === p.author_id }, replies };
  }

  throttle(user, kind) {
    const [max, window] = LIMITS[kind];
    const since = this.now() - window;
    this.sql('DELETE FROM actions WHERE at < ?', this.now() - 86_400_000);
    if ((this.sql('SELECT COUNT(*) AS n FROM actions WHERE user_id = ? AND kind = ? AND at >= ?', user.id, kind, since)[0]?.n || 0) >= max) fail('slow_down', 429);
    this.sql('INSERT INTO actions (user_id, kind, at) VALUES (?, ?, ?)', user.id, kind, this.now());
  }

  createPost(user, input = {}) {
    this.requireMember(user);
    const channel = CHANNELS.includes(input.channel) ? input.channel : fail('invalid_channel');
    const title = text(input.title, 4, 140, 'invalid_title');
    const body = text(input.body, 1, 8000, 'invalid_body');
    this.throttle(user, 'post');
    const id = this.id(); const now = this.now();
    this.sql('INSERT INTO posts (id, author_id, channel, title, body, created_at, last_activity) VALUES (?, ?, ?, ?, ?, ?, ?)', id, user.id, channel, title, body, now, now);
    return this.post(id, user);
  }

  createReply(user, postId, input = {}) {
    this.requireMember(user);
    const p = this.sql('SELECT id FROM posts WHERE id = ? AND deleted = 0', String(postId))[0] || fail('not_found', 404);
    const body = text(input.body, 1, 4000, 'invalid_body');
    this.throttle(user, 'reply');
    const now = this.now();
    this.sql('INSERT INTO replies (id, post_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)', this.id(), p.id, user.id, body, now);
    this.sql('UPDATE posts SET reply_count = reply_count + 1, last_activity = ? WHERE id = ?', now, p.id);
    return this.post(p.id, user);
  }

  remove(user, kind, id, admin = false) {
    const table = kind === 'reply' ? 'replies' : 'posts';
    const row = this.sql(`SELECT * FROM ${table} WHERE id = ? AND deleted = 0`, String(id))[0] || fail('not_found', 404);
    if (row.author_id !== user.id && !admin) fail('forbidden', 403);
    this.sql(`UPDATE ${table} SET deleted = 1 WHERE id = ?`, row.id);
    if (table === 'replies') this.sql('UPDATE posts SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?', row.post_id);
    return { deleted: true };
  }
}

/** One strongly consistent community; volume is far below a single Durable Object's limits. */
export class DevCommunity {
  constructor(ctx) {
    this.store = new CommunityStore((query, ...params) => ctx.storage.sql.exec(query, ...params).toArray());
  }
  async call(op, args = []) {
    try { return { ok: true, value: this.store[op](...args) }; }
    catch (error) {
      if (error instanceof CommunityError) return { ok: false, code: error.code, status: error.status };
      throw error;
    }
  }
}

const OPS = new Set(['me', 'saveProfile', 'member', 'members', 'stats', 'posts', 'post', 'createPost', 'createReply', 'remove']);
async function call(env, op, args) {
  if (!OPS.has(op) || !env.DEV_COMMUNITY) throw new CommunityError('community_unavailable', 503);
  const result = await env.DEV_COMMUNITY.get(env.DEV_COMMUNITY.idFromName('global')).call(op, args);
  if (!result.ok) throw new CommunityError(result.code, result.status);
  return result.value;
}

const SPA_PATHS = /^\/(?:|join|profile|forum(?:\/[A-Za-z0-9-]+)?|u\/[a-z0-9-]+|tools)\/?$/;

export async function devCommunity(request, env, { lookupUser = sessionUser } = {}) {
  const url = new URL(request.url);
  if (url.hostname !== DEV_HOST) return null;
  if (url.protocol !== 'https:' && env.ENVIRONMENT !== 'development') { url.protocol = 'https:'; return Response.redirect(url.href, 308); }
  if (url.pathname.startsWith('/api/dev/')) return api(request, env, url, lookupUser);
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' } });
  if (['/privacy', '/cookies', '/security'].includes(url.pathname)) return Response.redirect(`https://singulancelabs.com${url.pathname}`, 308);
  if (/^\/hivemind(?:\/|$)/.test(url.pathname)) return Response.redirect(`https://next.singulancelabs.com${url.pathname}${url.search}`, 302);
  if (url.pathname.startsWith('/research')) return Response.redirect(`https://singulancelabs.com${url.pathname}${url.search}`, 308);
  if (url.pathname === '/robots.txt') return new Response(request.method === 'HEAD' ? null : 'User-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=no\nAllow: /\nDisallow: /api/\n', { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' } });
  if (SPA_PATHS.test(url.pathname)) {
    const assetRequest = new Request(new URL('/', url), request);
    assetRequest.headers.delete('if-none-match'); assetRequest.headers.delete('if-modified-since');
    const response = await env.ASSETS.fetch(assetRequest);
    const out = new Headers(response.headers);
    out.set('cache-control', 'public, max-age=0, must-revalidate');
    return new Response(response.body, { status: 200, headers: out });
  }
  if (/^\/(?:static|assets|agent-setup)\//.test(url.pathname) || ['/favicon.ico', '/favicon.svg', '/logo.svg', '/singulance-mark.svg', '/singulance-mark-192.png', '/singulance-mark-512.png', '/manifest.json', '/manifest.webmanifest'].includes(url.pathname)) {
    const response = await env.ASSETS.fetch(request);
    if (!/text\/html/i.test(response.headers.get('content-type') || '')) return response;
  }
  return new Response(request.method === 'HEAD' ? null : 'Not found', { status: 404, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'content-type': 'text/plain; charset=utf-8' } });
}

function admins(env) {
  return new Set(String(env.DEV_COMMUNITY_ADMINS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean));
}

async function api(request, env, url, lookupUser) {
  const path = url.pathname.slice('/api/dev'.length);
  const write = !['GET', 'HEAD'].includes(request.method);
  try {
    if (write) {
      if (request.headers.get('origin') !== `https://${DEV_HOST}` || request.headers.get('sec-fetch-site') === 'cross-site') return reply({ error: 'origin_denied' }, 403);
      if (request.method !== 'DELETE' && !request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'json_required' }, 415);
    }
    let user = null;
    try { user = await lookupUser(request); } catch { if (write || path === '/me') return reply({ error: 'identity_unavailable' }, 503); }
    if (write && !user) return reply({ error: 'authentication_required' }, 401);
    const body = async () => {
      if (request.method === 'DELETE') return {};
      const raw = await request.text();
      if (raw.length > 20000) throw new CommunityError('request_too_large', 413);
      try { return JSON.parse(raw || '{}'); } catch { throw new CommunityError('invalid_json'); }
    };
    let m;
    if (path === '/me' && request.method === 'GET') return reply(await call(env, 'me', [user]));
    if (path === '/me' && request.method === 'PUT') return reply(await call(env, 'saveProfile', [user, await body()]));
    if (path === '/stats' && request.method === 'GET') return reply(await call(env, 'stats', []));
    if (path === '/members' && request.method === 'GET') return reply({ members: await call(env, 'members', [url.searchParams.get('limit')]) });
    if ((m = path.match(/^\/members\/([a-z0-9-]{3,24})$/)) && request.method === 'GET') return reply(await call(env, 'member', [m[1]]));
    if (path === '/posts' && request.method === 'GET') return reply(await call(env, 'posts', [{ channel: url.searchParams.get('channel') || '', before: url.searchParams.get('before') || '' }]));
    if (path === '/posts' && request.method === 'POST') return reply(await call(env, 'createPost', [user, await body()]), 201);
    if ((m = path.match(/^\/posts\/([0-9a-f-]{36})$/))) {
      if (request.method === 'GET') return reply(await call(env, 'post', [m[1], user]));
      if (request.method === 'DELETE') return reply(await call(env, 'remove', [user, 'post', m[1], admins(env).has(String(user.email).toLowerCase())]));
    }
    if ((m = path.match(/^\/posts\/([0-9a-f-]{36})\/replies$/)) && request.method === 'POST') return reply(await call(env, 'createReply', [user, m[1], await body()]), 201);
    if ((m = path.match(/^\/replies\/([0-9a-f-]{36})$/)) && request.method === 'DELETE') return reply(await call(env, 'remove', [user, 'reply', m[1], admins(env).has(String(user.email).toLowerCase())]));
    return reply({ error: 'not_found' }, 404);
  } catch (error) {
    if (error instanceof CommunityError) return reply({ error: error.code }, error.status);
    return reply({ error: 'community_unavailable' }, 503);
  }
}
