const fs = require('fs');
const path = require('path');

test('mobile homepage HIVEMIND links use the vNext hostname', () => {
  const mobileDir = path.resolve(__dirname, '..');
  const files = fs.readdirSync(mobileDir).filter((name) => name.endsWith('.jsx'));
  const internalLink = /(?:href|to)=(?:"|')\/hivemind/;

  expect(require('../hivemindLinks').HIVEMIND_URL).toBe('https://next.singulancelabs.com/hivemind');
  for (const file of files) {
    expect(fs.readFileSync(path.join(mobileDir, file), 'utf8')).not.toMatch(internalLink);
  }
});

test('mobile homepage HIVEMIND links stay within the dev environment', () => {
  const { resolveHivemindUrl } = require('../hivemindLinks');

  expect(resolveHivemindUrl({
    hostname: 'dev.next.singulancelabs.com',
    origin: 'https://dev.next.singulancelabs.com',
  })).toBe('https://dev.next.singulancelabs.com/hivemind');
});

test('the primary Run your company CTA opens the overview', () => {
  const hero = fs.readFileSync(path.resolve(__dirname, '../MobileHero.jsx'), 'utf8');

  expect(hero).toContain("href={hivemindHref('/app/overview')}");
});
