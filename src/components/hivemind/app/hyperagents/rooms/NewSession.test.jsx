import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import NewSession from './NewSession';
import apiClient from '../../shared/api-client';

jest.mock('../../shared/api-client', () => ({ __esModule: true, default: { listEmployees: jest.fn() } }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test('new session passes selected employee and company task mode with prompt', async () => {
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
  act(() => { Simulate.click(button('Aster')); });
  act(() => { Simulate.click(button('HyperAgents mode')); });
  act(() => { Simulate.click(button('Company task')); });
  act(() => { Simulate.change(host.querySelector('textarea'), { target: { value: 'Create a seed pitch deck' } }); });
  act(() => { Simulate.click(host.querySelector('button[aria-label="Send"]')); });
  expect(onSubmit).toHaveBeenCalledWith('Create a seed pitch deck', { mode: 'company', employeeId: 'employee-2', employeeIds: ['employee-1', 'employee-2', 'employee-3'] });
  act(() => { root.unmount(); });
  host.remove();
});
