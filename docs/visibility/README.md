# SINGULANCE visibility implementation

Status: built and locally browser-verified; publication and external account changes await AMAR's approval. This is a separate public frontend task. Runtime/Brain/Core/Control and attention behavior are out of scope.

## Source and page map

Based on Da-vinci `origin/main` dd6dd8ff, isolated branch `codex/public-visibility-20261023`.

| Entity / intent | Canonical page | Work |
|---|---|---|
| What is proactive intelligence? | https://singulancelabs.com/proactive-intelligence | New definition, five-stage operating cycle, three interactive examples, answer-first FAQ |
| Who is SINGULANCE? | https://singulancelabs.com/about | New company identity, official-domain disambiguation, product relationships |
| Amar Sai Gadde | https://singulancelabs.com/amar-sai-gadde | New founder identity and consistent short bio |
| HIVEMIND | https://singulancelabs.com/hivemind | Existing page; canonical-definition link added |
| SINGULANCE Runtime | https://runtime.singulancelabs.com/ | Existing page; qualified search title and definition/company/founder links |
| Runtime introduction | https://getruntime.singulancelabs.com/ | Existing narrative; definition/company/founder links |
| HyperAgents | https://singulancelabs.com/hyperagents | Existing page; definition/company/founder links |
| ICARUS memory filesystem | https://icarus.singulancelabs.com/ | Existing page; qualified title and definition/company/founder links |

Shared content lives in `src/seo/visibility-content.mjs`. Visible FAQ answers and FAQ structured data use the same source. Metadata, server-rendered HTML, Markdown, sitemap and AI reading lists extend the existing pipeline. New pages are lazy-loaded. No private chat or memory contents enter these public files.

## Approval copy

Definition: **Proactive intelligence is AI that notices what needs attention, connects it to your goals, plans the next useful step, and carries approved work forward with human oversight and a record of its actions.**

This is a definition and product direction, not a claim that every workflow is production-verified. Visible pages label early access, distinguish illustrative examples from demonstrations, and describe access/configuration limits. They do not claim SINGULANCE coined the term, guarantees correct execution, has certifications, or serves named customers.

Company one-liner: **SINGULANCE is building proactive intelligence: company memory, an AI Chief of Staff and specialist AI teammates that help carry work forward.**

Founder bio: **Amar Sai Gadde is the founder of SINGULANCE, working on proactive AI and agent memory. His background spans Engineering Physics at IIT Mandi, an exchange at Leibniz Universität Hannover, robotics and embedded AI.**

## Acceptance checklist

- [x] Review current public company / getruntime / runtime content.
- [x] Isolate changes from other agents on latest frontend main.
- [x] Build definition, company and founder routes.
- [x] Link existing products and homepage footer to the canonical definition.
- [x] Organization / Person / DefinedTerm / matching FAQ structured data; existing canonical and breadcrumb owners reused.
- [x] Generate search-visible HTML, sitemap, Markdown and AI-readable text.
- [x] Focused contracts: 7 new tests and 13 existing discovery/public-host tests pass.
- [x] Full Cloudflare build completed, retaining previous hashed assets.
- [x] Built frontend route checked in browser; interactive quiet-noise state changed correctly.
- [x] 375 px content-viewport layout checked (iframe preview; not a physical-device test).
- [ ] AMAR approves copy and public release.
- [ ] Merge and guarded frontend-only deployment; capture exact Worker rollback/version and parent gitlink.
- [ ] Live canonical/HTML/schema/Markdown/links checks after deployment.
- [ ] Confirm Search Console verified property access, submit sitemap and inspect new URLs.
- [ ] Confirm Bing ownership/import, submit sitemap and inspect URLs.
- [ ] Account/profile changes individually approved; update existing accounts instead of creating duplicates.
- [ ] Each channel post approved before publication.
- [ ] Fresh disposable ICARUS install/save/restart/recall proof before Show HN.

Screenshots: `definition-desktop.png`, `definition-375.png`. Local built preview: http://127.0.0.1:4180/proactive-intelligence .

## Release procedure after approval

1. Refresh main and review any intervening changes; rebase only this task branch without resetting shared checkouts.
2. Run focused tests and normal repository hooks; push exact branch, review/merge its PR.
3. Update parent frontend gitlink through the existing production path.
4. Record live Worker version and rollback, then use the owning Ops Gateway frontend tool or the existing guarded Wrangler release path from a clean approved main checkout. No Runtime container deployment is needed.
5. Verify all three new URLs, existing product links, canonical host behavior, sitemap and Markdown. Retain source SHA/Worker version and screenshot evidence.
6. Submit URLs only after public responses pass. Indexing/ranking and AI citation are outcomes to measure, not guaranteed by schema or a sitemap.

## Search references

- Google ownership: https://support.google.com/webmasters/answer/9008080
- Google crawling/indexing: https://developers.google.com/search/help/crawling-index-faq
- Bing ownership: https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b
- Bing sitemap: https://www2.bing.com/webmasters/help/sitemaps-3b5cf6ed

## Professional biography expansion

The founder draft now includes Engineering Physics studies at IIT Mandi, a 2025–26 LUH physics exchange, an AI-solutions working-student role, earlier robotics/AI/campus projects and technical leadership. Reviewed against founder-provided CV/academic/employment documents and publicly indexed LinkedIn material. Private documents, personal contact details, financial/immigration information and credentials are excluded from the repository. Study status is not presented as a completed degree. Full employment dates and the current complete LinkedIn chronology remain unverified; no dates were invented. Publication approval remains pending.
