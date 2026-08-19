# HIVE-MIND frontend on Cloudflare Workers

`hivemind-web` is a static-asset Worker. It serves the Create React App build at
the edge; it does not proxy, host, or replace HIVE-MIND Core, Control Plane,
Employees, databases, Qdrant, Redis, uploads, or Memory Boxes.

## Release invariant

`main` is the only production source for `hivemind-web`. Every frontend change
must be reviewed and merged into `main` before Cloudflare may deploy it. Never
promote a feature branch, a local worktree, an old parent-repository gitlink, or
an arbitrary previously-built asset bundle.

The release identity is the exact merged `origin/main` SHA. Record that SHA in
the Worker deployment message and verify that its public hashed assets are the
ones returned by `next.singulancelabs.com`.

## Cloudflare Workers Builds configuration

Create a dedicated Worker named `hivemind-web` in the Singulance account, then
connect the Da-vinci repository.

| Setting | Production value |
| --- | --- |
| Worker name | `hivemind-web` |
| Production branch | `main` |
| Build command | `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci --no-audit --no-fund && CI=true npm run build:cloudflare` |
| Deploy command | `npx wrangler deploy --keep-vars --strict --message "Da-vinci main <SHA>"` |
| Non-production deploy command | `npx wrangler versions upload` |
| Root directory | repository root when Da-vinci is connected directly |

Non-production branches create preview versions only. A preview must never be
promoted by itself: merge its PR, fetch `origin/main`, then build and deploy
that resulting SHA. The Wrangler configuration serves `build/` and uses
Cloudflare's SPA fallback, so direct navigation to `/hivemind/login?create=1`
returns the application shell.

`build:cloudflare` removes two unreferenced historical media files and the
Pages-only `_redirects` rule from the *build artifact only*. They are retained
in source. The media exceeds Workers Static Assets' 25 MiB per-file limit;
Workers' native SPA setting replaces the redirect rule.

## Caching

- `index.html` is never stored as a long-lived response.
- CRA's content-hashed `/static/*` assets are immutable for one year.
- API and authentication requests remain direct browser requests to their
  existing service origins. This Worker must not be configured as an API proxy.

## Cutover gates

Before mapping `next.singulancelabs.com` to this Worker, prove all of the
following against the preview URL:

1. Direct loads and refreshes of `/hivemind/login?create=1` and authenticated
   `/hivemind/app/overview` succeed.
2. OIDC login/callback and Composio OAuth return to the same frontend origin.
3. Core and Control Plane CORS allow the final frontend origin if it changes.
4. Browser SSE chat, upload, and an authenticated API call succeed.
5. A fresh deploy yields a new `index.html` while a prior hashed chunk remains
   cacheable.

Keep the Docker frontend running as the rollback origin until the custom-domain
canary passes. DNS/custom-domain cutover is a separate, explicit production
release step.

## Production procedure

1. Open a PR from a short-lived feature branch to `main`; run the relevant
   frontend tests and production build in CI.
2. Merge the PR, then create a clean, external worktree at `origin/main`. Do
   not build from a dirty checkout or a worktree under `.claude`/`.codex`.
3. Build and deploy that exact SHA with the production commands above.
4. Verify the public custom domain returns Cloudflare, the current asset hash,
   the intended feature chunk, authentication callback origin, CORS, an
   authenticated chat SSE turn, and an upload.
5. Record the SHA, Worker version, domain checks, and rollback version in the
   release ledger. If a canary fails, roll back to the previous Worker version;
   do not rebuild an old feature branch.

## Server frontend retirement

The Docker frontend is **not** a duplicate of the Worker yet. It still serves
other public hosts (including the root marketing/admin/personal/enterprise
origins). `next.singulancelabs.com` is now served by the Worker, but the Docker
frontend and its Caddy routes must remain until every remaining host has its
own Cloudflare target and has passed the same browser canary.

Only then may the frontend service be disabled in the server deploy workflow.
Keep Core, Control Plane, and all API origins on their existing services; the
static Worker is deliberately not an API proxy.
