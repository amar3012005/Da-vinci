const fs = require('fs');
const path = require('path');

describe('SEO Room workspace contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'SeoRoomWorkspace.jsx'), 'utf8');
  const roomSource = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'pages', 'HyperAgents.jsx'), 'utf8');

  it('uses deterministic audit evidence for the persistent operating surface', () => {
    expect(source).toContain('latestSeoAuditFromTurns');
    expect(source).toContain('audit?.optimization_procedure');
    expect(source).toContain('audit?.maturity');
    expect(source).toContain('SEO Intelligence workspace');
    expect(source).toContain('Website progress');
    expect(source).toContain('Connect Search Console');
  });

  it('submits stage-aware work into the visible Room pipeline', () => {
    expect(source).toContain('Fix technical blockers');
    expect(source).toContain('Build the next 30 days');
    expect(source).toContain('Continue current stage');
    expect(roomSource).toContain('<SeoRoomBanner');
    expect(roomSource).toContain('<SeoRoomProgress');
  });
});
