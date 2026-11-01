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
jest.mock('../shared/onboarding/onboarding-i18n', () => ({ ONBOARDING_LANGUAGES: ['en', 'de', 'es', 'fr', 'hi', 'ja', 'ar'] }));
jest.mock('../shared/agent-roster', () => ({ agentRoster: { peek: () => [] } }));
const mockState = { view: null, store: null, error: '' };
jest.mock('../shared/onboarding/onboarding-store', () => ({ useOnboarding: () => mockState }));

const view = (statuses = {}, extra = {}) => ({ version: 1, open: true, locale: null, surfaces: {}, steps: STEP_IDS.map(id => ({ id, status: statuses[id] || 'todo', ready: false })), proactive: { state: 'waiting', item: null }, ...extra });
function Where() { return <span data-testid="where">{useLocation().pathname}</span>; }
const mount = (props = {}, path = '/hivemind/app/crm') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={<><GetStartedCard userId="u" orgId="o" {...props} /><Where /></>} /></Routes></MemoryRouter>);

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

test('the language list offers Arabic and tags machine-translated languages Beta, English untagged', () => {
  mount();
  const options = Object.fromEntries(screen.getAllByRole('option').map(option => [option.value, option.textContent]));
  expect(options).toEqual({ en: 'English', de: 'Deutsch (Beta)', ar: 'العربية (Beta)', ja: '日本語 (Beta)' });
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

test('a floating card that would cover a text field steps aside, and comes back when it no longer would', () => {
  const box = (left, top, width, height) => () => ({ left, top, width, height, right: left + width, bottom: top + height });
  const composer = document.createElement('textarea');
  composer.getBoundingClientRect = box(0, 700, 800, 60);
  document.body.appendChild(composer);
  const original = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function rect() { return this.classList?.contains('hm-onb') ? box(16, 650, 272, 120)() : original.call(this); };
  try {
    const { container } = mount();
    expect(container.querySelector('.hm-onb').hasAttribute('data-blocking')).toBe(true);
    composer.getBoundingClientRect = box(0, 0, 0, 0);
    fireEvent(window, new Event('resize'));
    expect(container.querySelector('.hm-onb').hasAttribute('data-blocking')).toBe(false);
  } finally { HTMLElement.prototype.getBoundingClientRect = original; composer.remove(); }
});

test('in a room the card starts folded even when the sidebar chip is missing', () => {
  mount({}, '/hivemind/app/employee/976c0a88-8c22-4ea9-9638-d3296db486da');
  expect(screen.queryByRole('list')).toBeNull();
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

describe('accessibility', () => {
  test('the toggle names the panel it controls and reports its state', () => {
    mount();
    const toggle = screen.getByRole('button', { name: /Get started/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    expect(panel).toBeTruthy();
    expect(panel.hidden).toBe(false);
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(toggle.getAttribute('aria-controls')).hidden).toBe(true);
  });

  test('Escape folds the open card from inside it and returns focus to the toggle', () => {
    mount();
    const toggle = screen.getByRole('button', { name: /Get started/ });
    const inside = screen.getByRole('button', { name: 'Continue' });
    inside.focus();
    fireEvent.keyDown(inside, { key: 'Escape' });
    expect(mockState.store.track).toHaveBeenCalledWith('onb_dismiss');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  test('a finished step is announced in a polite live region with the new count', () => {
    const { rerender } = mount();
    const live = () => document.querySelector('.hm-onb [role="status"][aria-live="polite"]');
    expect(live().textContent).toBe('');
    mockState.view = view({ awaken: 'done', language: 'done' });
    rerender(<MemoryRouter initialEntries={['/hivemind/app/crm']}><Routes><Route path="*" element={<><GetStartedCard userId="u" orgId="o" /><Where /></>} /></Routes></MemoryRouter>);
    expect(live().textContent).toBe(`${english.steps.language.title}, ${english.done}. ${english.progress.replace('{{count}}', '2').replace('{{total}}', '9')}`);
  });

  test('the step list marks the current step, hides decorative marks and names finished steps for screen readers', () => {
    mockState.view = view({ awaken: 'done', language: 'done' });
    mount();
    const current = document.querySelector('li[aria-current="step"]');
    expect(current.getAttribute('data-step')).toBe('meet');
    expect(document.querySelectorAll('.hm-onb-check[aria-hidden="true"]')).toHaveLength(9);
    expect(document.querySelectorAll('li[data-complete] .sr-only')).toHaveLength(2);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBeTruthy();
  });

  test('skipping the focused step moves focus to the next step instead of dropping it', () => {
    mockState.view = view({ language: 'done', awaken: 'done', meet: 'done' });
    const { rerender } = mount();
    const skip = screen.getByRole('button', { name: 'Skip for now' });
    skip.focus();
    skip.blur(); // the button leaves the page, so focus falls back to the body
    mockState.view = view({ language: 'done', awaken: 'done', meet: 'done', first_task: 'skipped' });
    rerender(<MemoryRouter initialEntries={['/hivemind/app/crm']}><Routes><Route path="*" element={<><GetStartedCard userId="u" orgId="o" /><Where /></>} /></Routes></MemoryRouter>);
    expect(document.activeElement).toBe(document.querySelector('li[data-active] .hm-onb-primary'));
  });

  test('the phone sheet is modal: Tab cycles inside it, Escape closes it', () => {
    mount({ variant: 'home' });
    fireEvent.click(screen.getByRole('button', { name: /Get started/ }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const buttons = [...dialog.querySelectorAll('button, select')];
    const last = buttons[buttons.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('every control has a visible focus ring and animation stops for reduced motion', () => {
    const css = require('fs').readFileSync(require('path').join(__dirname, 'GetStartedCard.css'), 'utf8');
    expect(css).toMatch(/\.hm-onb-summary:focus-visible[^{]*\{[^}]*outline:2px solid/);
    expect(css).toMatch(/prefers-reduced-motion:reduce\)[^}]*animation:none/);
  });
});

test('the team checklist shows only for a team; a Brain-only company sees no team card', () => {
  mockState.view = view({}, { tier: 'brain_only' });
  const brainOnly = mount();
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  brainOnly.unmount();
  mockState.view = view({}, { tier: 'team' });
  mount();
  expect(screen.getAllByRole('listitem')).toHaveLength(9);
});
