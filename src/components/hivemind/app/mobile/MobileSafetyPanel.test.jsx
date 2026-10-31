import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
let mockPath = '/hivemind/app/library';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: mockPath }) }), { virtual: true });
jest.mock('../shared/native-app', () => ({ isNativeApp: () => true }));
jest.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' }, org: { id: 'o1' }, logout: jest.fn() }) }));
const mockGet = jest.fn();
jest.mock('../shared/api-client', () => ({ __esModule: true, default: { controlPlane: { get: (...a) => mockGet(...a), post: jest.fn() } } }));
import { NativeAiConsentGate, readCachedAiConsent } from './MobileSafetyPanel';
const KEY = 'hm:ai-consent:v1:u1:o1';
beforeEach(() => { localStorage.clear(); mockGet.mockReset(); });
afterEach(cleanup);
test('a cached positive answer renders the page at once and never shows the checking page', async () => {
  localStorage.setItem(KEY, 'granted');
  mockGet.mockReturnValue(new Promise(() => {}));
  render(<NativeAiConsentGate><p>Library page</p></NativeAiConsentGate>);
  expect(screen.getByText('Library page')).toBeInTheDocument();
  expect(screen.queryByText(/Checking your privacy choice/)).not.toBeInTheDocument();
});
test('the server answer caches consent for the next open', async () => {
  mockGet.mockResolvedValue({ data: { granted: true } });
  render(<NativeAiConsentGate><p>Library page</p></NativeAiConsentGate>);
  expect(screen.getByText(/Checking your privacy choice/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('Library page')).toBeInTheDocument());
  expect(readCachedAiConsent('u1', 'o1')).toBe(true);
});
test('the gate appears only when the server says consent is missing', async () => {
  localStorage.setItem(KEY, 'granted');
  mockGet.mockResolvedValue({ data: { granted: false, version: 1, disclosure: 'x' } });
  render(<NativeAiConsentGate><p>Library page</p></NativeAiConsentGate>);
  expect(screen.getByText('Library page')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('Before using AI')).toBeInTheDocument());
  expect(readCachedAiConsent('u1', 'o1')).toBe(false);
});
