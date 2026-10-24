import assert from 'node:assert/strict';
import test from 'node:test';
import { artifactUrl, folderLabel, libraryUrl } from '../src/components/hivemind/app/shared/runtime-library.js';

test('labels folders by name, never by id', () => {
  assert.equal(folderLabel(''), 'All files');
  assert.equal(folderLabel('Reports'), 'Reports');
  assert.equal(folderLabel('Workspaces/Launch'), 'Workspaces · Launch');
});

test('builds list and artifact URLs on the library API', () => {
  assert.equal(libraryUrl({}), '/api/hivemind/artifacts');
  assert.equal(libraryUrl({ folder: 'Reports', query: 'plan', cursor: 'c2' }), '/api/hivemind/artifacts?folder=Reports&query=plan&cursor=c2');
  assert.equal(artifactUrl({ artifactId: 'a/1', latestVersion: 3 }), '/api/hivemind/artifacts/a%2F1?version=3');
  assert.equal(artifactUrl({ artifactId: 'a1', latestVersion: 2 }, true), '/api/hivemind/artifacts/a1?version=2&download=1');
});

test('builds a share link on the HIVEMIND origin and never shows a task id', async () => {
  const { artifactShareUrl, taskLabel } = await import('../src/components/hivemind/app/shared/runtime-library.js');
  assert.equal(artifactShareUrl({ artifactId: 'art_1' }, 'https://runtime-runner.singulancelabs.com'), 'https://runtime-runner.singulancelabs.com/api/hivemind/artifacts/art_1');
  assert.equal(taskLabel({ taskId: 'task-9' }), 'Linked to a task');
  assert.equal(taskLabel({}), null);
});

test('groups media types for the toolbar filter and badges', async () => {
  const { mediaKind, mediaBadge } = await import('../src/components/hivemind/app/shared/runtime-library.js');
  assert.equal(mediaKind('image/png'), 'image');
  assert.equal(mediaKind('text/csv'), 'sheet');
  assert.equal(mediaKind('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'sheet');
  assert.equal(mediaKind('text/html'), 'web');
  assert.equal(mediaKind('application/pdf'), 'document');
  assert.equal(mediaKind('text/markdown'), 'document');
  assert.equal(mediaKind('application/octet-stream', 'Plan.docx'), 'document');
  assert.equal(mediaKind('application/zip'), 'other');
  assert.equal(mediaBadge('application/pdf', 'Board update.pdf'), 'PDF');
  assert.equal(mediaBadge('text/markdown', 'Weekly report'), 'MD');
  assert.equal(mediaBadge('', 'Untitled'), 'FILE');
  assert.equal(mediaBadge('image/svg+xml', 'Hero visual'), 'SVG');
  assert.equal(mediaBadge('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Plan'), 'XLSX');
});

test('filters loaded rows by type and title text without reordering', async () => {
  const { filterLibraryItems } = await import('../src/components/hivemind/app/shared/runtime-library.js');
  const items = [
    { artifactId: 'a', title: 'Launch plan', mediaType: 'text/markdown' },
    { artifactId: 'b', title: 'Hero image', mediaType: 'image/png' },
    { artifactId: 'c', title: 'Pricing PLAN', mediaType: 'text/csv' },
  ];
  assert.deepEqual(filterLibraryItems(items, {}).map(item => item.artifactId), ['a', 'b', 'c']);
  assert.deepEqual(filterLibraryItems(items, { text: 'plan' }).map(item => item.artifactId), ['a', 'c']);
  assert.deepEqual(filterLibraryItems(items, { kind: 'image' }).map(item => item.artifactId), ['b']);
  assert.deepEqual(filterLibraryItems(items, { kind: 'sheet', text: ' plan ' }).map(item => item.artifactId), ['c']);
  assert.deepEqual(filterLibraryItems(null, { kind: 'image' }), []);
});

test('appending a page keeps one row per artifact at its newest version', async () => {
  const { mergeLibraryPage } = await import('../src/components/hivemind/app/shared/runtime-library.js');
  const first = [{ artifactId: 'a', latestVersion: 2 }, { artifactId: 'b', latestVersion: 1 }];
  const second = [{ artifactId: 'c', latestVersion: 1 }, { artifactId: 'a', latestVersion: 3 }, { artifactId: 'b', latestVersion: 1 }];
  assert.deepEqual(mergeLibraryPage(first, second).map(row => `${row.artifactId}${row.latestVersion}`), ['b1', 'c1', 'a3']);
  assert.deepEqual(mergeLibraryPage(null, first), first);
});

test('folder navigation groups subfolders under their top-level name', async () => {
  const { folderTree } = await import('../src/components/hivemind/app/shared/runtime-library.js');
  assert.deepEqual(folderTree([
    { folder: 'Research/Market', count: 3 }, { folder: 'Artifacts', count: 5 }, { folder: 'Research', count: 1 }, { folder: 'Research/Competitors', count: 2 }, { folder: '', count: 9 },
  ]), [
    { folder: 'Artifacts', label: 'Artifacts', count: 5, children: [] },
    { folder: 'Research', label: 'Research', count: 6, children: [{ folder: 'Research/Competitors', label: 'Competitors', count: 2 }, { folder: 'Research/Market', label: 'Market', count: 3 }] },
  ]);
  assert.deepEqual(folderTree(null), []);
});

test('short dates read as time today, yesterday, weekday, then day and month', async () => {
  const { formatShortDate } = await import('../src/components/hivemind/app/shared/runtime-library.js');
  const now = new Date(2026, 9, 24, 15, 0).getTime();
  assert.match(formatShortDate(new Date(2026, 9, 24, 9, 5).getTime(), now, 'en-GB'), /^09:05$/);
  assert.equal(formatShortDate(new Date(2026, 9, 23, 23, 0).getTime(), now, 'en-GB'), 'Yesterday');
  assert.equal(formatShortDate(new Date(2026, 9, 20, 12, 0).getTime(), now, 'en-GB'), 'Tuesday');
  assert.equal(formatShortDate(new Date(2026, 8, 3, 12, 0).getTime(), now, 'en-GB'), '3 Sept');
  assert.equal(formatShortDate(new Date(2025, 8, 3, 12, 0).getTime(), now, 'en-GB'), '3 Sept 2025');
  assert.equal(formatShortDate('not a date', now), '');
});

test('a 404 listing is reported as an unavailable Library', async () => {
  const { fetchLibraryPage } = await import('../src/components/hivemind/app/shared/runtime-library.js');
  await assert.rejects(fetchLibraryPage('/api/hivemind/artifacts', { fetcher: async () => ({ status: 404, ok: false }) }), { name: 'LibraryUnavailableError' });
  await assert.rejects(fetchLibraryPage('/api/hivemind/artifacts', { fetcher: async () => ({ status: 503, ok: false }) }), { message: 'library_failed' });
  const calls = [];
  const page = await fetchLibraryPage('/api/hivemind/artifacts', { fetcher: async (url, init) => { calls.push([url, init.credentials]); return { status: 200, ok: true, json: async () => ({ items: [] }) }; } });
  assert.deepEqual(page, { items: [] });
  assert.deepEqual(calls, [['/api/hivemind/artifacts', 'include']]);
});
