const fs = require('fs');
const path = require('path');

describe('Runtime post-onboarding introduction canary', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
  const dashboard = fs.readFileSync(path.join(__dirname, '..', '..', 'hyperagents', 'CompanyDashboard.jsx'), 'utf8');

  it('targets only the requested user and organization', () => {
    expect(source).toContain("userId: 'b457c254-38a0-4c43-8280-b026f1a78b04'");
    expect(source).toContain("orgId: 'f0cb77ef-e62b-4f8c-a1da-066611fc3b36'");
    expect(source).toContain('showRuntimeInvite={showRuntimeIntro}');
  });

  it('opens live Runtime and records the introduction once per version', () => {
    expect(source).toContain("onOpenRuntime={() => goMode('runtime', null)}");
    expect(source).toContain('runtimeInviteVersion="canary-20260901"');
    expect(dashboard).toContain('hm_runtime_invite:${runtimeInviteVersion}:');
  });
});
