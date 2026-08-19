# HIVE-MIND frontend on Cloudflare Workers

`hivemind-web` is a static-asset Worker. It serves the Create React App build at
the edge; it does not proxy, host, or replace HIVE-MIND Core, Control Plane,
Employees, databases, Qdrant, Redis, uploads, or Memory Boxes.

## Release invariant

The HIVE-MIND parent repository pins the frontend commit at
`frontend/Da-vinci`. Build and deploy that pinned commit only. Do not connect an
unrelated Da-vinci branch directly to the production Worker, because it breaks
the parent release's source-to-runtime provenance.

## Cloudflare Workers Builds configuration

Create a dedicated Worker named `hivemind-web` in the Singulance account, then
connect the Da-vinci repository.

| Setting | Production value |
| --- | --- |
| Worker name | `hivemind-web` |
| Production branch | `singulance-main` after the parent gitlink is merged |
| Build command | `npm ci && CI=true npm run build:cloudflare` |
| Deploy command | `npx wrangler deploy` |
| Non-production deploy command | `npx wrangler versions upload` |
| Root directory | repository root when Da-vinci is connected directly |

For the initial preview, use this branch and keep the non-production deploy
command above:

```text
codex/cloudflare-pages-frontend
```

Workers Builds creates a preview version rather than promoting that branch to
the active deployment. The Wrangler configuration serves `build/` and uses
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
