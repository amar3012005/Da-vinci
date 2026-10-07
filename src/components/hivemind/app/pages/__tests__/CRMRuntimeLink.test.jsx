import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const mockNavigate = jest.fn();
const mockOpenRuntime = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });
jest.mock('../../shared/openCompanyRuntime', () => ({ openCompanyRuntime: (...args) => mockOpenRuntime(...args) }));
jest.mock('../../shared/api-client', () => ({ controlPlane: {} }));
jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({}) }));
jest.mock('../CRMWorkspace', () => ({ CRMWorkspace: () => null }));
const { CRMRuntimeLink } = require('../YourCRM');

const previousActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;
beforeAll(() => { global.IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(() => { global.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });

let container;
let root;
beforeEach(() => {
  mockOpenRuntime.mockReset(); mockNavigate.mockReset();
  container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

test('Open Runtime invokes shared native entry rather than plain navigation', async () => {
  mockOpenRuntime.mockResolvedValue(undefined);
  await act(async () => root.render(<CRMRuntimeLink />));
  const link = container.querySelector('a');
  expect(link.textContent).toBe('Ask Runtime ↗');
  expect(link.getAttribute('href')).toBe('/hivemind/app/employee/harness');
  await act(async () => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
  expect(mockOpenRuntime).toHaveBeenCalledTimes(1);
  expect(mockOpenRuntime).toHaveBeenCalledWith(mockNavigate);
});

test('entry failures reach the existing CRM error surface', async () => {
  const onError = jest.fn();
  mockOpenRuntime.mockRejectedValue(new Error('Runtime is still loading.'));
  await act(async () => root.render(<CRMRuntimeLink onError={onError} />));
  await act(async () => container.querySelector('a').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  expect(onError).toHaveBeenCalledWith('Runtime could not be opened. Please try again.');
});
