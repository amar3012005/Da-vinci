import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { extractErr, Spinner } from './CampaignPanel';

// Noise cleanup (2026-08-16): same drift class fixed in HqRuntimeConsole.jsx
// and CompanyDashboard.jsx — this exact error-extraction expression was
// hand-copied across 4 catch blocks in this file.
test('extractErr prefers the backend error message over a raw JS error', () => {
  expect(extractErr({ response: { data: { error: 'Backend said no.' } }, message: 'ignored' })).toBe('Backend said no.');
});

test('extractErr falls back to e.message when no backend error is present', () => {
  expect(extractErr({ message: 'Network request failed' })).toBe('Network request failed');
});

// The same Loader2+animate-spin markup was copy-pasted at 3 call sites.
test('Spinner renders the default size/className', () => {
  const markup = renderToStaticMarkup(<Spinner />);
  expect(markup).toContain('animate-spin');
});

test('Spinner renders a custom size/className for the chip inline variant', () => {
  const markup = renderToStaticMarkup(<Spinner size={9} className="inline animate-spin mr-1" />);
  expect(markup).toContain('inline animate-spin mr-1');
});
