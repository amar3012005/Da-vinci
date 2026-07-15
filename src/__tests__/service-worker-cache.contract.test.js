const fs = require('fs');
const path = require('path');

test('service worker invalidates old shells and prefers live static assets', () => {
  const worker = fs.readFileSync(path.resolve(__dirname, '../../public/sw.js'), 'utf8');

  expect(worker).toContain("const CACHE = 'hive-shell-v3'");
  expect(worker).toContain('fetch(request)');
  expect(worker).toContain('.catch(() => caches.match(request))');
  expect(worker).not.toContain('return cached || network');
});
