# Public search and backlink plan

Scope: singulancelabs.com. The authenticated app at next.singulancelabs.com stays noindex and its discovery files do not advertise private routes.

## Confirmed before this release

- Search Console domain ownership is already verified. The dashboard showed 6 indexed pages, 12 not indexed and 18 web-search clicks. These are the report snapshot, not a claim of live user activity.
- Search Console has no field Core Web Vitals data for mobile or desktop.
- The old sitemap listed nonexistent About, Demo and Terms pages and omitted three research articles.
- HTTP served 200 without upgrading to HTTPS. Public SPA routes initially shared homepage metadata.
- The robots critical error in the historical report concerns next.singulancelabs.com, not a public-host crawl block. Public robots had parser warnings; nonstandard directives are now comments.

## Implementation

The shared public-page registry owns nine canonical URLs, their titles, descriptions and structured data. The Worker serves a readable route-specific initial summary and crawlable navigation to all visitors, then React replaces that summary with the interactive page. This is not a full server render of every research article. The full article remains in the rendered application. Missing public routes return a real 404. Actual public pages are indexable; private app routes retain noindex.

Only known public routes receive canonical slug normalization. Existing private routes and authentication flows retain their handlers. HTTP upgrades to HTTPS. Organization, WebSite, WebPage and breadcrumb structured data describe the existing pages without invented ratings, FAQ eligibility or certification claims.

The footer and research navigation link to real destinations. Placeholder product, industry, career, legal and download-store links were removed. Approved Terms/DPA/legal-notice content still needs a real published page before these links can return. No legal text was fabricated.

## Backlinks: build useful references, then earn citations

1. **First two weeks:** give each research page stable citation information, methods, limitations and links to its reproducible supporting material where available. Publish real benchmark conditions and release dates. Keep claims tied to the evidence.
2. **Weeks two to four:** publish two substantive pieces drawn from existing work: an agent-memory architecture walkthrough and a reproducible memory benchmark explanation. Link each to ICARUS, the benchmark and the relevant research page.
3. **Weeks four to eight:** prepare a short list of relevant AI-memory researchers, open-source maintainers, developer publications and European AI communities. Propose genuinely useful technical contributions, benchmark comparisons or talks. Outreach requires the owner's approval; none has been sent.
4. **Owned profiles:** update verified company profiles and legitimate project repositories to point to the canonical homepage and relevant research. Do not invent social accounts or publish generic directory links.
5. **Partners:** ask actual collaborators to cite joint research or integrations where the reference helps their readers. Use natural descriptive link text and disclose sponsorships.

Avoid buying ranking links, automated comment links, link exchanges at scale and fabricated endorsements. Google classifies manipulative links as link spam: https://developers.google.com/search/docs/essentials/spam-policies#link-spam

## Measurement

- Submit https://singulancelabs.com/sitemap.xml in the verified Search Console property and inspect the homepage plus the three research URLs.
- Review indexed pages and search queries after Google recrawls. Sitemap submission is a discovery hint, not an indexing guarantee.
- Compare impressions, clicks and referring domains over 28-day windows. Track useful qualified visits rather than raw backlink counts.
- Measure LCP, INP and CLS using field data when traffic becomes sufficient. Search Console currently has no field data, so no passing CWV claim can be made.
- This release reduces an update thumbnail from 340KB to 96KB, compresses the OG image, avoids loading hidden desktop/mobile heroes together and prioritizes the static poster before decorative canvas work. Quantify the live result separately; it does not establish a site-wide performance score.

References: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics ; https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap ; https://web.dev/articles/vitals
