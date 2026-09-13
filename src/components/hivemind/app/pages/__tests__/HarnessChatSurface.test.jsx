import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import apiClient from '../../shared/api-client';
import HarnessChatSurface, {
  HARNESS_EXCHANGE_PATH,
  HARNESS_OVERVIEW_PATH,
  canonicalHarnessDestination,
  navigateHarnessTicket,
  validBootstrap,
} from '../HarnessChatSurface';

jest.mock('../../shared/api-client', () => ({
  __esModule: true,
  default: { controlPlane: { post: jest.fn() } },
}));

const mockTranslate = (_key, fallback) => fallback;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockTranslate }),
}));

describe('HarnessChatSurface same-origin handoff', () => {
  let container;
  let root;
  let originalFetch;

  beforeAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    apiClient.controlPlane.post.mockReset();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    global.fetch = originalFetch;
  });

  test('validates only supported bootstrap modes and requires admitted tickets', () => {
    expect(validBootstrap({ mode: 'legacy' })).toEqual({ mode: 'legacy', receipt: null });
    expect(validBootstrap({ mode: 'preview', ticket: 'preview-ticket' })).toMatchObject({
      mode: 'preview',
      ticket: 'preview-ticket',
    });
    expect(validBootstrap({ mode: 'harness', ticket: 'harness-ticket' })).toMatchObject({
      mode: 'harness',
      ticket: 'harness-ticket',
    });
    expect(() => validBootstrap({ mode: 'harness' })).toThrow('connection ticket');
    expect(() => validBootstrap({ mode: 'unknown' })).toThrow('Unsupported Harness chat mode');
  });

  test('accepts only native Overview destinations on the current origin', () => {
    expect(canonicalHarnessDestination(HARNESS_OVERVIEW_PATH)).toBe(HARNESS_OVERVIEW_PATH);
    expect(canonicalHarnessDestination(`${HARNESS_OVERVIEW_PATH}/new?model=fast`))
      .toBe(`${HARNESS_OVERVIEW_PATH}/new?model=fast`);
    expect(canonicalHarnessDestination(`${HARNESS_OVERVIEW_PATH}/session/session-123#chat`))
      .toBe(`${HARNESS_OVERVIEW_PATH}/session/session-123#chat`);
    expect(canonicalHarnessDestination('/hivemind/app/connectors')).toBe(HARNESS_OVERVIEW_PATH);
    expect(canonicalHarnessDestination('https://evil.example/session/session-123'))
      .toBe(HARNESS_OVERVIEW_PATH);
  });

  test('legacy admission preserves the existing Overview chat', async () => {
    apiClient.controlPlane.post.mockResolvedValue({ data: { mode: 'legacy' } });

    await act(async () => {
      root.render(<HarnessChatSurface legacy={<div>classic chat</div>} />);
    });

    expect(container.textContent).toContain('classic chat');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('bootstrap failure preserves the existing Overview chat and shows retry', async () => {
    apiClient.controlPlane.post.mockRejectedValue(new Error('bootstrap unavailable'));

    await act(async () => {
      root.render(<HarnessChatSurface legacy={<div>classic chat</div>} />);
    });

    expect(container.textContent).toContain('classic chat');
    expect(container.textContent).toContain('bootstrap unavailable');
    expect(container.textContent).toContain('Retry');
  });

  test('preview activation exchanges the ticket on the same origin without an iframe', async () => {
    apiClient.controlPlane.post
      .mockResolvedValueOnce({ data: { mode: 'preview', ticket: 'preview-ticket' } })
      .mockResolvedValueOnce({ data: { mode: 'preview', ticket: 'activation-ticket' } });
    global.fetch.mockResolvedValue({ ok: false, url: HARNESS_OVERVIEW_PATH });

    await act(async () => {
      root.render(<HarnessChatSurface legacy={<div>classic chat</div>} />);
    });
    expect(container.textContent).toContain('Try preview');

    await act(async () => {
      container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(global.fetch).toHaveBeenCalledWith(HARNESS_EXCHANGE_PATH, expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
    }));
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('Could not establish the secure Harness session.');
  });

  test('ticket exchange rejects failed responses before navigation', async () => {
    global.fetch.mockResolvedValue({ ok: false, url: HARNESS_OVERVIEW_PATH });

    await expect(navigateHarnessTicket('ticket-1')).rejects.toThrow(
      'Could not establish the secure Harness session.',
    );
    const [, request] = global.fetch.mock.calls[0];
    expect(JSON.parse(request.body)).toMatchObject({ ticket: 'ticket-1' });
    expect(JSON.parse(request.body).request_id).toEqual(expect.any(String));
  });
});
