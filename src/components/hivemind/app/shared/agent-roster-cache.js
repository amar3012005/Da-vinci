/** Document-local, authenticated-scope roster cache; never persisted across sign-in. */
export function createAgentRosterCache(fetchProfiles, now = Date.now) {
  const entries = new Map();
  const entryFor = scope => {
    let entry = entries.get(scope);
    if (!entry) {
      entry = { profiles: undefined, fetchedAt: 0, pending: null };
      entries.set(scope, entry);
      if (entries.size > 4) entries.delete(entries.keys().next().value);
    }
    return entry;
  };
  return {
    peek: scope => scope ? entries.get(scope)?.profiles : undefined,
    remember(scope, profiles) { if (scope) entryFor(scope).profiles = profiles; },
    async load(scope, { force = false } = {}) {
      if (!scope) return [];
      const entry = entryFor(scope);
      if (entry.pending) return entry.pending;
      if (!force && entry.profiles && now() - entry.fetchedAt < 30000) return entry.profiles;
      entry.pending = Promise.resolve().then(fetchProfiles).then(profiles => {
        entry.profiles = profiles;
        entry.fetchedAt = now();
        return profiles;
      }).finally(() => { entry.pending = null; });
      return entry.pending;
    },
  };
}
