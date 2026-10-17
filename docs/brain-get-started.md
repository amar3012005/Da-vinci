# Brain chat getting started

Brain chat uses the same floating, bottom-left card as Runtime, without allocating a column or reducing chat width. It starts collapsed as a slim progress bar. The checklist is shown only on `/overview` chat routes; visits to memories and knowledge are observed while the Brain shell remains mounted.

Brain progress uses its own user/organization-scoped cache, never Runtime's. Milestones: a saved Brain session route; at least one readable source; at least one readable memory; an authenticated app connection; visiting Memories; visiting Knowledge. Source, memory and connection checks use existing ACL-filtered APIs with limit one where supported, on route change or focus, without polling. Failed requests preserve the previous snapshot. Checklist navigation never saves memory, uploads data, grants permission or sends a prompt. Existing account content qualifies; these are onboarding milestones, not claims about who authored it.
