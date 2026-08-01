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
RUN printf ':80 {\n  root * /srv\n  encode gzip\n  @service_worker path /sw.js\n  header @service_worker Cache-Control "no-cache, no-store, must-revalidate"\n  try_files {path} /index.html\n  file_server\n}\n' > /etc/caddy/Caddyfile
EXPOSE 80
