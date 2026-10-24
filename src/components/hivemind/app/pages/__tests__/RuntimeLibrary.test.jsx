import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RuntimeLibrary from '../RuntimeLibrary';
import { pageCache } from '../../shared/resource-cache';

let mockSearch = new URLSearchParams();
const mockSetParams = jest.fn(next => { mockSearch = new URLSearchParams(next); });
jest.mock('react-router-dom', () => ({ useSearchParams: () => [mockSearch, mockSetParams] }), { virtual: true });

const page = (items, extra = {}) => ({ status: 200, ok: true, json: async () => ({ folders: [{ folder: 'Research/Market', count: 2 }, { folder: 'Reports', count: 1 }], items, ...extra }) });
const item = (id, title, mediaType = 'text/markdown') => ({ artifactId: id, title, mediaType, latestVersion: 1, folder: 'Reports', producerName: 'Runtime', updatedAt: Date.now() });

beforeEach(() => {
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
