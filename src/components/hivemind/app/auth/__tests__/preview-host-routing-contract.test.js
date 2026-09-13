const fs = require('fs');
const path = require('path');

test('the production bundle treats next.preview as a local HIVE application host', () => {
  const app = fs.readFileSync(path.resolve(__dirname, '../../../../../App.js'), 'utf8');

  expect(app).toContain("const HIVEMIND_PREVIEW_HOSTS = new Set(['next.preview.singulancelabs.com'])");
  expect(app).toContain('HIVEMIND_PREVIEW_HOSTS.has(window.location.hostname)');
  expect(app).toContain('window.location.hostname === HIVEMIND_SITE_HOST');
});
