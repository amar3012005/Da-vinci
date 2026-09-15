import { isExpectedBrowserContextError, isRequestCancellation, isServiceError } from '../serviceError';

describe('service error classification', () => {
  it.each([
    { code: 'ERR_CANCELED', request: {} },
    { name: 'CanceledError', request: {} },
    { name: 'AbortError', request: {} },
    { __CANCEL__: true, request: {} },
  ])('does not show an outage for an expected cancellation', (error) => {
    expect(isRequestCancellation(error)).toBe(true);
    expect(isServiceError(error)).toBe(false);
  });

  it('retains genuine network and server failures', () => {
    expect(isServiceError({ request: {} })).toBe(true);
    expect(isServiceError({ response: { status: 503 } })).toBe(true);
  });

  it('does not turn browser storage restrictions into a network outage', () => {
    const error = {
      request: {},
      message: 'Access to storage is not allowed from this context.',
    };
    expect(isExpectedBrowserContextError(error)).toBe(true);
    expect(isServiceError(error)).toBe(false);
  });
});
