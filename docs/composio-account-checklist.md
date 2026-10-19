# Composio own-account enrollment — 2026-10-19

Scope: Connectors page only. Hosted Composio Connect MCP OAuth, not toolkit authorization under HIVEMIND's shared project. Runtime and HyperAgents are not wired to this connection in this release.

| Check | Code | Deployed | Live verified |
|---|---|---|---|
| Hosted OAuth authorization-code + S256, registered redirect | yes | pending | provider discovery confirmed; human grant pending |
| Authenticated user/workspace routing, no caller-supplied identity | yes | pending | isolated contract tests |
| Encrypted tokens, serialized refresh, disconnect deletion | yes | pending | isolated contract tests |
| Callback verifies MCP tools before reporting connected | yes | pending | mocked provider round trip; real grant pending |
| Connectors card with consent and accurate staged access | yes | pending | React tests; browser pending |

Provider discovery: https://connect.composio.dev/.well-known/oauth-authorization-server and /.well-known/oauth-protected-resource/mcp. Fixed MCP resource https://connect.composio.dev/mcp. No SDK session or HIVEMIND shared Composio API key is used by this enrollment. No free-plan allowance or transferable API-key billing is assumed.

OAuth credentials stay in a per-user/workspace Cloudflare Durable Object, AES-GCM encrypted using COMPOSIO_ACCOUNT_ENCRYPTION_KEY with object identity as associated data. No token is returned to the browser. Provider metadata does not advertise revocation; disconnect removes our credentials and explicitly reports that provider authorization must also be removed in Composio.

Not yet activated: agent execution, toolkit routing, account-deletion erasure integration. Completing OAuth does not switch existing agents or shared-project toolkit connections. These remain separate follow-up work, per the requested authentication-only scope.
