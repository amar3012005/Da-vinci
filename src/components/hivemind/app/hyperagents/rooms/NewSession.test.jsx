import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import NewSession from './NewSession';
import apiClient from '../../shared/api-client';

jest.mock('../../shared/api-client', () => ({ __esModule: true, default: { listEmployees: jest.fn() } }));
jest.mock('../AgentAvatar', () => ({ __esModule: true, default: () => null }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test('new session passes selected employee and automatic mode with prompt', async () => {
  apiClient.listEmployees.mockResolvedValue({ employees: [
    { id: 'employee-1', name: 'Maya', status: 'active' },
    { id: 'employee-2', name: 'Aster', status: 'active' },
    { id: 'employee-3', name: 'Giana', status: 'active' },
  ] });
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => { root.render(<NewSession onSubmit={onSubmit} />); });
  await act(async () => { await Promise.resolve(); });
  const button = (label) => [...host.querySelectorAll('button')].find((item) => item.textContent.includes(label));
  expect(host.querySelector('h1').textContent).toBe('OS · Remember what matters.');
  expect(host.textContent).not.toContain('HyperAgents mode');
  expect(host.textContent).not.toContain('Full scope');
  expect(host.querySelectorAll('[role="menuitemradio"]')).toHaveLength(0);
  act(() => { Simulate.click(host.querySelector('button[aria-label="Choose HyperAgent"]')); });
  act(() => { Simulate.click(button('Aster')); });
  act(() => { Simulate.change(host.querySelector('textarea'), { target: { value: 'Create a seed pitch deck' } }); });
  act(() => { Simulate.click(host.querySelector('button[aria-label="Send"]')); });
  expect(onSubmit).toHaveBeenCalledWith('Create a seed pitch deck', { mode: 'auto', employeeId: 'employee-2', employeeIds: ['employee-1', 'employee-2', 'employee-3'] });
  act(() => { root.unmount(); });
  host.remove();
});
