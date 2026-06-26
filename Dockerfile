# HIVEMIND dashboard (CRA) — build static, serve with Caddy. Build-time API URLs come from
# .env.production (CRA reads it automatically), so no build-args to thread.
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund 2>/dev/null || npm install --legacy-peer-deps --no-audit --no-fund
COPY . .
ENV GENERATE_SOURCEMAP=false
RUN npm run build

FROM caddy:latest
COPY --from=build /app/build /srv
RUN printf ':80 {\n  root * /srv\n  encode gzip\n  try_files {path} /index.html\n  file_server\n}\n' > /etc/caddy/Caddyfile
EXPOSE 80
