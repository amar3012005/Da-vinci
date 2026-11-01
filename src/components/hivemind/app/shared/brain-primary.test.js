import { brainPrimary, companyBrainIsPrimary, normalizeBrainPrimary, peekBrainPrimary, resetBrainPrimary } from './brain-primary';

const reply = primary => jest.fn().mockResolvedValue({ ok: true, json: async () => ({ primary }) });
beforeEach(() => { resetBrainPrimary(); localStorage.clear(); });

test('only the exact string harness selects the old runner; everything else is company', () => {
  expect(normalizeBrainPrimary('harness')).toBe('harness');
  for (const value of ['company', '', undefined, null, 'Harness', 'x', 1]) expect(normalizeBrainPrimary(value)).toBe('company');
  expect(companyBrainIsPrimary('harness')).toBe(false);
  expect(companyBrainIsPrimary(undefined)).toBe(true);
});

test('defaults to company with nothing stored, and reads the flag route in a browser', async () => {
  expect(peekBrainPrimary()).toBe('company');
  const fetcher = reply('harness');
  expect(await brainPrimary({ fetcher, native: false })).toBe('harness');
  expect(fetcher.mock.calls[0][0]).toBe('/__hivemind/feature-flags/brain-primary');
  expect(peekBrainPrimary()).toBe('harness');
});

test('the packaged app reads the absolute app-host route', async () => {
  const fetcher = reply('company');
  await brainPrimary({ fetcher, native: true });
  expect(fetcher.mock.calls[0][0]).toBe('https://next.singulancelabs.com/__hivemind/feature-flags/brain-primary');
});

test('answers are cached for 30 s, then re-read', async () => {
  let clock = 1000; const fetcher = reply('company');
  await brainPrimary({ fetcher, now: () => clock, native: false });
  clock += 29_000; await brainPrimary({ fetcher, now: () => clock, native: false });
  expect(fetcher).toHaveBeenCalledTimes(1);
  clock += 2_000; await brainPrimary({ fetcher, now: () => clock, native: false });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test('a failing or malformed flag read falls back to the last known value, company by default', async () => {
  expect(await brainPrimary({ fetcher: jest.fn().mockRejectedValue(new Error('down')), native: false })).toBe('company');
  resetBrainPrimary();
  expect(await brainPrimary({ fetcher: jest.fn().mockResolvedValue({ ok: false }), native: false })).toBe('company');
  resetBrainPrimary(); localStorage.setItem('hm:brain-primary', 'harness');
  expect(await brainPrimary({ fetcher: jest.fn().mockRejectedValue(new Error('down')), native: false })).toBe('harness');
});
