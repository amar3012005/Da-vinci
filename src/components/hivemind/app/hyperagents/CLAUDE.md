# HyperAgents — agent working guide

This is the **HyperAgents / Digital-Employees** surface: onboard a company from its
URL, then run domain rooms where AI specialists gather → debate → seal a report and
take real outbound actions (email/call). Read this before touching anything under
`hyperagents/` or the backend it talks to. It is the map; the code is the truth.

## The one-liner
User pastes a URL → we build their AI company (profile, mission, 3 specialists, tasks) →
they click a task → a room auto-runs (skills + memory + web + connectors) → seals a
**domain-specific report** → value **exits** (Gmail send / TARA call) → outcomes are
tracked and the workforce **learns**. "Run your company as an AI company."

## Where the code lives (both repos)
Frontend (`frontend/Da-vinci`, this folder + one big page):
- `pages/HyperAgents.jsx` — THE page (~5k lines). Room list, thread, SSE+poll streaming,
  `TurnView`, `TaskSynthesisRenderer` (room-kind report desks), tool timeline, approvals.
- `hyperagents/CompanyDashboard.jsx` — the `/employees/mycompany` hero (company, tasks, outcomes strip).
- `hyperagents/HyperOnboarding.jsx` + `OnboardingTerminal.jsx` — URL→company genesis UI.
- `hyperagents/elements/` — **element-level UI (put new report artifacts HERE, not inline in the page):**
  - `LiveActionCards.jsx` — `EmailComposeCard` (Gmail-style, realtime typing, one-click send,
    per-room auto-send toggle) + `CallRingingCard` (TARA dial overlay, pulse rings).
  - `EmailBlock.jsx` — structured read-only email artifact (`parseEmailMarkdown` detects a
    `Subject:`-led section → envelope rows + letter body). Outreach reports use this so emails
    never render as raw markdown.
  - `GmailConnectGate.jsx` — the "give your agents outreach powers" nudge (demo compose types
    live even when disconnected; Connect routes to `/hivemind/app/connectors?connect=gmail`).
  - `index.js` — barrel; the page imports from `../hyperagents/elements`.
- `shared/api-client.js` — `startHyperOnboarding`, `hyperCompany`, `hyperOutcomes`,
  `openHyperTask`, `postHyperTurn`, `callHyperRoom`, `getConnectorConnectionStatus`.

Backend (`employees-service/src/hivemind_employees/`):
- `hyper/engine.py` — the `Director`: PLAN → parallel GATHER → optional DEBATE → SYNTH.
  Holds `_REPORT_SKELETON` (per-kind report headings), `_REPORT`/skill injection, `_synthesize`,
  `_consult`/`_debate`, evo playbook read/reflect, OpenRouter provider pins.
- `hyper/skills/` — METHOD skill registry (md files per room kind) + loader; catalog is
  progressive-disclosure (planner sees names, bodies load on demand → blackboard).
- `api_hyper_rooms.py` — the sidecar orchestrator: turn dispatch, `_orchestrate_single_agent`,
  `_verify_and_emit` (grounding gate), `_produce_output` (email/doc/sheet/call), `next_tasks`,
  `resolve_room_kind`, room/agent playbook persistence, event emission.
- `db.py` — `get_room_playbook`/`update_room_playbook`, `get_company_name`, employee store.
- `hivemind_client.py` — recall/canon (`recall_emulated`, `list_canon_emulated`), connector exec.

Control-plane (`core/src/control-plane-server.js`): onboarding pipeline, `/v1/hyper/*` routes
(company, tasks/open, outcomes, rooms/:id/turns, /approve, /send-email, /call), room create,
one-company-per-org replace on re-onboard.

Core (`core/src/`): `connectors/mcp/catalog-seed.js` (connector catalog incl. google-maps),
`connectors/google-native.js` (Gmail/Docs writes), `billing/usage-tracker.js` (metering),
`connectors/providers/gmail/` (send + reply detection), prisma schema (`outbound_actions`,
`OrgUsage.emailSends`, `hyper_rooms.room_playbook`).

## The turn pipeline (single-director engine)
`api_hyper_rooms._orchestrate_single_agent` → `engine.run_director`:
1. **resolve_room_kind** — turn MESSAGE first, then room goal/keywords → market | content |
   outreach | business | strategy | general. Drives skill catalog + report skeleton.
2. **PLAN** (`_plan_gather`) — one director call → `{recall_queries, connector_calls, web_query,
   needs_debate, method_skills}`. Skill catalog + room_playbook lessons primed here.
3. **GATHER** (`_run_gather`) — concurrent recall + connector reads + Tavily web + skill-body
   loads → `self.blackboard`. Each task shown under a real participant (typing → contribution).
4. **DEBATE** (`_debate`, when needs_debate) — lead + reactors, R1 stances → R2 challenge.
   Empty voices dropped (no "(no reply)").
5. **SYNTH** (`_synthesize`) — writes the deliverable. `intended_output` (answer/doc/email/sheet)
   sets FORMAT; `room_kind` sets the report SKELETON (fixed `## ` headings). Evidence contract:
   cite lane per section, flag UNVERIFIED, `## Gaps to confirm`.
6. **PRODUCE** (`_produce_output`) — email/doc/sheet/call artifact; recipient-less email still drafts.
7. **VERIFY** (`_verify_and_emit`) — deterministic company-grounding gate: company-scoped turn with
   no brief → grounded_ok=false + escalated (never fabricate). Canonical-name substitution blocked.
8. **SEAL** — status complete|escalated|blocked; then `next_tasks` (cheap 120b) → clickable follow-ups.
9. **LEARN** — evo reflection writes agent + room playbooks (flag-gated) → primes next turn.

## Room kinds → report desks (must stay in sync FE↔BE)
Each kind seals fixed headings (engine `_REPORT_SKELETON`) rendered as a themed row-card desk
(page `SYNTHESIS_PRESENTATIONS` + `SECTION_ICONS`, keyed by `room_kind` from `skill_used` events):
- **market** → Competitive Landscape / Where We Win / Threats & Gaps / Recommended Moves (Competitive desk)
- **content** → Content Pillars / Editorial Calendar / Hooks & Angles / Distribution (Editorial desk)
- **outreach** → ICP / Prospect List / Sequence / Success Metrics (Outreach desk)
- **business** → Unit Economics / Pricing & Positioning / Key Risks / The One Thing That Kills This (Operating desk)
- **strategy** → Decision / Options Considered / Rationale / Tripwire (Decision memo)
- **general** → classic Exec summary → findings → recommendations → gaps (fallback, unchanged)
If you add a kind: add the skeleton (engine), a presentation + section icons (page), and skills (`hyper/skills/`).

## Streaming + events (FE contract)
Live turn = SSE (`hyperTurnStreamUrl`) + a 250ms DB fallback poll; both merge via `mergeHyperEvents`
(identity-stable — do not return a fresh array when nothing changed, it re-renders the whole thread).
On `seal`: a one-shot `sealedRef` latch does ONE quiet `load({quiet:true})` (no full-screen spinner —
that caused post-synthesis blinking). Event types the page listens for include: `plan`, `gather`,
`web_intel`, `skill_used` (carries `room_kind`), `react`, `round_start`, `approval_request`,
`approval_resolved`, `verify`, `self_evolve`, `next_tasks`, `seal`, `warning`, `sim_report`.
Add a new event → add its name to the SSE `addEventListener` list AND handle it in the merge/render.

## The outbound closed loop (value must EXIT)
`outbound_actions` ledger (core prisma) is written on **success only**:
- Gmail: `/v1/hyper-rooms/:id/send-email` or `/approve` → `gmail_send` ok → row (channel=email, threadId).
  Reply detection: `gmail/adapter.js` matches inbound threadId → `outcome=replied` (idempotent, org-scoped).
- TARA: `/v1/hyper-rooms/:id/call` → managed Deepgram TARA dials via Telnyx (allowlist gate:
  `*` = open) → row (channel=call) → call-end sets completed, insight upgrades to booked.
- Metering (`usage-tracker.js`): `emailSends` + `taraUsage` fire on the same success hook.
- Dashboard: `/v1/hyper/outcomes` + `hyperCompany().outcomes` → the outcomes strip (7d counts).
Gmail needs **compose+send scopes** (not readonly) — a readonly grant 403s; user must reconnect.

## Non-negotiable invariants (break these and you break the product)
- **Synth stays text-only** — no JSON output contract (gpt-oss harmony glitches). Report structure is
  known-heading markdown, parsed by the FE. Never make the synth emit JSON.
- **Grounding gate is deterministic** — company-scoped + no brief ⇒ escalated, never a plausible fake.
  Don't loosen it to force a green seal.
- **One company per org** — re-onboarding archives the prior company's agents/rooms/canon. Recall is
  org-wide and correct only because of this.
- **Provider pins** — `gpt-oss-120b` is Cerebras-first on OpenRouter for synth speed. Don't unpin.
- **Everything additional is flag-gated** (evo, reactor reach, skills) with a safe default; keep it so.

## Deploy (READ the repo-root release protocol — it wins over this file)
- Canonical deployable branch: **`hivemind-main`** (protected — PR only). Branch product work as
  `hivemind-hyper/*`. Frontend commits+pushes FIRST, then the parent commits the exact gitlink.
- Build ONLY from a clean detached worktree `/root/builds/<release-id>` at a pushed SHA — never from
  `/root/hivemind`/`hivemind-next` dirty. Immutable tags `prod-YYYYMMDD-<sha>`; Compose deploys that
  exact tag; retag current image as rollback before replacing; recreate `--no-deps --force-recreate`;
  wait for health per service. Repoint `stable`/`latest` only after authenticated acceptance.
- Release helper on the box: `bash /root/release-singulance.sh <sha> <svc...>` (svc = core control-plane
  employees tara-deepgram fe). Catalog reseeds on core boot.
- **Parallel-session rule:** only deploy SHAs that are descendants of `hivemind-main`. If your branch
  isn't a descendant, you branched stale — rebase, never clobber. Two sessions have regressed each
  other by deploying diverged branches; this rule is why.

## Verify a change end-to-end (never trust green over reality)
- Backend logic: unit-invoke the Director (`AGENTSCOPE_DISABLE_CONSOLE_OUTPUT=true`, stub `_groq`) or
  a live turn via `POST /v1/hyper-rooms/:id/turns` with a disposable redis session
  (`cp:session:<id>` → Bearer `<id>`); assert on the sealed `hyper_turns.lines` in Postgres
  (user `hivemind_user`, db `hivemind`).
- FE: `CI=false npm run build` (must Compiled), then grep the served `/srv/static/js/*.js` chunk for
  your marker string after deploy.
- Prod PG is `hivemind_user`/`hivemind`; control-plane sessions are redis-backed.
