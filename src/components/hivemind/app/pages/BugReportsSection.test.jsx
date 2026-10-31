import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BugReportsSection from './BugReportsSection';
import apiClient from '../shared/api-client';

const summary = (extra = {}) => ({ id: 'r1', at: '2026-10-31T10:00:00.000Z', userId: 'u-1', orgId: 'org-1', platform: 'ios', route: '/x', version: '1', build: 'b', preview: 'Room will not open\nsecond line', status: 'new', ...extra });
const full = (extra = {}) => ({ ...summary(), text: 'Room will not open\nsecond line', appVersion: '1', userAgent: 'Mozilla/5.0 test', ...extra });
afterEach(() => jest.restoreAllMocks());

test('lists reports with status chip, platform, company and first line, and reports the new count', async () => {
  jest.spyOn(apiClient, 'listBugReports').mockResolvedValue({ reports: [summary()], total: 1, counts: { new: 1, seen: 0, fixed: 0 }, nextOffset: null });
  const onCounts = jest.fn();
  render(<BugReportsSection onCounts={onCounts} />);
  expect(await screen.findByText('Room will not open')).toBeTruthy();
  expect(screen.getByText('ios')).toBeTruthy();
  expect(screen.getByText('org-1')).toBeTruthy();
  expect(onCounts).toHaveBeenCalledWith({ new: 1, seen: 0, fixed: 0 });
});

test('status filter reloads from the first page with the chosen status', async () => {
  const list = jest.spyOn(apiClient, 'listBugReports').mockResolvedValue({ reports: [], total: 0, counts: { new: 0, seen: 0, fixed: 0 }, nextOffset: null });
  render(<BugReportsSection />);
  await screen.findByText('No bug reports match.');
  fireEvent.click(screen.getByRole('button', { name: 'Fixed' }));
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'fixed', offset: 0 })));
});

test('detail drawer shows the full report and marks it seen then fixed', async () => {
  jest.spyOn(apiClient, 'listBugReports').mockResolvedValue({ reports: [summary()], total: 1, counts: { new: 1, seen: 0, fixed: 0 }, nextOffset: null });
  jest.spyOn(apiClient, 'getBugReport').mockResolvedValue(full());
  const set = jest.spyOn(apiClient, 'setBugReportStatus').mockResolvedValue({});
  render(<BugReportsSection />);
  fireEvent.click(await screen.findByText('Room will not open'));
  expect(await screen.findByText('Mozilla/5.0 test')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Mark seen' }));
  await waitFor(() => expect(set).toHaveBeenCalledWith('r1', 'seen'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Mark fixed' }).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Mark fixed' }));
  await waitFor(() => expect(set).toHaveBeenCalledWith('r1', 'fixed'));
});

test('shows the server error, for example when the admin is not authorized', async () => {
  jest.spyOn(apiClient, 'listBugReports').mockRejectedValue({ response: { data: { error: 'platform_admin_required' } } });
  render(<BugReportsSection />);
  expect(await screen.findByText('platform_admin_required')).toBeTruthy();
});
