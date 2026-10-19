# User-owned OpenRouter connection — release evidence, 19 October 2026

Runtime source: 4658a5cd9e1f715055aa1b7750f3afa8d2f62e2b. OpenDot: 742b173138e40278ba63f11f09ce147e0ff54c10. Frontend product source: 1f27d4e0b064c45313b6462aa4abbe2ce4aebeb4; Worker 1b0fd613-cb3e-4251-9e68-261bba52f2b6. This document updates evidence only.

| Item | Code | Deployed | Live verified |
| --- | --- | --- | --- |
| Usage connection card, cloud consent, separate Free-mode selection | [x] | [x] | [x] card/status in SINGULANCE; selection awaits grant |
| Same-origin authenticated Worker transport | [x] | [x] | [x] authenticated status / anonymous 401 |
| Server PKCE exchange, encrypted user/workspace grant, single-use state | [x] | [x] | [ ] real OAuth pending |
| Native model adapter with zero-price free routing and no paid fallback | [x] | [x] | [ ] real inference pending |
| Bounded pre-output retry; stop on account quota or partial output | [x] | [x] | [ ] controlled provider tests only |
| OpenRouter-reported key usage; unavailable values remain unavailable | [x] | [x] | [ ] actual key pending |
| Automatic provisioning outside the ChatGPT bridge registry | [x] | [x] | [ ] isolated native profile tested; real grant pending |
| OpenDot provider catalog, routing and account erasure | [x] | [x] | [ ] native adapter/container tests only |
| Separate Brain native-provider consumption | [ ] | [ ] | [ ] separate owner, not changed |
| Real user OAuth and free tool-call round trip | [x] | [x] | [ ] human authorization pending |

Four services deployed healthy on srv2069173. Existing mounts and unrelated services preserved. This release did not deploy Core or Control. Existing users retain their provider until explicitly connected and switched. Usage card evidence is SINGULANCE, not Sakana acceptance.

Passed: native account/worker/service cases, 15 ChatGPT connection regression cases, full Runtime typecheck, isolated bridge profile and OpenDot cached-image adapter/model/erasure checks. Actual free-provider calls were simulated; no real quota or token cost is inferred from those tests.
