import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../auth/AuthProvider', () => {
  const React = require('react');
  const Context = React.createContext(null);
  return { __esModule: true, AuthTestContext: Context, useAuth: () => React.useContext(Context) };
});
jest.mock('../../shared/api-client', () => ({ __esModule: true, default: { getLanguageSetting: jest.fn(), setLanguageSetting: jest.fn() } }));

import OrgLanguageSettings from '../OrgLanguageSettings';
import apiClient from '../../shared/api-client';
const { AuthTestContext } = require('../../auth/AuthProvider');

const Host = ({ role = 'admin', children }) => <AuthTestContext.Provider value={{ user: { id: 'u', role }, org: { id: 'org-a' } }}>{children}</AuthTestContext.Provider>;
const mount = async ui => { let view; await act(async () => { view = render(ui); }); return view; };
const select = () => screen.getByRole('combobox', { name: 'Team default language' });

beforeEach(() => {
  apiClient.getLanguageSetting.mockReset().mockResolvedValue({ organization_id: 'org-a', default_locale: null, supported: ['en', 'de', 'hi', 'ja', 'ar'] });
  apiClient.setLanguageSetting.mockReset();
});

test('an admin sees the stored default, with each language in its own name', async () => {
  apiClient.getLanguageSetting.mockResolvedValue({ organization_id: 'org-a', default_locale: 'de', supported: ['en', 'de', 'hi', 'ja', 'ar'] });
  await mount(<Host><OrgLanguageSettings /></Host>);
  await waitFor(() => expect(select()).toHaveValue('de'));
  expect(apiClient.getLanguageSetting).toHaveBeenCalledWith('org-a');
  expect(screen.getByRole('option', { name: 'Deutsch' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'العربية' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Not set (English)' })).toBeInTheDocument();
});

test('members see nothing and nothing is read', async () => {
  const { container } = await mount(<Host role="member"><OrgLanguageSettings /></Host>);
  expect(container).toBeEmptyDOMElement();
  expect(apiClient.getLanguageSetting).not.toHaveBeenCalled();
});

test('choosing a language saves it to Control; choosing "not set" clears it', async () => {
  apiClient.setLanguageSetting.mockImplementation(async (_org, locale) => ({ organization_id: 'org-a', default_locale: locale, changed: true }));
  await mount(<Host><OrgLanguageSettings /></Host>);
  await act(async () => { fireEvent.change(select(), { target: { value: 'ja' } }); });
  expect(apiClient.setLanguageSetting).toHaveBeenLastCalledWith('org-a', 'ja');
  expect(select()).toHaveValue('ja');
  expect(screen.getByRole('status')).toHaveTextContent('Saved');
  await act(async () => { fireEvent.change(select(), { target: { value: '' } }); });
  expect(apiClient.setLanguageSetting).toHaveBeenLastCalledWith('org-a', null);
  expect(select()).toHaveValue('');
});

test('a failed save goes back to the previous value and says so', async () => {
  apiClient.getLanguageSetting.mockResolvedValue({ organization_id: 'org-a', default_locale: 'hi', supported: ['en', 'de', 'hi', 'ja', 'ar'] });
  apiClient.setLanguageSetting.mockRejectedValue(new Error('403'));
  await mount(<Host><OrgLanguageSettings /></Host>);
  await waitFor(() => expect(select()).toHaveValue('hi'));
  await act(async () => { fireEvent.change(select(), { target: { value: 'de' } }); });
  expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
  expect(select()).toHaveValue('hi');
});
