import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import apiClient from '../../shared/api-client';
import HarnessChatSurface, {
  AUTH_ERROR_EVENT,
  BOOTSTRAP_EVENT,
  CONNECTED_EVENT,
  HARNESS_ORIGIN,
  MESSAGE_VERSION,
  READY_EVENT,
  validBootstrap,
} from '../HarnessChatSurface';

jest.mock('../../shared/api-client', () => ({
  __esModule: true,
  default: { controlPlane: { post: jest.fn() } },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key, fallback) => fallback }),
}));

const bootstrap = (mode, ticket) => ({
  data: {
    mode,
    embed_url: 'https://chat.singulancelabs.com/',
    ...(ticket ? { ticket } : {}),
    flag_receipt: { key: 'harness_chat', variation: mode },
  },
});

let container;
let root;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<HarnessChatSurface legacy={<div>Classic Overview chat</div>} />);
  });
  await settle();
}

function button(label) {
  return [...container.querySelectorAll('button')].find((item) => item.textContent.trim() === label);
}

async function click(element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await settle();
}

async function postHarnessMessage(iframe, data, origin = HARNESS_ORIGIN, source = iframe.contentWindow) {
  await act(async () => {
    window.dispatchEvent(new MessageEvent('message', { origin, source, data }));
  });
}

beforeEach(() => {
  apiClient.controlPlane.post.mockReset();
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  container = null;
  root = null;
  jest.restoreAllMocks();
});

test('legacy mode and bootstrap failure preserve the current Overview chat', async () => {
  apiClient.controlPlane.post.mockResolvedValueOnce(bootstrap('legacy'));
  await mount();

  expect(container.textContent).toContain('Classic Overview chat');
  expect(container.querySelector('iframe')).toBeNull();
  expect(apiClient.controlPlane.post).toHaveBeenCalledWith('/v1/harness-chat/bootstrap', {});

  await act(async () => root.unmount());
  root = null;
  container.remove();
  apiClient.controlPlane.post.mockReset();
  apiClient.controlPlane.post.mockRejectedValueOnce(new Error('Network unavailable'));
  await mount();

  expect(container.textContent).toContain('Classic Overview chat');
  expect(container.textContent).toContain('Network unavailable');
  expect(button('Retry')).toBeTruthy();
  expect(container.querySelector('iframe')).toBeNull();
});

test('preview re-bootstraps and sends its ticket once after a source-pinned ready event', async () => {
  apiClient.controlPlane.post
    .mockResolvedValueOnce(bootstrap('preview', 'discarded-initial-ticket'))
    .mockResolvedValueOnce(bootstrap('preview', 'one-time-ticket'));
  await mount();

  expect(apiClient.controlPlane.post).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain('Classic Overview chat');
  await click(button('Try preview'));
  expect(apiClient.controlPlane.post).toHaveBeenCalledTimes(2);

  const iframe = container.querySelector('iframe');
  expect(iframe).toBeTruthy();
  expect(iframe.getAttribute('src')).toBe('https://chat.singulancelabs.com/');
  expect(iframe.getAttribute('src')).not.toContain('one-time-ticket');
  const targetPostMessage = jest.spyOn(iframe.contentWindow, 'postMessage');

  const ready = { type: READY_EVENT, version: MESSAGE_VERSION, request_id: 'request-1' };
  await postHarnessMessage(iframe, ready, 'https://evil.example');
  await postHarnessMessage(iframe, ready, HARNESS_ORIGIN, window);
  expect(targetPostMessage).not.toHaveBeenCalled();

  await postHarnessMessage(iframe, ready);
  expect(targetPostMessage).toHaveBeenCalledWith({
    type: BOOTSTRAP_EVENT,
    version: MESSAGE_VERSION,
    request_id: 'request-1',
    ticket: 'one-time-ticket',
  }, HARNESS_ORIGIN);
  await postHarnessMessage(iframe, ready);
  expect(targetPostMessage).toHaveBeenCalledTimes(1);

  await postHarnessMessage(iframe, {
    type: CONNECTED_EVENT,
    version: MESSAGE_VERSION,
    request_id: 'wrong-request',
  });
  expect(container.textContent).not.toContain('Connected');
  await postHarnessMessage(iframe, {
    type: CONNECTED_EVENT,
    version: MESSAGE_VERSION,
    request_id: 'request-1',
  });
  expect(container.textContent).toContain('Connected');
  expect(button('Classic chat')).toBeTruthy();
});

test('authentication failure offers a fresh bootstrap and reconnect', async () => {
  apiClient.controlPlane.post
    .mockResolvedValueOnce(bootstrap('harness', 'first-ticket'))
    .mockResolvedValueOnce(bootstrap('harness', 'replacement-ticket'));
  await mount();

  const firstFrame = container.querySelector('iframe');
  const firstPostMessage = jest.spyOn(firstFrame.contentWindow, 'postMessage');
  await postHarnessMessage(firstFrame, {
    type: READY_EVENT,
    version: MESSAGE_VERSION,
    request_id: 'request-1',
  });
  expect(firstPostMessage).toHaveBeenCalledWith(expect.objectContaining({ ticket: 'first-ticket' }), HARNESS_ORIGIN);
  await postHarnessMessage(firstFrame, {
    type: AUTH_ERROR_EVENT,
    version: MESSAGE_VERSION,
    request_id: 'request-1',
  });
  expect(container.textContent).toContain('Reconnect needed');

  await click(button('Reconnect'));
  expect(apiClient.controlPlane.post).toHaveBeenCalledTimes(2);
  const secondFrame = container.querySelector('iframe');
  const secondPostMessage = jest.spyOn(secondFrame.contentWindow, 'postMessage');
  await postHarnessMessage(secondFrame, {
    type: READY_EVENT,
    version: MESSAGE_VERSION,
    request_id: 'request-2',
  });
  expect(secondPostMessage).toHaveBeenCalledWith(expect.objectContaining({ ticket: 'replacement-ticket' }), HARNESS_ORIGIN);
});

test('untrusted origins, query strings, and fragments are rejected', () => {
  for (const embed_url of [
    'https://evil.example/',
    'https://chat.singulancelabs.com/?ticket=leak',
    'https://chat.singulancelabs.com/#ticket=leak',
  ]) {
    expect(() => validBootstrap({ mode: 'harness', embed_url, ticket: 'must-not-leak' }))
      .toThrow('Harness chat returned an untrusted embed URL.');
  }
});
