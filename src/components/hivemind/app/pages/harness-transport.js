/** Resolve authenticated Harness graph resources at the application origin root. */
export function normalizeHarnessInjections(rows, appOrigin, embeddedParentOrigin) {
  if (!Array.isArray(rows)) throw new Error('Harness returned an invalid boot graph.');
  const resolveUrl = (value) => {
    if (typeof value !== 'string') throw new Error('Harness returned an invalid module URL.');
    const resolved = new URL(value, `${appOrigin}/`);
    if (resolved.origin !== appOrigin) {
      throw new Error('Harness module URLs must remain on the authenticated application origin.');
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  };
  return rows.map((row) => {
    if (!row || typeof row !== 'object') throw new Error('Harness returned an invalid boot row.');
    if (row.kind === 'script-src' || row.kind === 'script-preload') {
      return { ...row, src: resolveUrl(row.src) };
    }
    if (embeddedParentOrigin !== undefined && row.kind === 'global' && row.name === '__HIVEMIND_EMBED_CONFIG__' && row.value?.version === 1) {
      // This pane establishes its own native session. Never send the legacy
      // ticket handshake to another configured parent or expand its allowlist.
      return { ...row, value: { ...row.value, parentOrigins: (row.value.parentOrigins || []).filter(origin => origin === embeddedParentOrigin) } };
    }
    if (row.kind === 'global' && row.name === '__DSH_BOOT__') {
      const graph = row.value;
      if (!graph || typeof graph !== 'object') throw new Error('Harness returned an invalid module graph.');
      return {
        ...row,
        value: {
          ...graph,
          entries: Array.isArray(graph.entries)
            ? graph.entries.map((entry) => ({ ...entry, url: resolveUrl(entry.url) }))
            : graph.entries,
          batches: Array.isArray(graph.batches)
            ? graph.batches.map((batch) => ({ ...batch, url: resolveUrl(batch.url) }))
            : graph.batches,
        },
      };
    }
    return row;
  });
}

/** Root document-relative RPC paths while keeping the shell's authorized fetch carrier. */
export function createRootHarnessFetch(appOrigin, fetchImpl) {
  return (input, init) => {
    let target;
    try {
      target = new URL(input instanceof URL ? input.href : input, `${appOrigin}/`);
      if (target.origin !== appOrigin) {
        throw new Error('Harness Remote requests must remain on the authenticated application origin.');
      }
    } catch (error) {
      return Promise.reject(error);
    }
    return fetchImpl(target, init);
  };
}

/** Keep a shell-provided authenticated carrier; only browser fetch needs URL rooting. */
export function selectHarnessFetch(appOrigin, shellFetch, browserFetch) {
  return typeof shellFetch === 'function' ? shellFetch : createRootHarnessFetch(appOrigin, browserFetch);
}
