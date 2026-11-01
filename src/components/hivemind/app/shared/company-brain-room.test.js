import { buildCompanyBrainPage, buildCompanyBrainTarget, isCompanyBrainRoute } from './company-brain-room';

test('only the Chat entry routes open the Company Brain', () => {
  for (const path of ['/hivemind/app/overview', '/hivemind/app/overview/', '/hivemind/app/overview/new']) expect(isCompanyBrainRoute(path)).toBe(true);
  for (const path of ['/hivemind/app/overview/session/abc', '/hivemind/app/overview/dreaming', '/hivemind/app/memories']) expect(isCompanyBrainRoute(path)).toBe(false);
});

test('the embed address is the brain-runner room with the handshake marker and language', () => {
  expect(buildCompanyBrainTarget('de-DE')).toBe('https://brain-runner.singulancelabs.com/dots/dot_company_brain?embed=hivemind&hm_locale=de');
});

test('the top-level page address carries the language and no embed marker', () => {
  expect(buildCompanyBrainPage('de-DE')).toBe('https://brain-runner.singulancelabs.com/dots/dot_company_brain?hm_locale=de');
});
