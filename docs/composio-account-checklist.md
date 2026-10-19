# Composio own-account enrollment — release evidence, 19 October 2026

Scope: Connectors page only. Hosted Composio Connect MCP OAuth, not toolkit authorization under HIVEMIND's shared project. Runtime and HyperAgents are not wired to this connection in this release.

Frontend product source: 1f27d4e0b064c45313b6462aa4abbe2ce4aebeb4; Worker 1b0fd613-cb3e-4251-9e68-261bba52f2b6. This document updates evidence only.

| Check | Code | Deployed | Live verified |
|---|---|---|---|
| Hosted OAuth authorization-code + S256, registered redirect | [x] | [x] | [ ] human grant pending |
| Authenticated user/workspace routing, no caller identity | [x] | [x] | [ ] real grant pending; two-user workerd fixture passes |
| Encrypted tokens, serialized refresh, disconnect deletion | [x] | [x] | [ ] provider fixtures pass |
| Callback verifies MCP tools before reporting connected | [x] | [x] | [ ] actual workerd callback fixture passes; real grant pending |
| Connectors card independent of company onboarding | [x] | [x] | [x] SINGULANCE Chrome status passes, consent required |
| Real hosted authorization and return to Connectors | [x] | [x] | [ ] waiting for human provider approval |
| Agent/toolkit execution activation and account-deletion erasure | [ ] | [ ] | [ ] intentionally deferred in authentication-only scope |

Provider discovery: https://connect.composio.dev/.well-known/oauth-authorization-server and /.well-known/oauth-protected-resource/mcp. Fixed MCP resource https://connect.composio.dev/mcp. This enrollment never uses HIVEMIND's shared Composio API key. No free-plan allowance or transferable API-project billing is assumed.

Credentials stay in a per-user/workspace Durable Object, AES-GCM encrypted using a Worker secret and object identity as associated data. No token returns to the browser. Disconnect removes our credentials; provider metadata does not advertise revocation, so the UI accurately asks users to remove the authorization in Composio too.

Production status initially failed because Cloudflare does not implement fetch redirect=error. Manual redirects plus explicit rejection now pass in actual workerd. Ten Worker checks (including full callback/MCP/two-user simulation), four React checks and refresh serialization pass. Authenticated SINGULANCE card and anonymous 401 verified; no real grant is claimed. These are separate from Sakana acceptance.
