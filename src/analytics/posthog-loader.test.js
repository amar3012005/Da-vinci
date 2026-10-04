const mockInitializer = jest.fn();
let mockConsent = false;
jest.mock('../privacy/consent', () => ({
  CONSENT_EVENT: 'seo-test-consent',
  hasConsent: () => mockConsent,
}));
jest.mock('./posthog', () => ({ initConsentAwarePostHog: mockInitializer }));
jest.mock('./posthog-persistence', () => ({ clearLegacyPostHogPersistence: jest.fn() }));

test('defers the SDK until consent and transfers the listener only once', async () => {
  process.env.REACT_APP_POSTHOG_KEY = 'test-public-project-key';
  const { initConsentAwarePostHog } = require('./posthog-loader');
  const { clearLegacyPostHogPersistence } = require('./posthog-persistence');
  initConsentAwarePostHog();
  initConsentAwarePostHog();
  await Promise.resolve();
  expect(mockInitializer).not.toHaveBeenCalled();
  expect(clearLegacyPostHogPersistence).toHaveBeenCalledTimes(1);

  mockConsent = true;
  window.dispatchEvent(new Event('seo-test-consent'));
  window.dispatchEvent(new Event('seo-test-consent'));
  // Dynamic import, then initializer continuation.
  await Promise.resolve();
  await Promise.resolve();
  expect(mockInitializer).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new Event('seo-test-consent'));
  await Promise.resolve();
  expect(mockInitializer).toHaveBeenCalledTimes(1);
  delete process.env.REACT_APP_POSTHOG_KEY;
});
