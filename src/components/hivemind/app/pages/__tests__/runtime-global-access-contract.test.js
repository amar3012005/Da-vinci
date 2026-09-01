const fs = require('fs');
const path = require('path');

describe('Runtime and Social global access', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');

  it('opens Runtime directly for every authenticated workspace', () => {
    expect(source).toContain("if (/\\/employees\\/runtime/.test(p)) return { mode: 'runtime', roomId: null };");
    expect(source).toContain("onClick={() => goMode('runtime', null)}");
    expect(source).not.toContain("openComingSoon('runtime')");
    expect(source).not.toContain('RuntimeWaitlistModal');
  });

  it('opens the Social campaigns workspace instead of a preview modal', () => {
    expect(source).toContain("onClick={() => goMode('campaigns', null)}");
    expect(source).not.toContain("openComingSoon('social')");
    expect(source).not.toContain('Social Media is coming soon');
  });
});
