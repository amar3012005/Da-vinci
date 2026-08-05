# Knowledge Base — Upload UX

`KnowledgeBase.jsx` is the `/hivemind/app/knowledge` page: pick files → choose a
scope → durable async ingest → memories + evidence surface on the Memories page.

This README is the contract for the upload UX. The guiding rule: **the UI must
never mislead.** A bar at 100% means done; a spinner means work is genuinely in
flight; "already in your knowledge base" means the *database* said so.

## Flow

```
select files → UploadScopeModal (scope + page cost) → handleFiles → uploadOne (per file)
   → apiClient.uploadDocument  → POST /upload?async=true → 202 { job_id }
   → poll /knowledge/status until TERMINAL → row settles with real counts
```

Ingestion is durable and server-side (BullMQ). The browser only kicks it off and
polls; closing the tab does not stop it.

## Progress model (why it is not misleading)

A row is in exactly one **status**: `queued → uploading → success | duplicate |
limited | error | cancelled`. Every one of the last five is **terminal**.

- **Per-file bar** — real byte % while `uploading`; an indeterminate shimmer only
  while the server is parsing (`stage: 'processing'`). It stops the instant the
  row reaches a terminal status.
- **Overall bar** — `totalProgress` counts every terminal row as 100%, not just
  `success`. So the bar reaches 100% exactly when nothing is in flight, and the
  "All uploads complete" banner can never show next to a sub-100% bar.
- **Spinner lifecycle** — `uploadDocument` resolves when the poll sees a terminal
  server status. Terminal is **`ready` OR `indexed`** (the job store completes as
  `ready`; the Redis mirror says `indexed`) plus `failed`/`dead`. Accepting only
  `indexed` was the bug that spun forever when the server returned `ready`.

## Dedup is database-authoritative

Duplicate detection lives in the **backend**: it sha256's the bytes and checks
`knowledge_ingest_jobs` for this org+scope (`upload-job-store.findDuplicate`) →
`409 { duplicate: true }`. The UI does **not** short-circuit against the browser's
fetched doc list — that cache goes stale (a server-deleted doc lingers) and
produced false "already uploaded" skips. The client hash is computed only to
stamp the local `doc-hash:` tag for optimistic list convergence; it never decides
dedup.

## Scope selection

Three tiers, gated by **role**, matching the backend `authorizeKnowledgeScope`:

| Tier | Who | Server scope |
|---|---|---|
| My Space | everyone | `personal` |
| Project | everyone (pick a project you belong to; admins see all) | `project` |
| Entire organization | owner/admin only | `organization` |

There is **no plan-tier gate** on the tiles — the old `plan === team|enterprise`
check greyed out scopes the server would actually accept.

## Page-cost gate (pages only, never LLM tokens)

The scope modal estimates **plan pages** per file *in the browser* before any byte
leaves — `image → 1`, `pdf → real page count` (dependency-free: reads the PDF page
tree), other documents → `1` (the real count settles server-side). It mirrors the
backend `upload-service._estimatePages`.

- The batch shows total pages and pages remaining (`kbPages` quota only).
- If the batch exceeds the remaining page quota, **Upload is disabled** and an
  **Upgrade** CTA opens the existing `<PlanLimitModal>`; the user can also drop
  files with the per-row ✕ to get back under the limit.
- **LLM token usage never gates an upload.** Only the page meter does.

## Fixed-size modal, internal scroll

`UploadScopeModal` is `max-h-[88vh] flex flex-col`. The header and footer are
pinned; the batch list + scope tiers scroll inside (`overflow-y-auto`), and the
file list itself caps at `30vh`. A 25-file batch can no longer push the Upload
button off-screen.

## Clean upload, any doc type

Supported: pdf, docx/doc, xlsx/xls, pptx/ppt, txt, md, csv/tsv, html; images
(png/jpg/webp/gif/tiff → vision OCR); audio (whisper). The backend fails an ingest
that produced **no document or zero memories** (`NO_RECALLABLE_CONTENT`) rather
than reporting a false success, and every accepted upload yields verbatim
**evidence segments** + distilled **memories**.
