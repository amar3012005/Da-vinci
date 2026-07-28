const fs = require('fs');
const path = require('path');

describe('SEO operating report contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'SeoOperatingReport.jsx'), 'utf8');

  it('parses deterministic evidence and exposes operational views', () => {
    expect(source).toContain('```seo_audit');
    expect(source).toContain("audit?.schema === 'seo-audit-v1'");
    expect(source).toContain('Priority fixes');
    expect(source).toContain('Search performance');
    expect(source).toContain('audit.search_console');
    expect(source).toContain('First-party search evidence');
    expect(source).toContain('Pages');
    expect(source).toContain('Evidence boundaries');
    expect(source).toContain('Crawl errors');
  });

  it('keeps legacy SEO reports available through the brochure renderer', () => {
    expect(source).toContain('if (!audit)');
    expect(source).toContain('<BrochureReport report={report}');
  });
});
