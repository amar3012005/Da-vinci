# Native long-chat window audit — 6 October 2026

Source inspected: deepseek-harness-hivemind, exact cb14eb1beeb9178f2a92b45c3f4ec80f4b3411ca.
Current DSH MCP documentation tools are not exposed in this server session. Native checked-in README/contracts were inspected as the explicit fallback; no undocumented replacement engine was added.

## Verified current behavior

- `packages/api/session-controller/src/client/sessions/session.ts` has `PAGE_MESSAGES=50`, `loadOlder()` and `loadThrough(seq)` with native beforeSeq cursors. `loadThrough` handles a shrinking target, concurrency, stale generations and no-progress protection.
- These pages count append-surface user/assistant messages, not completed runs. Changing the constant alone cannot promise 10–20 complete runs.
- `packages/api/session-controller/src/history.ts` pages a dense immutable event prefix. `sourceFor()` calls `sessionQuery.observeSession()`. Follow needs the native projection baseline and subagent authorization needs the durable parent/mode descriptor.
- `packages/session-query/session-query/src/cold-read.ts` calls `handle.read(0, undefined)` and adds deterministic interrupted-turn closers. The complete cold log is read before UI pagination.
- `packages/session-query/session-query/src/observation.ts` prepares a complete unpublished Session and caches its exact revision. This serves many consumers beyond chat rendering.
- PostgreSQL persistence already has a tenant-scoped offset/length SELECT. It does not expose a message-boundary tail API or persisted projection baseline suitable for replacing full observation in the history controller.

## Required native implementation

1. Extend the native history/persistence seam with an immutable message/turn-aligned window, fixed throughSeq cursor, and explicit hasMore. Include compact sourceEventSeqs groups; do not break turn/step assembly by applying an arbitrary event LIMIT.
2. Provide the exact native projection/lineage baseline at that cursor, through the existing projection cache or a verified durable checkpoint. Do not treat an incomplete tail as a complete Session seed.
3. Have the existing history controller use that window for cold page/follow setup. Preserve the current carrier-follow-before-page buffer, cursorless assistant settlement, gap repair, direct-child authorization and ownership behavior.
4. Keep UI `loadOlder`, `loadThrough`, date jump and prepend anchors. Define first-open target as 10–20 complete runs; account for messages-only users and multiple assistant narrations.
5. Test large actual PostgreSQL sessions: bounded rows/bytes on first open, stable concurrent append cut, top-scroll and cold day jump, inherited/direct-child authorization, interrupted-tail balance and reconnect settlement. Compare first-open latency against the present complete-log path.

## Boundary

No native history code or production data was changed in this audit. Current progressive UI paging is real; bounded database cold loading remains unfinished. A simple page-size change would misrepresent that requirement.

## Follow-up source review (server continuation)

The configured DSH documentation MCP was called over its local stdio transport with `docs_search` and `docs_read`. It returned revision/branch `null`; the copied `capability-seams.md` differs from the active cb14 file. Its architectural description is advisory. The native contracts listed below were checked directly at cb14.

The existing projection registry **does** support suffix restoration: `sessionProjections.restoreFloor(checkpoint)` and `restore(checkpoint, events, baseSeq, header, inheritedEventCount)`. The cache currently exposes `coldSnapshot` only for a complete log; it needs a narrow tail-reader entrypoint, with identity validation and a complete-log fallback when checkpoint rows are missing, incompatible, or ahead of the durable cut. PostgreSQL stat exposes cheap `eventCount`, and handle reads support offset/length under tenant scope.

A bounded presentation cut must stay separate from `SessionObservation`: that type promises a complete contiguous event prefix, and the follow path promotes a prepared observation into an Agent. Never seed `Session.prepare` with a UI tail or weaken that type's promise. Agent activation can retain its existing complete context construction independently; the opening presentation must not wait for it. Preserve the initial follow subscription before reading the cut and perform exact-cursor deduplication when activation emits events.

Frontend functional source `b014d88d` was reviewed again. The native resolver hook is present in cb14 `ui-hivemind-connect`; the onboarding callback fires only after company location is saved. The overlay keeps the current room mounted, disables task/invite/onboarding sections, and reuses existing company data. Its four focused tests pass on the server. Browser verification and deployment are still required. No bounded native-history implementation is claimed.
