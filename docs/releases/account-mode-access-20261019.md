# Account-scoped workspace mode rollout

Cloudflare Flagship `hivemind-workspace-modes-v1` defaults off. Initial email targets are amarsai2005@gmail.com and support@singulancelabs.com. No organization-wide, role, paid-plan or referral-campaign inheritance.

The Worker verifies the current account through Control's existing `/auth/session`; query parameters and browser state cannot choose the evaluated email. The native Brain composer voice remains independent; this gate controls the Brain / HyperAgents / Voice workspace selector and associated workspace documents.

Explicit per-account grants and denials are retained in SQLite-backed `AccountModeAccess` Durable Objects. The Flagship rule ordering is denial, grant, initial email targets, off. Turning the flag off overrides every grant. This is a presentation/admission rollout, not a replacement for native backend permissions or cancellation of existing work.

Admin uses the existing Control platform-admin cookie and verification endpoint. Platform-admin requests now pass through the same-origin Worker proxy on the admin hostname so its host-only HttpOnly cookie is available to both the existing backend and grant routes. The passcode and signing remain owned by Control. Other hosts cannot administer grants. Admin responses and account evaluations are private/no-store.

Enterprise invitation and named partner-referral forms default to off. Selecting access stores a grant for the recipient email after successful invitation creation, before sign-in exists. It does not grant access to the recipient's teammates or other redeemers. Failed grant persistence after successful invitation creation is reported explicitly; use Users to repair, never recreate the invitation. Unchecked existing-account invitations do not revoke prior grants; use the Users toggle for explicit revocation. Generic unnamed invitation codes cannot convey an account grant.

The existing account context refreshes on focus and every 15 seconds while visible, without retaining the last account's access across sign-out. Denied Runtime/Voice document links return to Brain. Hidden tabs refresh upon visibility. Existing backend roles, tenant ownership and execution policies remain unchanged.

Rollback: restore the preceding Worker version to restore prior UI. Flag rollback alone is fail-closed (Brain only), not a return to the old open selector. Keep the Durable Object class/migration on future source releases; rollback does not delete grant records.

## Acceptance

- [ ] Code: flag and route isolation, explicit denial, persistence, directory controls, named invitation grant.
- [ ] Deployed: Worker version, source SHA, Durable Object migration and previous version recorded.
- [ ] Live verified: signed-in two allowed accounts, ordinary account Brain only, admin grant/revoke, invitation grant, no cross-account inheritance.
