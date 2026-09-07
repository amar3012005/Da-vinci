import { isUnifiedProductHost } from '../productHosts';

test.each([
  'singulancelabs.com',
  'next.singulancelabs.com',
  'next.preview.singulancelabs.com',
  'dev.next.singulancelabs.com',
])('%s serves HIVEMIND locally instead of redirecting to another host', (hostname) => {
  expect(isUnifiedProductHost(hostname, undefined)).toBe(true);
});

test('an unrelated marketing host keeps the legacy redirect behavior', () => {
  expect(isUnifiedProductHost('example.com', undefined)).toBe(false);
});
