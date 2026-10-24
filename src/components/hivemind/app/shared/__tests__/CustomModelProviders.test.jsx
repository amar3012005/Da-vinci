import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CustomModelProviders from '../CustomModelProviders';

jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ org: { id: 'org-a', name: 'Sakana' }, user: { id: 'user-a' } }) }));
jest.mock('../api-client', () => ({
  __esModule: true,
  default: {
    listCustomProviders: jest.fn(),
    saveCustomProvider: jest.fn(),
    deleteCustomProvider: jest.fn(),
    testCustomProvider: jest.fn(),
  },
}));

const api = require('../api-client').default;
const SECRET = 'sk-live-secret-value-9876';
const provider = {
  id: 'custom-0123456789abcdef',
  name: 'Acme Gateway',
  baseUrl: 'https://api.acme.example/v1',
  protocol: 'openai-chat-completions',
  models: [
    { id: 'acme-large' },
    { id: 'acme-think', reasoningEfforts: { off: null, low: 'low', high: 'high' }, defaultReasoningEffort: 'low' },
  ],
  keyConfigured: true,
  createdAt: 1793000000000,
  updatedAt: 1793000000000,
};

beforeEach(() => {
  jest.clearAllMocks();
  api.listCustomProviders.mockResolvedValue({ providers: [provider] });
});

function fillValidDraft() {
  fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Acme Gateway' } });
  fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'https://api.acme.example/v1' } });
  fireEvent.change(screen.getByLabelText('API key'), { target: { value: SECRET } });
  fireEvent.change(screen.getByLabelText('Model 1 id'), { target: { value: 'acme-large' } });
}

async function openAddForm() {
  fireEvent.click(await screen.findByRole('button', { name: 'Add custom provider' }));
}

test('add form reports every client validation error and sends nothing', async () => {
  api.listCustomProviders.mockResolvedValue({ providers: [] });
  render(<CustomModelProviders/>);
  await openAddForm();
  fireEvent.click(screen.getByRole('button', { name: 'Save provider' }));

  expect(await screen.findByText('Enter a display name.')).toBeTruthy();
  expect(screen.getByText('Enter a full base URL that starts with https://.')).toBeTruthy();
  expect(screen.getByText('Enter the API key.')).toBeTruthy();
  expect(screen.getByText('Add at least one model.')).toBeTruthy();
  expect(api.saveCustomProvider).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'http://api.acme.example/v1' } });
  fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'short' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save provider' }));
  expect(await screen.findByText('The base URL must use https://.')).toBeTruthy();
  expect(screen.getByText('Use 8 to 4096 printable characters with no spaces.')).toBeTruthy();
  expect(api.saveCustomProvider).not.toHaveBeenCalled();
});

test('add form rejects names already in use, credentials in the URL and repeated model ids', async () => {
  api.listCustomProviders.mockResolvedValue({ providers: [provider] });
  render(<CustomModelProviders/>);
  await openAddForm();
  fillValidDraft();
  fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'acme gateway' } });
  fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'https://user:pass@api.acme.example/v1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add model' }));
  fireEvent.change(screen.getByLabelText('Model 2 id'), { target: { value: 'acme-large' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save provider' }));

  expect(await screen.findByText('A provider with this name already exists. Edit it instead.')).toBeTruthy();
  expect(screen.getByText('Remove the username and password from the base URL.')).toBeTruthy();
  expect(screen.getByText('The model "acme-large" is listed more than once.')).toBeTruthy();
  expect(api.saveCustomProvider).not.toHaveBeenCalled();
});

test('saving a valid draft maps reasoning levels to the wire format and shows the server message on failure', async () => {
  api.listCustomProviders.mockResolvedValue({ providers: [] });
  api.saveCustomProvider.mockRejectedValueOnce(Object.assign(new Error('bad'), { response: { status: 400, data: { error: 'base_url_invalid', message: 'Host resolves to a private address.' } } }));
  render(<CustomModelProviders/>);
  await openAddForm();
  fillValidDraft();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Low' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save provider' }));

  expect(await screen.findByText('Host resolves to a private address.')).toBeTruthy();
  expect(api.saveCustomProvider).toHaveBeenCalledWith({
    name: 'Acme Gateway',
    baseUrl: 'https://api.acme.example/v1',
    protocol: 'openai-chat-completions',
    models: [{ id: 'acme-large', reasoningEfforts: { low: 'low' }, defaultReasoningEffort: 'low' }],
    apiKey: SECRET,
  });

  api.saveCustomProvider.mockResolvedValueOnce({ provider: { ...provider, id: 'custom-0123456789abcdef' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save provider' }));
  expect(await screen.findByText('Saved Acme Gateway.')).toBeTruthy();
});

test('Anthropic protocol sends thinking budgets and "None" becomes off with a null value', async () => {
  api.listCustomProviders.mockResolvedValue({ providers: [] });
  api.saveCustomProvider.mockResolvedValue({ provider });
  render(<CustomModelProviders/>);
  await openAddForm();
  fillValidDraft();
  fireEvent.change(screen.getByLabelText('Protocol'), { target: { value: 'anthropic-messages' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'None' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'High' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save provider' }));

  await waitFor(() => expect(api.saveCustomProvider).toHaveBeenCalledTimes(1));
  const payload = api.saveCustomProvider.mock.calls[0][0];
  expect(payload.models[0].reasoningEfforts).toEqual({ off: null, high: 16384 });
  expect(payload.models[0].defaultReasoningEffort).toBe('off');
});

test('list shows name, host, model count and key status but never a key value', async () => {
  render(<CustomModelProviders/>);
  expect(await screen.findByText('Acme Gateway')).toBeTruthy();
  expect(screen.getByText('OpenAI Chat Completions · api.acme.example · 2 models · Key saved')).toBeTruthy();
  expect(document.body.textContent).not.toContain('https://api.acme.example/v1');
  expect(document.body.innerHTML).not.toMatch(/sk-|apiKey/);
  expect(document.querySelectorAll('input[value]').length).toBe(0);
});

test('editing starts with a blank write-only key and keeps the stored key when left blank', async () => {
  render(<CustomModelProviders/>);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Acme Gateway' }));
  const keyField = screen.getByLabelText('API key');
  expect(keyField.type).toBe('password');
  expect(keyField.value).toBe('');
  expect(keyField.placeholder).toBe('Leave blank to keep the saved key');

  fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Acme Renamed' } });
  api.saveCustomProvider.mockResolvedValue({ provider: { ...provider, name: 'Acme Renamed' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save provider' }));

  await waitFor(() => expect(api.saveCustomProvider).toHaveBeenCalledTimes(1));
  const payload = api.saveCustomProvider.mock.calls[0][0];
  expect(payload).not.toHaveProperty('apiKey');
  expect(payload.id).toBe(provider.id);
  expect(payload.models).toEqual([
    { id: 'acme-large' },
    { id: 'acme-think', reasoningEfforts: { off: null, low: 'low', high: 'high' }, defaultReasoningEffort: 'low' },
  ]);
});

test('disabled state: when the feature is off, the card explains it and offers no add or save action', async () => {
  for (const status of [404, 503]) {
    api.listCustomProviders.mockRejectedValueOnce(Object.assign(new Error('off'), { response: { status, data: {} } }));
    const view = render(<CustomModelProviders/>);
    expect(await screen.findByText('Not enabled for this workspace')).toBeTruthy();
    expect(screen.getByText('Custom model providers are not enabled for this workspace yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add custom provider' })).toBeNull();
    expect(screen.queryByRole('list', { name: 'Saved custom providers' })).toBeNull();
    view.unmount();
  }
});

test('a feature-off response while saving closes the form and switches to the disabled state', async () => {
  api.listCustomProviders.mockResolvedValue({ providers: [] });
  api.saveCustomProvider.mockRejectedValueOnce(Object.assign(new Error('off'), { response: { status: 503, data: { error: 'custom_providers_unavailable' } } }));
  render(<CustomModelProviders/>);
  await openAddForm();
  fillValidDraft();
  fireEvent.click(screen.getByRole('button', { name: 'Save provider' }));
  expect(await screen.findByText('Not enabled for this workspace')).toBeTruthy();
  expect(screen.queryByRole('form', { name: 'Add custom provider' })).toBeNull();
});

test('test connection on a saved provider reports the endpoint result without sending a key', async () => {
  api.testCustomProvider.mockResolvedValueOnce({ ok: true, models: [{ id: 'acme-large' }, { id: 'acme-small' }] });
  render(<CustomModelProviders/>);
  fireEvent.click(await screen.findByRole('button', { name: 'Test connection to Acme Gateway' }));
  expect(await screen.findByText('Connected. 2 models listed.')).toBeTruthy();
  expect(api.testCustomProvider).toHaveBeenCalledWith({}, provider.id);

  api.testCustomProvider.mockResolvedValueOnce({ ok: false, error: 'endpoint_status', status: 401 });
  fireEvent.click(screen.getByRole('button', { name: 'Test connection to Acme Gateway' }));
  expect(await screen.findByText('The endpoint returned an error. HTTP 401.')).toBeTruthy();
});

test('delete asks for confirmation before calling the API', async () => {
  api.deleteCustomProvider.mockResolvedValue({ deleted: true });
  render(<CustomModelProviders/>);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Acme Gateway' }));
  expect(screen.getByText('Delete Acme Gateway? Its models will stop appearing in the composer.')).toBeTruthy();
  expect(api.deleteCustomProvider).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  expect(await screen.findByText('Deleted Acme Gateway.')).toBeTruthy();
  expect(api.deleteCustomProvider).toHaveBeenCalledWith(provider.id);
  expect(screen.queryByRole('button', { name: 'Edit Acme Gateway' })).toBeNull();
});

test('fetch available models uses the typed draft and offers each id as an add action', async () => {
  api.listCustomProviders.mockResolvedValue({ providers: [] });
  api.testCustomProvider.mockResolvedValue({ ok: true, models: [{ id: 'listed-model' }] });
  render(<CustomModelProviders/>);
  await openAddForm();
  fillValidDraft();
  fireEvent.click(screen.getByRole('button', { name: 'Fetch available models' }));

  expect(await screen.findByText('Connected. 1 model listed.')).toBeTruthy();
  expect(api.testCustomProvider).toHaveBeenCalledWith({
    baseUrl: 'https://api.acme.example/v1',
    protocol: 'openai-chat-completions',
    apiKey: SECRET,
  }, undefined);
  fireEvent.click(screen.getByRole('button', { name: 'Add listed-model' }));
  expect(screen.getByLabelText('Model 1 id').value).toBe('acme-large');
  expect(screen.getByLabelText('Model 2 id').value).toBe('listed-model');
});
