import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RuntimeGetStarted, { readGettingStarted } from './RuntimeGetStarted';
const mockNavigate = jest.fn(); let mockPath = '/hivemind/app/employee/library'; // the card is hidden while Runtime or Dot chat owns the workspace
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useLocation: () => ({ pathname: mockPath }) }), { virtual: true });
jest.mock('../shared/api-client', () => ({ getConnectorConnectionStatus: jest.fn(async () => ({ connectors: [] })) }));
jest.mock('../shared/openCompanyRuntime', () => ({ openCompanyRuntime: jest.fn(async () => {}) }));
beforeEach(() => { localStorage.clear(); mockPath = '/hivemind/app/employee/library'; window.matchMedia = () => ({ matches: false }); });
it('renders three stages without claiming completion from a click', async () => {
  render(<RuntimeGetStarted scope="user:org" />);
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Wake up Runtime' }));
  expect(screen.getByRole('checkbox', { name: 'Wake up Runtime' }).getAttribute('aria-checked')).toBe('false');
  await act(async () => {});
});
it('uses saved evidence, preserves it across employee routes and isolates another workspace', async () => {
  const { unmount } = render(<RuntimeGetStarted scope="user:org" />);
  await act(async () => window.dispatchEvent(new CustomEvent('hivemind:runtime-get-started', { detail: { version: 1, rootSessionId: 'root', companyUnderstood: true, teamIntroduced: false, firstPlan: false } })));
  expect(readGettingStarted('user:org').companyUnderstood).toBe(true);
  unmount(); mockPath = '/hivemind/app/employee/team';
  const second = render(<RuntimeGetStarted scope="user:org" />);
  expect(screen.getByRole('checkbox', { name: 'Wake up Runtime' }).getAttribute('aria-checked')).toBe('true');
  expect(screen.getByRole('checkbox', { name: 'Meet your team' }).getAttribute('aria-checked')).toBe('false');
  second.unmount(); render(<RuntimeGetStarted scope="another:org" />);
  expect(screen.getByRole('checkbox', { name: 'Wake up Runtime' }).getAttribute('aria-checked')).toBe('false');
  await act(async () => {});
});
it('rejects stale identity messages and applies a fresh reset snapshot', async () => {
  render(<RuntimeGetStarted scope="user:org" />);
  const dispatch = detail => window.dispatchEvent(new CustomEvent('hivemind:runtime-get-started', { detail: { version: 1, rootSessionId: 'root', ...detail } }));
  await act(async () => dispatch({ scope: 'foreign:org', companyUnderstood: true }));
  expect(readGettingStarted('user:org').companyUnderstood).not.toBe(true);
  await act(async () => dispatch({ companyUnderstood: true }));
  await act(async () => dispatch({ companyUnderstood: false }));
  expect(readGettingStarted('user:org').companyUnderstood).toBe(false);
});

it('hides for preview and restores the same progress and expansion state', async () => {
  render(<RuntimeGetStarted scope="user:org" />);
  const aside = screen.getByLabelText('Get started with Runtime');
  const details = aside.querySelector('details');
  await act(async () => window.dispatchEvent(new CustomEvent('hivemind:preview-visibility',{detail:{open:true}})));
  expect(aside.hidden).toBe(true);
  expect(details.open).toBe(true);
  await act(async () => window.dispatchEvent(new CustomEvent('hivemind:preview-visibility',{detail:{open:false}})));
  expect(aside.hidden).toBe(false);
  expect(details.open).toBe(true);
});

it('stays hidden while Runtime or Dot chat owns the workspace', () => {
  mockPath = '/hivemind/app/employee/harness';
  const { unmount } = render(<RuntimeGetStarted scope="user:org" />);
  expect(screen.getByLabelText('Get started with Runtime', { selector: 'aside' }).hidden).toBe(true);
  unmount(); mockPath = '/hivemind/app/employee/dots/dot-a';
  render(<RuntimeGetStarted scope="user:org" />);
  expect(screen.getByLabelText('Get started with Runtime', { selector: 'aside' }).hidden).toBe(true);
});
