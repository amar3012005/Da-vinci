const fs = require('fs');
const path = require('path');

describe('Runtime and Social global access', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');

  it('shows the Runtime beta popup instead of opening the live runtime', () => {
    expect(source).toContain("onClick={() => setBetaFeature('runtime')}");
    expect(source).not.toContain("onClick={() => goMode('runtime', null)}");
    expect(source).toContain('FeatureBetaModal');
  });

  it('opens the Social campaigns workspace instead of a preview modal', () => {
    expect(source).toContain("onClick={() => goMode('campaigns', null)}");
    expect(source).not.toContain("openComingSoon('social')");
    expect(source).not.toContain('Social Media is coming soon');
  });
});
