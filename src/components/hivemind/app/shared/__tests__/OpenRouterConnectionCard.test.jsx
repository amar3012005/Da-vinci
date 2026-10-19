import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OpenRouterConnectionCard from '../OpenRouterConnectionCard';
jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ org: { id: 'org-1', name: 'Test company' }, user: { id: 'user-1' } }) }));
const reply = value => Promise.resolve({ ok: true, json: async () => value });
afterEach(() => { jest.restoreAllMocks(); window.history.replaceState(null, '', '/'); });
test('OAuth callback exchanges once even under StrictMode and cleans URL', async () => {
  window.history.replaceState(null, '', '/hivemind/app/usage?model_connection=openrouter&code=test-code&state=test-state');
  global.fetch = jest.fn((url) => url.endsWith('/callback') ? reply({ connected: true }) : reply({ available: true, connected: true, selected_model: null }));
  render(<React.StrictMode><OpenRouterConnectionCard/></React.StrictMode>);
  await screen.findByText('Use free models');
  expect(global.fetch.mock.calls.filter(([url]) => url.endsWith('/callback'))).toHaveLength(1);
  expect(window.location.search).toBe('');
  expect(global.fetch.mock.calls.some(([url]) => url.endsWith('/select'))).toBe(false);
  fireEvent.click(screen.getByText('Use free models'));
  await waitFor(() => expect(global.fetch.mock.calls.some(([url, options]) => url.endsWith('/select') && JSON.parse(options.body).mode === 'free')).toBe(true));
});
test('requires explicit cloud execution consent before sign-in', async () => {
  global.fetch = jest.fn(() => reply({ available: true, connected: false }));
  render(<OpenRouterConnectionCard/>);
  const connect = await screen.findByText('Connect OpenRouter');
  expect(connect.disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(connect.disabled).toBe(false);
});
