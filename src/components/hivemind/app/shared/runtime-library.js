/** URL and label helpers for the per-tenant Runtime Library API. */
const LIBRARY_PATH = '/api/hivemind/artifacts';

/** Display name for a stored folder path such as `Workspaces/Launch`. */
export function folderLabel(folder) {
  if (!folder) return 'All files';
  const parts = String(folder).split('/').filter(Boolean);
  return parts.length > 1 ? `${parts[0]} · ${parts.slice(1).join('/')}` : parts[0];
}

/** Library list URL for one folder, search and page cursor. */
export function libraryUrl({ folder, query, cursor }) {
  const params = new URLSearchParams();
  if (folder) params.set('folder', folder);
  if (query) params.set('query', query);
  if (cursor) params.set('cursor', cursor);
  const search = params.toString();
  return search ? `${LIBRARY_PATH}?${search}` : LIBRARY_PATH;
}

/** Open or download URL for one saved artifact version. */
export function artifactUrl(item, download = false) {
  const params = new URLSearchParams({ version: String(item.latestVersion) });
  if (download) params.set('download', '1');
  return `${LIBRARY_PATH}/${encodeURIComponent(item.artifactId)}?${params}`;
}

/** Share link for one artifact on the authenticated HIVEMIND origin; the id stays inside the link. */
export function artifactShareUrl(item, origin = '') {
  return `${origin}${LIBRARY_PATH}/${encodeURIComponent(item.artifactId)}`;
}

/** Task reference shown beside an artifact; the task id itself is never displayed. */
export function taskLabel(item) {
  return item?.taskId ? 'Linked to a task' : null;
}
