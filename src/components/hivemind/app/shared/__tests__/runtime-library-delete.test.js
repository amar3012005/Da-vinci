import { LIBRARY_DELETE_BATCH, LibraryDeleteError, canDeleteLibrary, deleteLibraryArtifacts } from '../runtime-library';

test.each([
  [{ org: { role: 'owner' } }, true],
  [{ org: { role: 'admin' } }, true],
  [{ user: { orgRole: 'admin' } }, true],
  [{ user: { role: 'owner' } }, true],
  [{ org: { role: 'member' }, user: { role: 'admin' } }, false],
  [{ org: { role: 'viewer' } }, false],
  [{ org: null, user: null }, false],
  [undefined, false],
])('only an owner or admin may see delete: %j', (account, expected) => {
  expect(canDeleteLibrary(account)).toBe(expected);
});

const ok = deleted => async () => ({ ok: true, status: 200, json: async () => ({ deleted }) });

test('ids are sent in bounded batches with the confirmation word, and counts are summed', async () => {
  const ids = Array.from({ length: LIBRARY_DELETE_BATCH + 5 }, (unused, index) => `art_${index}`);
  const fetcher = jest.fn(ok({ artifacts: 3, versions: 4, blobsFailed: 1 }));
  const total = await deleteLibraryArtifacts({ ids }, { fetcher });
  expect(fetcher).toHaveBeenCalledTimes(2);
  const bodies = fetcher.mock.calls.map(([, init]) => JSON.parse(init.body));
  expect(bodies.map(body => body.ids.length)).toEqual([LIBRARY_DELETE_BATCH, 5]);
  expect(bodies.every(body => body.confirm === 'DELETE')).toBe(true);
  expect(fetcher.mock.calls[0][0]).toBe('/api/hivemind/artifacts/delete');
  expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });
  expect(total).toEqual({ artifacts: 6, versions: 8, blobsFailed: 2 });
});

test('the all form carries the folder only when one is chosen', async () => {
  const fetcher = jest.fn(ok({ artifacts: 1, versions: 1 }));
  await deleteLibraryArtifacts({ all: true }, { fetcher });
  await deleteLibraryArtifacts({ all: true, folder: 'Reports' }, { fetcher });
  expect(fetcher.mock.calls.map(([, init]) => JSON.parse(init.body))).toEqual([
    { all: true, confirm: 'DELETE' }, { all: true, folder: 'Reports', confirm: 'DELETE' },
  ]);
});

test('a refusal stops the run and reports the status and code', async () => {
  const fetcher = jest.fn(async () => ({ ok: false, status: 403, json: async () => ({ error: 'artifact_admin_required' }) }));
  await expect(deleteLibraryArtifacts({ ids: ['art_1'] }, { fetcher })).rejects.toMatchObject({ status: 403, code: 'artifact_admin_required' });
  await expect(deleteLibraryArtifacts({ ids: ['art_1'] }, { fetcher })).rejects.toBeInstanceOf(LibraryDeleteError);
  const broken = jest.fn(async () => ({ ok: false, status: 503, json: async () => { throw new Error('not json'); } }));
  await expect(deleteLibraryArtifacts({ all: true }, { fetcher: broken })).rejects.toMatchObject({ status: 503, code: '' });
});
