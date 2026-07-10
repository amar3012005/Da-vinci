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
