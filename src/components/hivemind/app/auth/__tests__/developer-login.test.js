import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../LoginPage';
import apiClient from '../../shared/api-client';
import { useAuth } from '../AuthProvider';
let mockSearch = '';
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn(), useLocation: () => ({ search: mockSearch, pathname: '/hivemind/login' }) }));
jest.mock('../AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../../../../mobile/HeroCtas', () => () => null);
jest.mock('../../shared/api-client', () => ({ __esModule: true, default: {
  controlPlane: { defaults: { baseURL: 'https://api.example.test' } },
  getEmailIdentityConfig: jest.fn(), getProductExperience: jest.fn(), startEmailSignIn: jest.fn(),
} }));
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ mode: 'brain', publicSignup: false }) });
  sessionStorage.clear(); localStorage.clear();
  useAuth.mockReturnValue({ isAuthenticated: false, loading: false, login: jest.fn(), refresh: jest.fn() });
  apiClient.getEmailIdentityConfig.mockResolvedValue({ enabled: true, mode: 'primary', email_only: false });
  apiClient.startEmailSignIn.mockResolvedValue({ challenge_id: 'challenge', resend_after_seconds: 30 });
  apiClient.getProductExperience.mockResolvedValue({});
});
test('developer sees email and Google; email sends the CLI return without purchase or company setup', async () => {
  const target = 'https://api.example.test/auth/developer/cli/start?state=fixture';
  mockSearch = `?account=developer&cli_return_to=${encodeURIComponent(target)}`;
  render(<LoginPage />);
  await screen.findByRole('button', { name: /Continue with Email/i });
  expect(screen.getByRole('heading', { name: 'ICARUS developer account' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Create your HIVEMIND' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));
  expect(useAuth().login).toHaveBeenCalledWith({ provider: 'google', returnTo: target });
  fireEvent.click(screen.getByRole('button', { name: /Continue with Email/i }));
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'dev@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: /Send sign-in code/i }));
  await waitFor(() => expect(apiClient.startEmailSignIn).toHaveBeenCalledWith(expect.objectContaining({ email: 'dev@example.test', returnTo: target, intent: 'login' })));
});
test('ordinary customer login retains customer creation entrypoint', async () => {
  mockSearch = '';
  render(<LoginPage />);
  await screen.findByRole('button', { name: /Continue with Email/i });
  expect(screen.getByRole('button', { name: 'Create your HIVEMIND' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'ICARUS developer account' })).toBeNull();
});
