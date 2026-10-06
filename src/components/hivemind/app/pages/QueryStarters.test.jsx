/* eslint-disable testing-library/no-unnecessary-act -- Uses React DOM createRoot, not Testing Library. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import QueryStarters from './QueryStarters';
import apiClient from '../shared/api-client';

jest.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-one' }, org: { id: 'org-one' } }) }));
const mockTranslate = (key, fallback, values) => Object.entries(values || {}).reduce((text, [name, value]) => text.replace(`{{${name}}}`, value), fallback);
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockTranslate, i18n: { language: 'en' } }) }));
jest.mock('../shared/api-client', () => ({ listMemories: jest.fn(), hivemindTriggers: jest.fn() }));
jest.mock('../shared/connectors-catalog', () => ({ BRAND_LOGOS: {} }));
let host, root, mount, editor, seat, dock, frames, mobile;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  mobile = true; frames = [];
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length; });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  window.matchMedia = jest.fn(query => ({ matches: query.includes('600px') ? mobile : true }));
  window.history.replaceState({}, '', '/hivemind/app/overview/new');
  apiClient.listMemories.mockResolvedValue([]); apiClient.hivemindTriggers.mockResolvedValue({ suggestions: [] });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ profiles: [] }) });
  mount = document.createElement('div');
  mount.innerHTML = '<div data-phase="hero"><div data-mobile-brain-suggestions></div><div data-composer-seat><div data-composer-input contenteditable="true"></div></div></div>';
  document.body.appendChild(mount);
  editor = mount.querySelector('[data-composer-input]'); seat = mount.querySelector('[data-composer-seat]'); dock = mount.querySelector('[data-mobile-brain-suggestions]');
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  window.__HIVEMIND_SEND_PROMPT__ = jest.fn().mockResolvedValue(true);
  window.__HIVEMIND_SELECT_AGENT__ = jest.fn().mockResolvedValue(true);
});
afterEach(() => {
  act(() => root.unmount()); host.remove(); mount.remove();
  delete window.__HIVEMIND_SEND_PROMPT__; delete window.__HIVEMIND_SELECT_AGENT__;
  jest.restoreAllMocks(); jest.clearAllMocks();
});
async function show() {
  await act(async () => root.render(<QueryStarters mount={mount} ready />));
  await act(async () => { frames.splice(0).forEach(frame => frame()); });
}
test('mobile suggestions mount inside greeting dock and one click sends without replacing a draft', async () => {
  editor.textContent = 'My unfinished question';
  await show();
  expect(dock.querySelector('.hm-query-starters-mobile')).not.toBeNull();
  expect(seat.querySelector('.hm-query-starters')).toBeNull();
  await act(async () => dock.querySelector('button').click());
  expect(window.__HIVEMIND_SEND_PROMPT__).toHaveBeenCalledWith(expect.any(String));
  expect(editor.textContent).toBe('My unfinished question');
  expect(window.__HIVEMIND_SELECT_AGENT__).toHaveBeenCalledWith(null);
});
test('mobile context suggestions never auto-type into composer', async () => {
  apiClient.listMemories.mockResolvedValue([{ id: 'memory-one', title: 'A company project', updated_at: '2026-10-06T12:00:00Z' }]);
  const paste = jest.fn(); editor.addEventListener('paste', paste);
  await show();
  expect(dock.textContent).toContain('A company project');
  expect(editor.textContent).toBe(''); expect(paste).not.toHaveBeenCalled();
});
test('mobile missing send bridge reports failure without changing or sending a draft', async () => {
  delete window.__HIVEMIND_SEND_PROMPT__; editor.textContent = 'Keep this';
  await show();
  await act(async () => dock.querySelector('button').click());
  expect(dock.querySelector('[role="alert"]').textContent).toContain('Could not start');
  expect(editor.textContent).toBe('Keep this');
});
test('pending mobile send prevents repeated taps and rejection is visible', async () => {
  let reject;
  window.__HIVEMIND_SEND_PROMPT__.mockImplementation(() => new Promise((resolve, fail) => { reject = fail; }));
  await show();
  await act(async () => { dock.querySelector('button').click(); dock.querySelector('button').click(); });
  expect(window.__HIVEMIND_SEND_PROMPT__).toHaveBeenCalledTimes(1);
  expect(dock.querySelector('button').disabled).toBe(true);
  await act(async () => reject(new Error('disconnected')));
  expect(dock.querySelector('[role="alert"]')).not.toBeNull();
  expect(dock.querySelector('button').disabled).toBe(false);
});
test('desktop retains composer-seat presentation and fill-only interaction', async () => {
  mobile = false;
  global.DataTransfer = class { setData() {} };
  global.ClipboardEvent = class extends Event {};
  const paste = jest.fn(); editor.addEventListener('paste', paste);
  await show();
  expect(seat.querySelector('.hm-query-starters')).not.toBeNull();
  expect(dock.querySelector('.hm-query-starters')).toBeNull();
  await act(async () => seat.querySelector('button').click());
  await act(async () => frames.splice(0).forEach(frame => frame()));
  expect(window.__HIVEMIND_SELECT_AGENT__).toHaveBeenCalledWith(null);
  expect(paste).toHaveBeenCalledTimes(1);
  expect(window.__HIVEMIND_SEND_PROMPT__).not.toHaveBeenCalled();
});


test('mobile recipient selection failure prevents native send and preserves draft', async () => {
  editor.textContent = 'Keep my work'; window.__HIVEMIND_SELECT_AGENT__.mockResolvedValue(false);
  await show();
  await act(async () => dock.querySelector('button').click());
  expect(window.__HIVEMIND_SEND_PROMPT__).not.toHaveBeenCalled();
  expect(dock.querySelector('[role="alert"]')).not.toBeNull();
  expect(editor.textContent).toBe('Keep my work');
});

test('mobile agent suggestion selects its scoped recipient before sending', async () => {
  apiClient.listMemories.mockResolvedValue([{ id: 'memory-one', title: 'A company project', updated_at: '2026-10-06T12:00:00Z' }]);
  fetch.mockResolvedValue({ ok: true, json: async () => ({ profiles: [{ id: 'researcher-one', name: 'Ravi', role: 'Researcher' }] }) });
  await show();
  const choice = [...dock.querySelectorAll('button')].find(button => button.textContent.includes('Ravi'));
  await act(async () => choice.click());
  expect(window.__HIVEMIND_SELECT_AGENT__).toHaveBeenCalledWith('researcher-one');
  expect(window.__HIVEMIND_SELECT_AGENT__.mock.invocationCallOrder[0]).toBeLessThan(window.__HIVEMIND_SEND_PROMPT__.mock.invocationCallOrder[0]);
  expect(window.__HIVEMIND_SEND_PROMPT__).toHaveBeenCalledWith(expect.stringContaining('Research “A company project”'));
});
