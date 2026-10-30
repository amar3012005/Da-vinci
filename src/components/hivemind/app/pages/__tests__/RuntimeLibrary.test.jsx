import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RuntimeLibrary from '../RuntimeLibrary';
import { pageCache } from '../../shared/resource-cache';

let mockSearch = new URLSearchParams();
const mockSetParams = jest.fn(next => { mockSearch = new URLSearchParams(next); });
jest.mock('react-router-dom', () => ({ useSearchParams: () => [mockSearch, mockSetParams] }), { virtual: true });

let mockAccount = { org: { role: 'member' }, user: {} };
jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => mockAccount }));

const page = (items, extra = {}) => ({ status: 200, ok: true, json: async () => ({ folders: [{ folder: 'Research/Market', count: 2 }, { folder: 'Reports', count: 1 }], items, ...extra }) });
const item = (id, title, mediaType = 'text/markdown') => ({ artifactId: id, title, mediaType, latestVersion: 1, folder: 'Reports', producerName: 'Runtime', updatedAt: Date.now() });

beforeEach(() => {
  mockAccount = { org: { role: 'member' }, user: {} };
  mockSearch = new URLSearchParams();
  mockSetParams.mockClear();
  pageCache.clear();
  global.fetch = jest.fn(async () => page([item('a1', 'Launch plan'), item('a2', 'Hero shot', 'image/png')]));
  global.IntersectionObserver = undefined;
});

test('one listing read per view: re-renders neither refetch nor restart it', async () => {
  const { rerender } = render(<RuntimeLibrary />);
  for (let index = 0; index < 5; index += 1) rerender(<RuntimeLibrary />);
  expect(await screen.findByText('Launch plan')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch.mock.calls[0][0]).toBe('/api/hivemind/artifacts');
});

test('a return visit paints cached files immediately without another read', async () => {
  const first = render(<RuntimeLibrary />);
  await screen.findByText('Launch plan');
  first.unmount();
  render(<RuntimeLibrary />);
  expect(screen.getByText('Launch plan')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('folders show by name, grouped, and never as raw ids', async () => {
  render(<RuntimeLibrary />);
  await screen.findByText('Launch plan');
  const nav = screen.getByRole('navigation', { name: 'Library folders' });
  expect(nav.textContent).toContain('Research');
  expect(nav.textContent).toContain('Reports');
  expect(document.body.textContent).not.toContain('a1');
});

test('type filter narrows loaded files locally; gallery images load lazily in fixed boxes', async () => {
  mockSearch = new URLSearchParams('type=image');
  const { container } = render(<RuntimeLibrary />);
  expect(await screen.findByText('Hero shot')).toBeTruthy();
  expect(screen.queryByText('Launch plan')).toBeNull();
  const image = container.querySelector('img');
  expect(image.getAttribute('loading')).toBe('lazy');
  expect(image.parentElement.className).toContain('aspect-[4/3]');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('typing searches after a pause and keeps the typed text', async () => {
  jest.useFakeTimers();
  try {
    render(<RuntimeLibrary />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search files' }), { target: { value: 'plan' } });
    expect(mockSetParams).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(300); });
    expect(mockSetParams).toHaveBeenCalledTimes(1);
    expect(String(mockSetParams.mock.calls[0][0])).toBe('query=plan');
    expect(screen.getByRole('searchbox', { name: 'Search files' }).value).toBe('plan');
  } finally { jest.useRealTimers(); }
});

test('load more appends the next page without duplicating rows', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce(page([item('a1', 'Launch plan')], { next: 'c2' }))
    .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ items: [item('a1', 'Launch plan'), item('a3', 'Board memo')] }) });
  render(<RuntimeLibrary />);
  await screen.findByText('Launch plan');
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  await screen.findByText('Board memo');
  expect(global.fetch.mock.calls[1][0]).toBe('/api/hivemind/artifacts?cursor=c2');
  expect(screen.getAllByText('Launch plan')).toHaveLength(1);
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull());
});

test('a missing Library route shows an unavailable state', async () => {
  global.fetch = jest.fn(async () => ({ status: 404, ok: false }));
  render(<RuntimeLibrary />);
  expect(await screen.findByText('The Library isn’t available here yet')).toBeTruthy();
});

describe('admin deletion', () => {
  const deleted = (artifacts, extra = {}) => ({ status: 200, ok: true, json: async () => ({ deleted: { artifacts, versions: artifacts, blobsRemoved: artifacts, blobsFailed: 0, ...extra } }) });
  const postBodies = () => global.fetch.mock.calls.filter(([url, init]) => url === '/api/hivemind/artifacts/delete' && init?.method === 'POST').map(([, init]) => JSON.parse(init.body));

  test.each([
    ['a member', { org: { role: 'member' }, user: {} }, false],
    ['a viewer', { org: { role: 'viewer' }, user: { role: 'viewer' } }, false],
    ['no role yet', { org: null, user: null }, false],
    ['an admin', { org: { role: 'admin' }, user: {} }, true],
    ['an owner by profile', { org: {}, user: { orgRole: 'owner' } }, true],
  ])('the delete control is %s: %s', async (unused, account, visible) => {
    mockAccount = account;
    render(<RuntimeLibrary />);
    await screen.findByText('Launch plan');
    expect(Boolean(screen.queryByRole('button', { name: 'Delete files' }))).toBe(visible);
  });

  test('selecting files and confirming in the page deletes them and refreshes the list', async () => {
    mockAccount = { org: { role: 'admin' }, user: {} };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(page([item('a1', 'Launch plan'), item('a2', 'Hero shot', 'image/png'), item('a3', 'Board memo')]))
      .mockResolvedValueOnce(deleted(2))
      .mockResolvedValueOnce(page([item('a3', 'Board memo')]));
    const confirm = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    render(<RuntimeLibrary />);
    await screen.findByText('Launch plan');
    fireEvent.click(screen.getByRole('button', { name: 'Delete files' }));
    expect(screen.getByRole('button', { name: 'Delete 0 permanently' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Launch plan' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Hero shot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete 2 permanently' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog.textContent).toContain('Delete 2 files permanently?');
    expect(dialog.textContent).toContain('can’t be undone');
    expect(postBodies()).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(postBodies()).toEqual([{ ids: ['a1', 'a2'], confirm: 'DELETE' }]);
    await waitFor(() => expect(screen.queryByText('Launch plan')).toBeNull());
    expect(screen.getByText('Board memo')).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Deleted 2 files permanently');
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  test('cancelling the confirmation deletes nothing', async () => {
    mockAccount = { org: { role: 'owner' }, user: {} };
    render(<RuntimeLibrary />);
    await screen.findByText('Launch plan');
    fireEvent.click(screen.getByRole('button', { name: 'Delete files' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete 2 permanently' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(postBodies()).toEqual([]);
  });

  test('deleting every file in the Library needs the typed word and sends the all form', async () => {
    mockAccount = { org: { role: 'admin' }, user: {} };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(page([item('a1', 'Launch plan'), item('a2', 'Hero shot')], { next: 'c2' }))
      .mockResolvedValueOnce(deleted(3))
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ folders: [], items: [] }) });
    render(<RuntimeLibrary />);
    await screen.findByText('Launch plan');
    fireEvent.click(screen.getByRole('button', { name: 'Delete files' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Select all 3 files' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete 3 permanently' }));
    const confirm = screen.getByRole('button', { name: 'Delete permanently' });
    expect(screen.getByRole('alertdialog').textContent).toContain('Delete all 3 files permanently?');
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'delete' } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await screen.findByRole('status');
    expect(postBodies()).toEqual([{ all: true, confirm: 'DELETE' }]);
    expect(await screen.findByText('No files yet')).toBeTruthy();
  });

  test('a refused deletion shows its error in the dialog and keeps the files', async () => {
    mockAccount = { org: { role: 'admin' }, user: {} };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(page([item('a1', 'Launch plan')]))
      .mockResolvedValueOnce({ status: 403, ok: false, json: async () => ({ error: 'artifact_admin_required' }) })
      .mockResolvedValue(page([item('a1', 'Launch plan')]));
    render(<RuntimeLibrary />);
    await screen.findByText('Launch plan');
    fireEvent.click(screen.getByRole('button', { name: 'Delete files' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Launch plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete 1 permanently' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Only owners and admins');
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('Launch plan')).toBeTruthy();
  });

  test('in delete mode clicking a file selects it instead of opening it', async () => {
    mockAccount = { org: { role: 'admin' }, user: {} };
    render(<RuntimeLibrary />);
    await screen.findByText('Launch plan');
    fireEvent.click(screen.getByRole('button', { name: 'Delete files' }));
    expect(fireEvent.click(screen.getByText('Launch plan'))).toBe(false);
    expect(screen.getByRole('checkbox', { name: 'Select Launch plan' }).checked).toBe(true);
    expect(screen.getByText('1 selected')).toBeTruthy();
  });
});

test('owners and admins get an Archived employees entry that opens the section; members do not', async () => {
  const first = render(<RuntimeLibrary />);
  await screen.findByText('Launch plan');
  expect(screen.queryByText('Archived employees')).toBeNull();
  first.unmount();
  mockAccount = { org: { role: 'admin' }, user: {} };
  render(<RuntimeLibrary />);
  await screen.findByText('Launch plan');
  fireEvent.click(screen.getAllByText('Archived employees')[0]);
  expect(mockSetParams).toHaveBeenCalled();
  expect(new URLSearchParams(mockSetParams.mock.calls.at(-1)[0]).get('section')).toBe('archived');
});
