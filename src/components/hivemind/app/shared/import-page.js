// A failed webpack download is retryable: webpack removes its failed script.
// Retry only the import, never the document or a company's setup actions.
export async function importPage(load) {
  try { return await load(); }
  catch (error) {
    if (!/ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module/i.test(`${error?.name} ${error?.message}`)) throw error;
    return load();
  }
}
