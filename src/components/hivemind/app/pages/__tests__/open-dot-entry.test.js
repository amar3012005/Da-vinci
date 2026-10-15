import { buildOpenDotEmbedTarget } from '../../shared/open-dot-embed-target';

const EMPLOYEE_ID = 'c14aaef5-24fb-46c2-806c-c3f6c1d88b07';

test('embeds the canonical employee at the fixed Dot origin', () => {
  expect(buildOpenDotEmbedTarget(`/employee/${EMPLOYEE_ID}`)).toBe(
    `https://dots.singulancelabs.com/employees/${EMPLOYEE_ID}?embed=hivemind`,
  );
});

test('embeds My dots and keeps the legacy Dot conversation address', () => {
  expect(buildOpenDotEmbedTarget('')).toBe('https://dots.singulancelabs.com/?embed=hivemind');
  expect(buildOpenDotEmbedTarget('/dot_abc-12', '?c=conv_xyz-9')).toBe(
    'https://dots.singulancelabs.com/dots/dot_abc-12?embed=hivemind&c=conv_xyz-9',
  );
});

test.each([
  ['/employee/not-a-uuid', ''],
  ['/employee/../../attacker', ''],
  ['/dot_abc', '?c=other-conversation'],
  ['/https://attacker.example', ''],
])('rejects invalid or caller-controlled Dot route %s', (suffix, search) => {
  expect(buildOpenDotEmbedTarget(suffix, search)).toBeNull();
});

test('reuses native Apps catalog inside the Runtime shell with bounded provider intent', () => {
  expect(buildOpenDotEmbedTarget('/apps', '?connect=gmail')).toBe('https://dots.singulancelabs.com/apps?embed=hivemind&connect=gmail');
  expect(buildOpenDotEmbedTarget('/apps', '?connect=https://evil.test')).toBe('https://dots.singulancelabs.com/apps?embed=hivemind');
});
