import { buildOpenDotEmbedTarget } from '../../shared/open-dot-embed-target';

const EMPLOYEE_ID = 'c14aaef5-24fb-46c2-806c-c3f6c1d88b07';

test('embeds the canonical employee at the fixed Dot origin', () => {
  expect(buildOpenDotEmbedTarget(`/employee/${EMPLOYEE_ID}`)).toBe(
    `https://runtime-runner.singulancelabs.com/employees/${EMPLOYEE_ID}?embed=hivemind`,
  );
});

test('embeds My dots and keeps the legacy Dot conversation address', () => {
  expect(buildOpenDotEmbedTarget('')).toBe('https://runtime-runner.singulancelabs.com/?embed=hivemind');
  expect(buildOpenDotEmbedTarget('/dot_abc-12', '?c=conv_xyz-9')).toBe(
    'https://runtime-runner.singulancelabs.com/dots/dot_abc-12?embed=hivemind&c=conv_xyz-9',
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
  expect(buildOpenDotEmbedTarget('/apps', '?connect=gmail')).toBe('https://runtime-runner.singulancelabs.com/apps?embed=hivemind&app=gmail');
  expect(buildOpenDotEmbedTarget('/apps', '?connect=https://evil.test')).toBe('https://runtime-runner.singulancelabs.com/apps?embed=hivemind');
});

describe('interface language handoff', () => {
  const { withOpenDotLocale, openDotLocale } = require('../../shared/open-dot-embed-target');
  const target = `https://runtime-runner.singulancelabs.com/employees/${EMPLOYEE_ID}?embed=hivemind`;

  test('adds the primary language subtag to the embed address and keeps the rest', () => {
    expect(withOpenDotLocale(target, 'de')).toBe(`${target}&hm_locale=de`);
    expect(withOpenDotLocale(target, 'pt-BR')).toBe(`${target}&hm_locale=pt`);
    expect(withOpenDotLocale(target, 'ar_EG')).toBe(`${target}&hm_locale=ar`);
    expect(withOpenDotLocale(`${target}&hm_locale=fr`, 'ja')).toBe(`${target}&hm_locale=ja`);
  });

  test.each([undefined, null, '', 'x', '../../etc', 'de<script>'])('leaves the address alone for the unusable language %p', (language) => {
    expect(openDotLocale(language)).toBeNull();
    expect(withOpenDotLocale(target, language)).toBe(target);
  });

  test('an invalid embed target stays null', () => {
    expect(withOpenDotLocale(null, 'de')).toBeNull();
  });
});
