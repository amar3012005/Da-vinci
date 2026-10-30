import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ArchivedEmployees, { archivedEmployeeView } from '../ArchivedEmployees';

const mockList = jest.fn();
const mockManage = jest.fn();
jest.mock('../../shared/api-client', () => ({ __esModule: true, default: {
  listArchivedEmployees: (...args) => mockList(...args),
  manageNativeEmployeeLifecycle: (...args) => mockManage(...args),
} }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, fallback, options) => String(typeof fallback === 'string' ? fallback : key).replace(/\{\{(\w+)\}\}/g, (_, name) => options?.[name] ?? '') }) }));

const zoe = { id: 'e1', name: 'Zoe', roleArchetype: 'Research analyst', persona: 'Reads the market.', archivedAt: '2026-10-30T10:00:00Z',
  policyRules: { native_lifecycle: { archive: { reversible: true, archived_at: '2026-10-30T10:00:00Z' } } } };

beforeEach(() => { mockList.mockReset(); mockManage.mockReset(); mockList.mockResolvedValue({ employees: [zoe] }); mockManage.mockResolvedValue({}); });

test('lists archived employees with name and role, never raw ids', async () => {
  render(<ArchivedEmployees />);
  expect(await screen.findByText('Zoe')).toBeTruthy();
  expect(document.body.textContent).toContain('Research analyst');
  expect(document.body.textContent).not.toContain('e1');
});

test('opens a read-only profile view that keeps the saved profile and offers Unarchive', async () => {
  render(<ArchivedEmployees />);
  fireEvent.click(await screen.findByText('Zoe'));
  expect(screen.getByText('Reads the market.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Unarchive' })).toBeTruthy();
  expect(document.body.textContent).toContain('chats, memory and files are kept');
});

test('unarchive restores through the native lifecycle, removes it from the list and refreshes the roster', async () => {
  const changed = jest.fn();
  window.addEventListener('hm:employees-changed', changed);
  render(<ArchivedEmployees />);
  await screen.findByText('Zoe');
  fireEvent.click(screen.getByRole('button', { name: 'Unarchive' }));
  await waitFor(() => expect(mockManage).toHaveBeenCalledWith({ operation: 'unarchive', employee_id: 'e1' }));
  await waitFor(() => expect(screen.queryByText('Zoe')).toBeNull());
  expect(changed).toHaveBeenCalled();
  expect(screen.getByRole('status').textContent).toContain('Zoe is back on your team');
  window.removeEventListener('hm:employees-changed', changed);
});

test('a failed unarchive keeps the employee listed and says so', async () => {
  mockManage.mockRejectedValue(new Error('409'));
  render(<ArchivedEmployees />);
  await screen.findByText('Zoe');
  fireEvent.click(screen.getByRole('button', { name: 'Unarchive' }));
  expect((await screen.findByRole('alert')).textContent).toContain('isn’t confirmed');
  expect(screen.getByText('Zoe')).toBeTruthy();
});

test('shows an empty state when nothing is archived', async () => {
  mockList.mockResolvedValue({ employees: [] });
  render(<ArchivedEmployees />);
  expect(await screen.findByText('No archived employees')).toBeTruthy();
});

test('the view takes the archive time from the lifecycle marker', () => {
  expect(archivedEmployeeView(zoe)).toMatchObject({ id: 'e1', name: 'Zoe', role: 'Research analyst', archivedAt: '2026-10-30T10:00:00Z' });
});
