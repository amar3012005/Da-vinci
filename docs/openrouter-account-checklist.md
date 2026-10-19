# User-owned OpenRouter connection

Task branch: codex/openrouter-account. Runtime companion: /tmp/runtime-openrouter.

| Item | Code | Deployed | Live verified |
| --- | --- | --- | --- |
| Usage connection card, cloud consent, separate Free-mode selection | [x] | [ ] | [ ] |
| Same-origin authenticated Worker transport | [x] | [ ] | [ ] |
| Server PKCE exchange, encrypted per-connection grant, single-use state | [x] | [ ] | [ ] |
| Native model adapter with zero-price free routing and no paid fallback | [x] | [ ] | [ ] |
| Bounded pre-output retry; stop on account quota or partial output | [x] | [ ] | [ ] |
| OpenRouter-reported key usage; unavailable values remain unavailable | [x] | [ ] | [ ] |
| Real user OAuth and tool-call acceptance | [ ] | [ ] | [ ] |
| Automatic connection provisioning for users outside the existing bridge registry | [ ] | [ ] | [ ] |
| Open Dot and separate Brain native-provider consumption | [ ] | [ ] | [ ] |

Evidence: two React checks (including StrictMode single exchange), two Worker transport checks,
four account checks, three native worker checks, and 15 existing ChatGPT connection regression checks. Native text streaming verified with mock OpenRouter
HTTP responses, not a real account. Free-only payload contains max_price prompt/completion 0.
Native 503 responses dispatch at most twice; daily 429 quota dispatches once.
Current credential storage and transport are reused; no Core or Control changes.

Release gate: current bridge is account-erasure-d550774, ahead of the available Runtime bridge
source baseline 04e826f63c. Preserve and reconcile that erasure change before releasing the worker.
No live deployment or user account connection has occurred for this feature.

Provider facts: OAuth creates an account API key, not a refresh-token grant. openrouter/free selects
an eligible free model randomly, rather than guaranteeing a best-ranked model. Account-wide quotas
cannot be bypassed by rotating models. This first implementation intentionally offers Free only.

Docs: https://openrouter.ai/docs/guides/overview/auth/oauth
https://openrouter.ai/docs/guides/routing/model-variants/free
https://openrouter.ai/docs/cookbook/get-started/free-models-router-playground

Type-check note: the broader source graph reports existing SessionProjection and vendored Cordis type errors;
that broader check is not recorded as passing. OAuth, HTTP and text streaming checks use controlled mocks.
