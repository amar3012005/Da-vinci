# frontend/Da-vinci/ — HIVEMIND web app (CRA + Tailwind + lucide-react + framer-motion)

**Its own git repo** (not the parent's tree — it's a gitlink/submodule). Deployed as `hm-fe`.
**Invoke the `hivemind-frontend` skill before building/restyling any in-app page** (exact light-theme tokens + component recipes). Use `hivemind-popup` for modals.

## Orientation
- `src/components/hivemind/app/` — the logged-in app: `HiveMindApp.jsx` (routes), `layout/AppShell.jsx`, `pages/*`, `shared/api-client.js` (all backend calls), `auth/AuthProvider.jsx`.
- `src/components/hivemind/app/mobile/` — the `/hivemind/m/*` mobile app (MobileShell + pages).
- `src/components/mobile/` + `src/components/hivemind/` — public marketing site (NOT the app).

## Rules
- Commit + push **this repo first**, then bump the parent gitlink (per `PRODUCTION_RELEASE_PROTOCOL.md`). A frontend commit not referenced by the gitlink is not releasable.
- Reuse existing api-client methods + data hooks; never hand-roll a second fetch path.
- Deploy: `scripts/deploy-fe.sh <ref>` (control-plane/core URLs baked at build ARG time → redeploy = rebuild). Auto-deploy FE changes; verify at the live URL.
- Verify a component visually with the `ui-preview` skill; parse with babel before commit.
