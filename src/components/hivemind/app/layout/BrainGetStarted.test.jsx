import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import BrainGetStarted from './BrainGetStarted';
import apiClient from '../shared/api-client';
const mockNavigate = jest.fn(); let mockPath = '/hivemind/app/overview';
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useLocation: () => ({ pathname: mockPath }) }), { virtual: true });
jest.mock('../shared/api-client', () => ({ listDocuments: jest.fn(async () => ({ documents: [{ id: 'doc' }] })), listMemories: jest.fn(async () => ({ memories: [] })), getConnectorConnectionStatus: jest.fn(async () => ({ connectors: [] })) }));
beforeEach(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); apiClient.listDocuments.mockResolvedValue({ documents: [{ id: 'doc' }] }); apiClient.listMemories.mockResolvedValue({ memories: [] }); apiClient.getConnectorConnectionStatus.mockResolvedValue({ connectors: [] }); localStorage.clear(); mockPath = '/hivemind/app/overview'; });
it('uses Brain milestones and does not complete a save from navigation', async () => {
  render(<BrainGetStarted scope="user:org" />); await act(async () => {});
  expect(screen.getByRole('progressbar', { hidden: true }).getAttribute('aria-valuenow')).toBe('1');
  fireEvent.click(screen.getByText('Save something worth remembering'));
  expect(mockNavigate).toHaveBeenCalledWith('/hivemind/app/memories');
  expect(screen.getByRole('checkbox', { name: 'Save something worth remembering', hidden: true }).getAttribute('aria-checked')).toBe('false');
  expect(screen.queryByText('Awaken Runtime')).toBeNull();
});
it('isolates Brain progress from Runtime and other accounts', async () => {
  localStorage.setItem('hivemind.runtime-get-started:v1:user:org', JSON.stringify({ chat: true }));
  mockPath = '/hivemind/app/overview/session/saved';
  const first = render(<BrainGetStarted scope="user:org" />); await act(async () => {});
  expect(JSON.parse(localStorage.getItem('hivemind.brain-get-started:v1:user:org')).chat).toBe(true);
  first.unmount(); mockPath = '/hivemind/app/overview';
  render(<BrainGetStarted scope="other:org" />); await act(async () => {});
  expect(screen.getByRole('checkbox', { name: 'Start a Brain conversation', hidden: true }).getAttribute('aria-checked')).toBe('false');
});
