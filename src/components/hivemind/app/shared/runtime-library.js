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

/** Type filters offered by the Library toolbar, in display order. */
export const LIBRARY_KINDS = [
  { id: 'all', label: 'All types' },
  { id: 'document', label: 'Documents' },
  { id: 'sheet', label: 'Sheets' },
  { id: 'image', label: 'Images' },
  { id: 'web', label: 'Pages & code' },
  { id: 'other', label: 'Other' },
];

/** Library type group for one media type; `title` resolves generic binary types by extension. */
export function mediaKind(mediaType, title = '') {
  const type = String(mediaType || '').toLowerCase();
  const extension = String(title || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
  if (type.startsWith('image/')) return 'image';
  if (type.includes('spreadsheet') || type.includes('excel') || type === 'text/csv' || ['csv', 'xlsx', 'xls'].includes(extension)) return 'sheet';
  if (type.includes('html') || type.includes('json') || type.includes('javascript') || type.includes('xml') || ['html', 'json', 'js', 'ts', 'xml'].includes(extension)) return 'web';
  if (type === 'application/pdf' || type.startsWith('text/') || type.includes('word') || type.includes('document') || type.includes('presentation') || ['pdf', 'md', 'txt', 'docx', 'pptx'].includes(extension)) return 'document';
  return 'other';
}

/** Short badge text for one media type, such as `PDF` or `PNG`. */
export function mediaBadge(mediaType, title = '') {
  const extension = String(title || '').match(/\.([A-Za-z0-9]{1,5})$/)?.[1];
  if (extension) return extension.toUpperCase();
  const subtype = String(mediaType || '').split('/')[1] || '';
  const cleaned = subtype.split(';')[0].split('+')[0].split(/[.-]/).filter(Boolean).pop() || '';
  if (cleaned === 'markdown') return 'MD';
  if (cleaned === 'plain') return 'TXT';
  if (cleaned === 'sheet') return 'XLSX';
  return cleaned ? cleaned.slice(0, 5).toUpperCase() : 'FILE';
}

/**
 * Items shown for the active type filter and local title filter.
 * @param {Array<object>} items - loaded artifact summaries.
 * @param {{ kind?: string, text?: string }} filter - type group and case-insensitive title text.
 * @returns {Array<object>} matching items in their original order.
 */
export function filterLibraryItems(items, { kind = 'all', text = '' } = {}) {
  const needle = String(text || '').trim().toLowerCase();
  return (items || []).filter(item => (kind === 'all' || mediaKind(item.mediaType, item.title) === kind)
    && (!needle || String(item.title || '').toLowerCase().includes(needle)));
}

/**
 * Append one listing page, keeping one row per artifact at its newest version.
 * @param {Array<object> | null} previous - rows already shown, or null for a first page.
 * @param {Array<object>} page - rows of the page that arrived.
 * @returns {Array<object>} merged rows, newest first as the server ordered them.
 */
export function mergeLibraryPage(previous, page) {
  const rows = [...(previous || []), ...(page || [])];
  const newest = new Map();
  for (const row of rows) {
    const current = newest.get(row.artifactId);
    if (!current || Number(row.latestVersion) > Number(current.latestVersion)) newest.set(row.artifactId, row);
  }
  const seen = new Set();
  return rows.filter(row => {
    if (seen.has(row.artifactId) || newest.get(row.artifactId) !== row) return false;
    seen.add(row.artifactId);
    return true;
  });
}

/**
 * Folder navigation grouped by top-level name, e.g. `Research/Market` under `Research`.
 * A group's count includes its subfolders because a folder listing includes them too.
 * @param {Array<{ folder: string, count: number, updatedAt?: number }>} folders - server folders.
 * @returns {Array<{ folder: string, label: string, count: number, children: Array<{ folder: string, label: string, count: number }> }>} groups sorted by name.
 */
export function folderTree(folders) {
  const groups = new Map();
  for (const entry of folders || []) {
    const parts = String(entry?.folder || '').split('/').filter(Boolean);
    if (!parts.length) continue;
    const root = parts[0];
    const group = groups.get(root) || { folder: root, label: root, count: 0, children: [] };
    group.count += Number(entry.count) || 0;
    if (parts.length > 1) group.children.push({ folder: parts.join('/'), label: parts.slice(1).join(' / '), count: Number(entry.count) || 0 });
    groups.set(root, group);
  }
  return [...groups.values()]
    .map(group => ({ ...group, children: group.children.sort((a, b) => a.label.localeCompare(b.label)) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Compact date for a row or card: time today, `Yesterday`, weekday within a week, else day and month.
 * @param {number | string} value - epoch milliseconds or an ISO date.
 * @param {number} [now] - reference epoch milliseconds.
 * @param {string} [locale] - formatting locale.
 * @returns {string} display text, empty for an invalid date.
 */
export function formatShortDate(value, now = Date.now(), locale = undefined) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const startOfDay = time => { const day = new Date(time); day.setHours(0, 0, 0, 0); return day.getTime(); };
  const days = Math.round((startOfDay(now) - startOfDay(date.getTime())) / 86400000);
  if (days === 0) return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return date.toLocaleDateString(locale, { weekday: 'long' });
  const sameYear = new Date(now).getFullYear() === date.getFullYear();
  return date.toLocaleDateString(locale, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Thrown for a 404 listing: the Library route is not served for this workspace. */
export class LibraryUnavailableError extends Error {
  constructor() { super('library_unavailable'); this.name = 'LibraryUnavailableError'; }
}

/**
 * Read one listing page.
 * @param {string} url - a `libraryUrl` result.
 * @param {{ signal?: AbortSignal, fetcher?: typeof fetch }} [options] - cancellation and transport.
 * @returns {Promise<{ folders?: Array<object>, items: Array<object>, next?: string }>} the page.
 * @throws {LibraryUnavailableError} when the route answers 404.
 */
export async function fetchLibraryPage(url, { signal, fetcher = (...args) => fetch(...args) } = {}) {
  const response = await fetcher(url, { credentials: 'include', cache: 'no-store', signal });
  if (response.status === 404) throw new LibraryUnavailableError();
  if (!response.ok) throw new Error('library_failed');
  return response.json();
}

/**
 * Read a first page for the shared page cache: a 404 settles as
 * `{ unavailable: true, items: [] }` so a missing route is not re-requested on every view.
 * @param {string} url - a `libraryUrl` result without a cursor.
 * @returns {Promise<{ unavailable?: true, folders?: Array<object>, items: Array<object>, next?: string }>} the page.
 */
export function readLibraryFirstPage(url) {
  return fetchLibraryPage(url).catch(error => (error instanceof LibraryUnavailableError ? { unavailable: true, items: [] } : Promise.reject(error)));
}

/** Typed confirmation word the delete API requires and the all-files dialog asks the admin to type. */
export const LIBRARY_DELETE_CONFIRM = 'DELETE';
/** Ids per delete request; equals the Runtime route's default `maxDeleteIds`. */
export const LIBRARY_DELETE_BATCH = 200;

/**
 * Whether the signed-in member may delete Library files: an owner or admin of the organization.
 * The Runtime route decides again from its own membership data; this only decides what to show.
 * @param {{ org?: { role?: string } | null, user?: { orgRole?: string, role?: string } | null }} account - bootstrap account.
 * @returns {boolean} true for an owner or admin.
 */
export function canDeleteLibrary({ org, user } = {}) {
  const role = org?.role || user?.orgRole || user?.role;
  return role === 'owner' || role === 'admin';
}

/** Thrown when a deletion request is refused or fails; `code` is the API error code when one came back. */
export class LibraryDeleteError extends Error {
  constructor(status, code) {
    super(code || `library_delete_${status}`);
    this.name = 'LibraryDeleteError';
    this.status = status;
    this.code = code || '';
  }
}

async function postDelete(body, fetcher) {
  const response = await fetcher(`${LIBRARY_PATH}/delete`, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, confirm: LIBRARY_DELETE_CONFIRM }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new LibraryDeleteError(response.status, payload?.error);
  return payload?.deleted || {};
}

/**
 * Permanently delete artifacts through the Runtime API.
 * @param {{ ids: string[] } | { all: true, folder?: string }} selection - artifact ids, or every artifact (optionally one folder).
 * @param {{ fetcher?: typeof fetch }} [options] - transport.
 * @returns {Promise<{ artifacts: number, versions: number, blobsFailed: number }>} counts summed over all requests.
 * @throws {LibraryDeleteError} on the first refused or failed request; earlier batches stay deleted.
 */
export async function deleteLibraryArtifacts(selection, { fetcher = (...args) => fetch(...args) } = {}) {
  const total = { artifacts: 0, versions: 0, blobsFailed: 0 };
  const add = deleted => {
    total.artifacts += Number(deleted.artifacts) || 0;
    total.versions += Number(deleted.versions) || 0;
    total.blobsFailed += Number(deleted.blobsFailed) || 0;
  };
  if (selection.all) {
    add(await postDelete({ all: true, ...(selection.folder ? { folder: selection.folder } : {}) }, fetcher));
    return total;
  }
  for (let start = 0; start < selection.ids.length; start += LIBRARY_DELETE_BATCH) {
    add(await postDelete({ ids: selection.ids.slice(start, start + LIBRARY_DELETE_BATCH) }, fetcher));
  }
  return total;
}
