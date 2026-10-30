import React from 'react';
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import GetStartedCard from './GetStartedCard';
import { STEP_IDS } from '../shared/onboarding/registry';

const english = require('../shared/onboarding/onboarding-locales.json').en;
const lookup = (key, options = {}) => key.split('.').reduce((value, part) => value?.[part], english)?.replace(/{{(\w+)}}/g, (_, name) => options[name]) ?? key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: lookup, i18n: { language: 'en', dir: () => 'ltr', changeLanguage: jest.fn() } }) }));
jest.mock('../../../../i18n', () => ({ __esModule: true, SUPPORTED_LANGUAGES: [{ code: 'en', native: 'English' }, { code: 'de', native: 'Deutsch' }, { code: 'ar', native: 'العربية' }, { code: 'ja', native: '日本語' }] }));
jest.mock('../shared/onboarding/onboarding-i18n', () => ({ ONBOARDING_LANGUAGES: ['en', 'de', 'es', 'fr', 'hi', 'ja'] }));
jest.mock('../shared/agent-roster', () => ({ agentRoster: { peek: () => [] } }));
const mockState = { view: null, store: null, error: '' };
jest.mock('../shared/onboarding/onboarding-store', () => ({ useOnboarding: () => mockState }));

const view = (statuses = {}, extra = {}) => ({ version: 1, open: true, locale: null, surfaces: {}, steps: STEP_IDS.map(id => ({ id, status: statuses[id] || 'todo', ready: false })), proactive: { state: 'waiting', item: null }, ...extra });
function Where() { return <span data-testid="where">{useLocation().pathname}</span>; }
const mount = (props = {}, path = '/hivemind/app/employee/library-not') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={<><GetStartedCard userId="u" orgId="o" {...props} /><Where /></>} /></Routes></MemoryRouter>);

beforeEach(() => {
  mockState.view = view({ awaken: 'done' });
  mockState.store = { track: jest.fn(), milestone: jest.fn(), confirmLocale: jest.fn(), closeSurfaces: jest.fn() };
  mockState.error = '';
});

test('desktop card lists every registry step, starts at the language check and reports the view once', () => {
  mount();
  expect(screen.getAllByRole('listitem')).toHaveLength(9);
  expect(screen.getByText('Is this your language?')).toBeTruthy();
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
  expect(mockState.store.milestone).toHaveBeenCalledWith('company_awake');
  expect(mockState.store.track).toHaveBeenCalledWith('onb_step_view', 'language');
});

test('the language step confirms the chosen language through the shared language event', () => {
  const heard = jest.fn(); window.addEventListener('hivemind:ui-language', heard);
  mount();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'de' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(heard.mock.calls[0][0].detail).toEqual({ language: 'de' });
  window.removeEventListener('hivemind:ui-language', heard);
});

test('steps are skippable inline and open their place in the product', () => {
  mockState.view = view({ language: 'done', awaken: 'done', meet: 'done' });
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
  expect(mockState.store.track).toHaveBeenCalledWith('onb_step_skip', 'first_task');
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByTestId('where').textContent).toBe('/hivemind/app/employee');
});

test('awakening is server work: it can be left but not skipped', () => {
  mockState.view = view({ language: 'done' });
  mount();
  expect(screen.getByText(english.steps.awaken.body)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
});

test('meet opens employee creation when the team is empty', () => {
  mockState.view = view({ language: 'done', awaken: 'done' });
  const create = jest.fn(); window.addEventListener('hm:create-employee', create);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(create).toHaveBeenCalled();
  window.removeEventListener('hm:create-employee', create);
});

test('the proactive step shows Watching until a real item exists, then opens it and counts as opened', () => {
  const before = { language: 'done', awaken: 'done', meet: 'done', first_task: 'done', authority: 'done', connect_app: 'done', shared_brain: 'skipped', brief_team: 'done' };
  mockState.view = view(before, { proactive: { state: 'watching', item: null } });
  const first = mount();
  expect(screen.getByText(english.proactive.watching)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByTestId('where').textContent).toBe('/hivemind/app/employee/calendar');
  expect(mockState.store.milestone).not.toHaveBeenCalledWith('proactive_opened');
  first.unmount();
  mockState.view = view(before, { proactive: { state: 'ready', item: { dotId: 'dot_a', conversationId: 'conv_t', at: 1 } } });
  mockState.view.steps = mockState.view.steps.map(step => step.id === 'first_proactive' ? { ...step, ready: true } : step);
  mount();
  expect(screen.getByText(english.proactive.ready)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(mockState.store.milestone).toHaveBeenCalledWith('proactive_opened');
  expect(screen.getByTestId('where').textContent).toBe('/hivemind/app/employee/dots/dot_a');
});

test('folding the card is saved; in a chat room it starts folded; a finished walkthrough renders nothing', () => {
  const first = mount();
  fireEvent.click(screen.getByRole('button', { name: /Get started/ }));
  expect(mockState.store.track).toHaveBeenCalledWith('onb_dismiss');
  expect(screen.queryByRole('list')).toBeNull();
  first.unmount();
  const chat = mount({}, '/hivemind/app/employee/dots/dot_a');
  expect(screen.queryByRole('list')).toBeNull();
  chat.unmount();
  mockState.view = view(Object.fromEntries(STEP_IDS.map(id => [id, 'done'])));
  const { container } = mount();
  expect(container.querySelector('.hm-onb')).toBeNull();
});

test('without the server record the card stays hidden instead of showing progress it cannot save', () => {
  mockState.view = null;
  const { container } = mount();
  expect(container.querySelector('.hm-onb')).toBeNull();
  mockState.view = null;
  mount({ variant: 'home' });
  expect(screen.queryByRole('button', { name: /Get started/ })).toBeNull();
});

test('phone: a chip on the home screen opens the list as a bottom sheet; Escape returns focus to the chip', () => {
  mount({ variant: 'home' });
  const chip = screen.getByRole('button', { name: /Get started/ });
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(chip);
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(mockState.store.track).toHaveBeenCalledWith('onb_resume');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(chip);
});
