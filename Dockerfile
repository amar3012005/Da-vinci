# HIVEMIND dashboard (CRA) — build static, serve with Caddy. Build-time API URLs come from
# .env.production (CRA reads it automatically), so no build-args to thread.
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund
COPY . .
ENV GENERATE_SOURCEMAP=false
# Bake the SINGULANCE control-plane + core URLs at build time. CRA inlines REACT_APP_* envs into the
# bundle; without these, theme.js falls back to the hardcoded davinciai host and the whole OAuth flow
# (login → redirect) routes through davinciai instead of singulancelabs. Overridable via --build-arg.
# NOTE: this Dockerfile builds the self-hosted hm-fe image only; the Vercel davinciai deploy uses its
# own build pipeline + dashboard env, so these defaults do not affect it.
ARG REACT_APP_CONTROL_PLANE_URL=https://api.singulancelabs.com
ARG REACT_APP_CORE_API_URL=https://core.singulancelabs.com
# PRODUCT_HOST=true → single-domain product layout: / = SINGULANCE cover, /hivemind = HIVEMIND cover,
# /hivemind/app = dashboard (all served locally). This is the self-hosted singulancelabs image.
ARG REACT_APP_PRODUCT_HOST=true
# Campaign Intelligence V2 is additive. Set this to false to restore the
# existing Campaign Room surface without rolling back the frontend image.
ARG REACT_APP_CAMPAIGN_INTELLIGENCE_V2=true
# PostHog product analytics + session replay (public project key phc_…, EU host).
# Empty key → SDK is a no-op, so the build is safe before the key is provided.
ARG REACT_APP_POSTHOG_KEY=
ARG REACT_APP_POSTHOG_HOST=https://eu.i.posthog.com
ENV REACT_APP_CONTROL_PLANE_URL=$REACT_APP_CONTROL_PLANE_URL
ENV REACT_APP_CORE_API_URL=$REACT_APP_CORE_API_URL
ENV REACT_APP_PRODUCT_HOST=$REACT_APP_PRODUCT_HOST
ENV REACT_APP_CAMPAIGN_INTELLIGENCE_V2=$REACT_APP_CAMPAIGN_INTELLIGENCE_V2
ENV REACT_APP_POSTHOG_KEY=$REACT_APP_POSTHOG_KEY
ENV REACT_APP_POSTHOG_HOST=$REACT_APP_POSTHOG_HOST
RUN npm run build

FROM caddy:latest
COPY --from=build /app/build /srv

# Cache-Control policy. The matchers are MUTUALLY EXCLUSIVE on purpose — an earlier
# version assumed "later matched header wins", which is not how Caddy behaves: it
# merges every `header` directive into one handler, and a matcher-less `header` beats
# a matched one for the same field. So the /static/* exception silently never applied
# and the 857 KB content-hashed bundle was served no-store, re-downloading on every
# page load. Verified empirically (real container, real curl), not just `caddy validate`.
# Cache-Control policy:
#   1. Everything defaults to no-cache — this is what actually served a
#      stale Connectors page after a real deploy: index.html (served both
#      directly AND as the SPA fallback for every app route via try_files)
#      had NO Cache-Control at all, so the browser's heuristic freshness
#      window let it satisfy even the service worker's own network-first
#      fetch() straight from HTTP cache, invisible to a user hard-refresh.
#   2. /static/* is the one deliberate exception: CRA content-hashes those
#      filenames, so a changed file is a NEW url — safe to cache forever.
#   3. /sw.js itself stays no-cache (kept explicit, redundant with rule 1,
#      so this exception can never accidentally regress it back to cached).
RUN printf ':80 {\n  root * /srv\n  encode gzip\n  @immutable_assets path /static/*\n  @volatile not path /static/*\n  header @volatile Cache-Control "no-cache, no-store, must-revalidate"\n  header @immutable_assets Cache-Control "public, max-age=31536000, immutable"\n  @service_worker path /sw.js\n  header @service_worker Cache-Control "no-cache, no-store, must-revalidate"\n  try_files {path} /index.html\n  file_server\n}\n' > /etc/caddy/Caddyfile
EXPOSE 80
