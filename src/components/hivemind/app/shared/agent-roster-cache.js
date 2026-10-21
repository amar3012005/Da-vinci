/** A bounded presentation hint. The authenticated catalog remains authoritative. */
export function createAgentRosterCache(fetchProfiles, now = Date.now, storage = null) {
  const entries = new Map();
  const cacheKey = scope => `hivemind.hyperagent.roster.v1:${scope}`;
  const read = scope => {
    if (!storage) return undefined;
    try {
      const saved = JSON.parse(storage.getItem(cacheKey(scope)) || 'null');
      if (saved?.version !== 1 || now() - saved.at > 10 * 60_000 || !Array.isArray(saved.profiles)) return undefined;
      return saved.profiles.length <= 32 && saved.profiles.every(row => typeof row.id === 'string' && typeof row.name === 'string') ? saved.profiles : undefined;
    } catch { return undefined; }
  };
  const write = (scope, profiles) => {
    if (!storage || !Array.isArray(profiles)) return;
    // Keep names/routes for instant paint. Never persist persona, tools or policy.
    const minimal = profiles.slice(0, 32).map(row => ({
      id: row.id, name: row.name, role_archetype: row.role_archetype,
      avatar_url: row.avatar_url, status: row.status,
      policy_rules: row.policy_rules?.open_dot_employee?.dot_id ? {
        open_dot_employee: { dot_id: row.policy_rules.open_dot_employee.dot_id, state: row.policy_rules.open_dot_employee.state },
      } : {},
    }));
    try { storage.setItem(cacheKey(scope), JSON.stringify({ version: 1, at: now(), profiles: minimal })); } catch { /* Optional browser cache. */ }
  };
  const entryFor = scope => {
    let entry = entries.get(scope);
    if (!entry) {
      entry = { profiles: read(scope), fetchedAt: 0, pending: null };
      entries.set(scope, entry);
      if (entries.size > 4) entries.delete(entries.keys().next().value);
    }
    return entry;
  };
  return {
    peek: scope => scope ? entryFor(scope).profiles : undefined,
    remember(scope, profiles) { if (scope) { const entry = entryFor(scope); entry.profiles = profiles; entry.fetchedAt = now(); write(scope, profiles); } },
    async load(scope, { force = false } = {}) {
      if (!scope) return [];
      const entry = entryFor(scope);
      if (entry.pending) {
        if (!force) return entry.pending;
        await entry.pending.catch(() => {});
      }
      if (!force && entry.profiles && entry.fetchedAt > 0 && now() - entry.fetchedAt < 30000) return entry.profiles;
      entry.pending = Promise.resolve().then(() => fetchProfiles(scope)).then(profiles => {
        entry.profiles = profiles;
        entry.fetchedAt = now();
        write(scope, profiles);
        return profiles;
      }).finally(() => { entry.pending = null; });
      return entry.pending;
    },
  };
}
