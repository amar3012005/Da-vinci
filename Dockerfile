# HIVEMIND dashboard (CRA) — build static, serve with Caddy. The API URLs are baked at build time.
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund
COPY . .
ARG REACT_APP_CONTROL_PLANE_URL
ARG REACT_APP_CORE_API_URL
ENV REACT_APP_CONTROL_PLANE_URL=$REACT_APP_CONTROL_PLANE_URL \
    REACT_APP_CORE_API_URL=$REACT_APP_CORE_API_URL \
    GENERATE_SOURCEMAP=false
RUN npm run build

FROM caddy:latest
COPY --from=build /app/build /srv
RUN printf ':80 {\n  root * /srv\n  encode gzip\n  try_files {path} /index.html\n  file_server\n}\n' > /etc/caddy/Caddyfile
EXPOSE 80
