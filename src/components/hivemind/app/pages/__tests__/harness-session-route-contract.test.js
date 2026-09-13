const fs = require('fs');
const path = require('path');

describe('native Harness session routes', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'HiveMindApp.jsx'), 'utf8');
  const overview = fs.readFileSync(path.join(__dirname, '..', 'Overview.jsx'), 'utf8');

  it('keeps explicit native session paths inside Overview', () => {
    expect(app).toContain('path="overview/*"');
    expect(overview).toContain('/^\\/hivemind\\/app\\/overview\\/(?:new|session\\/[^/]+)$/u');
  });
});
