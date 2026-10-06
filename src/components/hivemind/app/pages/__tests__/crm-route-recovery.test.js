const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '../../HiveMindApp.jsx'), 'utf8');
test('CRM owns its subtree and canonicalizes damaged paths preserving search/hash', () => {
  expect(app).toContain('path="crm/*" element={<CanonicalCRMRoute />}');
  expect(app).toContain("location.pathname !== '/hivemind/app/crm'");
  expect(app).toContain("pathname: '/hivemind/app/crm', search: location.search, hash: location.hash");
});
test('all app fallbacks use absolute overview routes and cannot append recursively', () => {
  expect(app).not.toMatch(/<Navigate\s+to="overview"/);
  expect(app).toContain('<Route path="*" element={<Navigate to="/hivemind/app/overview" replace />}');
  expect(app).toContain('<Route index element={<Navigate to="/hivemind/app/overview" replace />}');
});
