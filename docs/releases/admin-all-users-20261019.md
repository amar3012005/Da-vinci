# Dedicated All users admin section

`?section=users` is the dedicated directory on the existing platform admin console. It replaces the old compact user table; overview and commercial panels are separate views. All users retains lifecycle and account-mode grants.

The existing authenticated users API supplies name, email, active organization memberships, memory count and last activity. Directory search reaches all matching accounts server-side. The current API caps a response at 500; the UI explicitly reports truncation and supports a narrower server search. Within the returned window the UI pages by 25 and filters by organization. It never calls a 500-row response an exhaustive directory when total is larger.

Canonical shared credit balances load only for the current page with four concurrent requests. Per-user model call/token/cost attribution loads on expansion and matches exact user IDs. Missing data is unavailable, never substituted by another member's usage or a made-up zero.

The editor changes only `limits.monthlyCredits` through the existing audited organization settings API. It shows the selected user and exact affected organization, current included/used/reserved/remaining credits, pool/reset information, and a required reason. Blank restores inheritance; -1 is unlimited. Other limits/features are untouched. Revision conflicts are reported; there is no automatic retry or resetting consumption. Shared organization credits are not represented as independent personal balances.

No backend services, billing model, native harness or feature flag changes are required.

- [x] Code: helper tests for user attribution, memberships, zero/unlimited/inherited allowance, scope, revision and validation.
- [ ] Deployed: frontend source, parent promotion and Worker version recorded.
- [ ] Live API verified: real admin directory, usage attribution, authoritative balances and safe allowance read-back.
- [ ] Signed-in visual acceptance: directory, filters, usage expansion and editor.
