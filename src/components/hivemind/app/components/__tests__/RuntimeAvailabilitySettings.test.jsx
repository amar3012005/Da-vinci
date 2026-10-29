import React, { useState } from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../auth/AuthProvider', () => {
  const React = require('react');
  const Context = React.createContext(null);
  return { __esModule: true, AuthTestContext: Context, useAuth: () => React.useContext(Context) };
});
jest.mock('../../shared/api-client', () => ({ __esModule: true, default: { getRuntimeSetting: jest.fn(), setRuntimeSetting: jest.fn() } }));
jest.mock('../../layout/AutonomyDial', () => ({ __esModule: true, default: ({ runtimeEnabled, orgId }) => <div data-testid="dial" data-org={orgId} data-runtime-enabled={String(runtimeEnabled)} /> }));

import RuntimeAvailabilitySettings from '../RuntimeAvailabilitySettings';
import { useRuntimeEnabled } from '../../shared/runtime-enabled';
import apiClient from '../../shared/api-client';
const { AuthTestContext } = require('../../auth/AuthProvider');

/** Same shape as AuthProvider: `org` state plus the `setRuntimeEnabled` action. */
function Host({ role = 'admin', runtimeEnabled, children }) {
  const [org, setOrg] = useState({ id: 'org-a', ...(runtimeEnabled === undefined ? {} : { runtime_enabled: runtimeEnabled }) });
  const value = { user: { id: 'user-a', role }, org, setRuntimeEnabled: enabled => setOrg(current => ({ ...current, runtime_enabled: enabled === true })) };
  return <AuthTestContext.Provider value={value}>{children}</AuthTestContext.Provider>;
}
function SidebarStandIn() { return useRuntimeEnabled() ? <button type="button">Runtime, AI Chief of Staff</button> : null; }
const mount = async ui => { let view; await act(async () => { view = render(ui); }); return view; };
const toggle = () => screen.getByRole('switch', { name: 'Enable Runtime' });

beforeEach(() => {
  apiClient.getRuntimeSetting.mockReset().mockResolvedValue({ organization_id: 'org-a', runtime_enabled: true });
  apiClient.setRuntimeSetting.mockReset();
});

test('an admin sees plain copy and the switch reflects the company setting', async () => {
  await mount(<Host runtimeEnabled={true}><RuntimeAvailabilitySettings /></Host>);
  expect(screen.getByText('Runtime, your AI Chief of Staff, plans and coordinates your team. Turn off to work with your employees directly.')).toBeInTheDocument();
  expect(toggle()).toHaveAttribute('aria-checked', 'true');
  await waitFor(() => expect(apiClient.getRuntimeSetting).toHaveBeenCalledWith('org-a'));
});

test('owners can change it; members and signed-out previews cannot see the switch', async () => {
  const owner = await mount(<Host role="owner"><RuntimeAvailabilitySettings /></Host>);
  expect(toggle()).toBeInTheDocument();
  owner.unmount();
  apiClient.getRuntimeSetting.mockClear();
  await mount(<Host role="member"><RuntimeAvailabilitySettings /></Host>);
  expect(screen.queryByRole('switch')).toBeNull();
  expect(apiClient.getRuntimeSetting).toHaveBeenCalledTimes(0);
  expect(screen.getByTestId('dial')).toBeInTheDocument();
});

test('switching Runtime off saves to Control and hides Runtime at once; switching it on brings it back without a reload', async () => {
  apiClient.setRuntimeSetting.mockImplementation(async (_org, enabled) => ({ organization_id: 'org-a', runtime_enabled: enabled, changed: true }));
  await mount(<Host runtimeEnabled={true}><SidebarStandIn /><RuntimeAvailabilitySettings /></Host>);
  expect(screen.getByRole('button', { name: 'Runtime, AI Chief of Staff' })).toBeInTheDocument();
  await act(async () => { fireEvent.click(toggle()); });
  expect(apiClient.setRuntimeSetting).toHaveBeenLastCalledWith('org-a', false);
  expect(toggle()).toHaveAttribute('aria-checked', 'false');
  expect(screen.queryByRole('button', { name: 'Runtime, AI Chief of Staff' })).toBeNull();
  expect(screen.getByTestId('dial')).toHaveAttribute('data-runtime-enabled', 'false');
  await act(async () => { fireEvent.click(toggle()); });
  expect(apiClient.setRuntimeSetting).toHaveBeenLastCalledWith('org-a', true);
  expect(screen.getByRole('button', { name: 'Runtime, AI Chief of Staff' })).toBeInTheDocument();
});

test('a failed save keeps the current state and says so', async () => {
  apiClient.setRuntimeSetting.mockRejectedValue(new Error('403'));
  await mount(<Host runtimeEnabled={true}><SidebarStandIn /><RuntimeAvailabilitySettings /></Host>);
  await act(async () => { fireEvent.click(toggle()); });
  expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
  expect(toggle()).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('button', { name: 'Runtime, AI Chief of Staff' })).toBeInTheDocument();
});

test('a change made by another admin shows up when Settings opens', async () => {
  apiClient.getRuntimeSetting.mockResolvedValue({ organization_id: 'org-a', runtime_enabled: false });
  await mount(<Host runtimeEnabled={true}><SidebarStandIn /><RuntimeAvailabilitySettings /></Host>);
  await waitFor(() => expect(toggle()).toHaveAttribute('aria-checked', 'false'));
  expect(screen.queryByRole('button', { name: 'Runtime, AI Chief of Staff' })).toBeNull();
});

test('the autonomy dial is reachable here with the company id, whether or not Runtime is on', async () => {
  const on = await mount(<Host runtimeEnabled={true}><RuntimeAvailabilitySettings /></Host>);
  expect(screen.getByTestId('dial')).toHaveAttribute('data-org', 'org-a');
  on.unmount();
  apiClient.getRuntimeSetting.mockResolvedValue({ organization_id: 'org-a', runtime_enabled: false });
  await mount(<Host runtimeEnabled={false}><RuntimeAvailabilitySettings /></Host>);
  expect(screen.getByTestId('dial')).toHaveAttribute('data-runtime-enabled', 'false');
});
