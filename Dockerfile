# syntax=docker/dockerfile:1

# ── Build the static SPA ──────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN BUILD_STATIC=true npm run build

# ── Serve the static SPA with a tiny nginx (port 80) ──────────────────────────
# A normal long-running service: the front nginx proxies tuna-vpn.com here and
# routes /api/v1/(public|connect) straight to the app. See README.
FROM nginx:alpine
COPY --from=build /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
