import { buildCompanyBrainTarget, isCompanyBrainRoute, postToCompanyBrainFrame } from './company-brain-room';

test('only the Chat entry routes open the Company Brain', () => {
  for (const path of ['/hivemind/app/overview', '/hivemind/app/overview/', '/hivemind/app/overview/new']) expect(isCompanyBrainRoute(path)).toBe(true);
  for (const path of ['/hivemind/app/overview/session/abc', '/hivemind/app/overview/dreaming', '/hivemind/app/memories']) expect(isCompanyBrainRoute(path)).toBe(false);
});

test('the embed address is the brain-runner room with the handshake marker and language', () => {
  expect(buildCompanyBrainTarget('de-DE')).toBe('https://brain-runner.singulancelabs.com/dots/dot_company_brain?embed=hivemind&hm_locale=de');
});

test('host messages target the brain-runner origin exactly', () => {
  const postMessage = jest.fn();
  postToCompanyBrainFrame({ contentWindow: { postMessage } }, { type: 'x' });
  expect(postMessage).toHaveBeenCalledWith({ type: 'x' }, 'https://brain-runner.singulancelabs.com');
  const blank = jest.fn();
  postToCompanyBrainFrame({ contentWindow: { postMessage: blank, location: { origin: 'null', pathname: '/' } } }, { type: 'x' });
  expect(blank).not.toHaveBeenCalled();
});
