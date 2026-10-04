import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RuntimeEventSubscriptions from './RuntimeEventSubscriptions';
import apiClient from '../shared/api-client';
jest.mock('../shared/api-client', () => ({ connectedEventSubscriptions: jest.fn() }));
const row = { id: 'existing-id', toolkit: 'gmail', trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
  connected_account_id: 'existing-account', config: { label: 'INBOX' }, status: 'active', runtime_attention: false };
beforeEach(() => { apiClient.connectedEventSubscriptions.mockReset(); });
test('only lists existing active subscriptions and never enables one on load', async () => {
  apiClient.connectedEventSubscriptions.mockResolvedValue({ subscriptions: [row, { ...row, id: 'paused', status: 'paused' }] });
  render(<RuntimeEventSubscriptions />);
  const toggle = await screen.findByRole('switch');
  expect(toggle.getAttribute('aria-checked')).toBe('false');
  expect(apiClient.connectedEventSubscriptions.mock.calls).toEqual([[{ operation: 'list' }]]);
  expect(screen.getAllByRole('switch')).toHaveLength(1);
});
test('explicit owner click preserves account, event and config and renders confirmed state', async () => {
  apiClient.connectedEventSubscriptions.mockResolvedValueOnce({ subscriptions: [row] })
    .mockResolvedValueOnce({ successful: true, subscription: { ...row, runtime_attention: true } });
  render(<RuntimeEventSubscriptions />);
  fireEvent.click(await screen.findByRole('switch'));
  await waitFor(() => expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true'));
  expect(apiClient.connectedEventSubscriptions.mock.calls[1]).toEqual([{ operation: 'create',
    connected_account_id: row.connected_account_id, trigger_slug: row.trigger_slug,
    config: row.config, runtime_attention: true }]);
});
test('uncertain mutation never optimistically enables and requires refresh before another mutation', async () => {
  apiClient.connectedEventSubscriptions.mockResolvedValueOnce({ subscriptions: [row] }).mockRejectedValueOnce(Error('network'))
    .mockResolvedValueOnce({ subscriptions: [{ ...row, runtime_attention: true }] });
  render(<RuntimeEventSubscriptions />);
  fireEvent.click(await screen.findByRole('switch'));
  await screen.findByRole('alert');
  expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
  expect(screen.getByRole('switch').disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh Runtime updates' }));
  await waitFor(() => expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true'));
  expect(screen.getByRole('switch').disabled).toBe(false);
});
