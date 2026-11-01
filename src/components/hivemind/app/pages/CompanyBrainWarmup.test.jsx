import React from 'react';
import { act, cleanup, render } from '@testing-library/react';

import CompanyBrainWarmup from './CompanyBrainWarmup';

beforeEach(() => { window.requestIdleCallback = callback => window.setTimeout(callback, 0); window.cancelIdleCallback = id => window.clearTimeout(id); });
afterEach(() => { cleanup(); Object.defineProperty(navigator, 'connection', { configurable: true, value: undefined }); });
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });

test('after idle it mounts one hidden 0x0 room frame carrying the language', async () => {
  render(<CompanyBrainWarmup language="de-DE" />);
  await settle();
  const frame = document.querySelector('iframe[data-company-brain-warmup]');
  expect(frame.getAttribute('src')).toBe('https://brain-runner.singulancelabs.com/dots/dot_company_brain?embed=hivemind&hm_locale=de');
  expect(frame.style.width).toBe('0px');
  expect(frame.getAttribute('aria-hidden')).toBe('true');
});

test('Data Saver and 2G skip the warm-up', async () => {
  Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
  render(<CompanyBrainWarmup language="en" />);
  await settle();
  expect(document.querySelector('iframe')).toBeNull();
  cleanup();
  Object.defineProperty(navigator, 'connection', { configurable: true, value: { effectiveType: '2g' } });
  render(<CompanyBrainWarmup language="en" />);
  await settle();
  expect(document.querySelector('iframe')).toBeNull();
});
