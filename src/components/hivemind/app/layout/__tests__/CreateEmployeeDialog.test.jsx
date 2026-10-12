/** @jest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CreateEmployeeDialog from '../CreateEmployeeDialog';
import apiClient from '../../shared/api-client';
import { createEmployeeAppearance, employeeAppearance } from '../../shared/employee-appearance';
import { humation1 } from '@humation/assets-humation-1';
import { createAvatar } from '@humation/core';
import AgentAvatar from '../../hyperagents/AgentAvatar';
import { Avatar } from '@humation/react';

jest.mock('../../shared/api-client', () => ({ __esModule: true, default: { manageNativeEmployeeLifecycle: jest.fn(), createRegisteredOpenDotEmployee: jest.fn() } }));
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => 'draft-uuid' } });
});

test('asks only for name and character before durable creation and opens only a confirmed employee', async () => {
  let confirm;
  apiClient.manageNativeEmployeeLifecycle.mockImplementation(() => new Promise(resolve => { confirm = resolve; }));
  const open = jest.fn().mockResolvedValue(true);
  const close = jest.fn();
  render(<CreateEmployeeDialog onClose={close} onCreated={open} />);
  expect(screen.getAllByRole('textbox')).toHaveLength(1);
  expect(screen.getByText('Create').disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Maya' } });
  fireEvent.click(screen.getByLabelText('Character 3'));
  fireEvent.click(screen.getByText('Create'));
  expect(open).not.toHaveBeenCalled();
  const input = apiClient.manageNativeEmployeeLifecycle.mock.calls[0][0];
  expect(input).toEqual({ operation: 'create', creation_key: 'draft-uuid', name: 'Maya', lifecycle: 'durable', appearance: expect.objectContaining({ provider: 'humation', version: 1, template: 'humation-1', asset_version: humation1.template.version }) });
  expect(employeeAppearance({ policyRules: { appearance: input.appearance } })).toEqual(input.appearance);
  confirm({ employee: { id: 'actual-employee', name: 'Maya', policyRules: { appearance: input.appearance } } });
  await waitFor(() => expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 'actual-employee' })));
  expect(close).toHaveBeenCalled();
});

test('an unknown create outcome retries the exact draft and opening failure retries only the created room', async () => {
  apiClient.manageNativeEmployeeLifecycle.mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce({ employee: { id: 'employee' } });
  const open = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<CreateEmployeeDialog onClose={jest.fn()} onCreated={open} />);
  fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Maya' } });
  fireEvent.click(screen.getByText('Create'));
  await screen.findByText('Connection interrupted');
  fireEvent.click(screen.getByText('Retry create'));
  await screen.findByText('Your employee is created. Its room could not open yet. Please try again.');
  expect(apiClient.manageNativeEmployeeLifecycle.mock.calls[0][0]).toEqual(apiClient.manageNativeEmployeeLifecycle.mock.calls[1][0]);
  fireEvent.click(screen.getByText('Open employee'));
  await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
  expect(apiClient.manageNativeEmployeeLifecycle).toHaveBeenCalledTimes(2);
});

test('canonical state renders the same chosen parts and supports explicit none per slot', () => {
  const appearance = createEmployeeAppearance('employee', { selections: { head: 'braids', item: 'none', glasses: 'none' }, colors: { clothes: 'abc123' } });
  expect(appearance.selections.item).toBe('hm1-p-000041');
  expect(appearance.selections.glasses).toBe('hm1-p-000056');
  expect(employeeAppearance({ policy_rules: { appearance } })).toEqual(appearance);
  const restored = createAvatar(humation1, appearance).toJSON();
  expect(restored.selections).toEqual(appearance.selections);
  expect(restored.colors).toEqual(appearance.colors);
  expect(employeeAppearance({ policyRules: { appearance: { ...appearance, selections: { ...appearance.selections, head: 'bad-part' } } } })).toBeNull();
});


test('the shared sidebar avatar reproduces saved canonical Humation state', () => {
  const appearance = createEmployeeAppearance('chosen-character', { selections: { head: 'braids', item: 'none', glasses: 'none' }, colors: { clothes: 'abc123' } });
  const { container } = render(<><AgentAvatar agent={{ id: 'new-uuid', name: 'Maya', policy_rules: { appearance } }} ring={false} size={28} /><Avatar assets={humation1} seed={appearance.seed} selections={appearance.selections} colors={appearance.colors} background={appearance.background} crop={appearance.crop} size={28} title="Maya" /></>);
  const [saved, expected] = container.querySelectorAll('svg');
  expect(saved.innerHTML).toBe(expected.innerHTML);
  expect(saved.style.getPropertyValue('--hm-clothes')).toBe(expected.style.getPropertyValue('--hm-clothes'));
});

test('creation action follows the last team member and does not introduce a new room route', () => {
  const fs = require('fs'); const path = require('path');
  const sidebar = fs.readFileSync(path.join(__dirname, '../Sidebar.jsx'), 'utf8');
  const team = sidebar.slice(sidebar.indexOf("label: tt('groups.yourTeam'"), sidebar.indexOf("label: tt('groups.yourBrain'"));
  expect(team.indexOf('...team.map')).toBeLessThan(team.indexOf('createEmployee: true'));
  expect(sidebar).toContain('item.createEmployee ? () => setCreateEmployeeOpen(true)');
  expect(sidebar).toContain("return openAgent({ preventDefault() {} }, employee)");
  expect(sidebar).not.toContain("navigate('/hivemind/app/employee/create')");
});


test('computer choice uses the complete registered Dot flow and locks the exact retry draft', async () => {
  apiClient.createRegisteredOpenDotEmployee.mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce({ employee: { id: 'bound-employee', policyRules: { open_dot_employee: { version: 1, state: 'bound' } } } });
  const open = jest.fn().mockResolvedValue(true);
  render(<CreateEmployeeDialog onClose={jest.fn()} onCreated={open} />);
  fireEvent.change(screen.getByLabelText('Employee name'), { target: { value: 'Maya' } });
  fireEvent.click(screen.getByLabelText('Needs computer access'));
  fireEvent.click(screen.getByText('Create'));
  await screen.findByText('Connection interrupted');
  expect(screen.getByLabelText('Needs computer access').disabled).toBe(true);
  expect(screen.getByLabelText('Employee name').disabled).toBe(true);
  fireEvent.click(screen.getByText('Retry create'));
  await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
  expect(apiClient.manageNativeEmployeeLifecycle).not.toHaveBeenCalled();
  const [first, second] = apiClient.createRegisteredOpenDotEmployee.mock.calls;
  expect(first[0]).toEqual(second[0]);
  expect(Object.keys(first[0]).sort()).toEqual(['appearance', 'creation_key', 'name']);
});


test('percentage character previews use CSS auto height without invalid SVG attributes', () => {
  render(<CreateEmployeeDialog onClose={() => {}} onCreated={async () => {}} />);
  expect(document.body.querySelectorAll('svg[height="auto"]').length).toBe(0);
  const previews = [...document.body.querySelectorAll('svg[width="100%"]')];
  expect(previews.length).toBe(6);
  expect(previews.every(svg => svg.style.height === 'auto' && !svg.hasAttribute('height') && svg.hasAttribute('viewBox'))).toBe(true);
});
