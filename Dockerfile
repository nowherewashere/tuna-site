# syntax=docker/dockerfile:1

# ── Build the static SPA ──────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN BUILD_STATIC=true npm run build

# ── Ship only the static output ───────────────────────────────────────────────
# No web server here: the existing nginx serves the files. This one-shot image
# carries `out/` and, when run by docker compose, syncs it into /dist — a volume
# nginx mounts read-only — then exits.
FROM alpine:3.20
COPY --from=build /app/out /site
CMD ["sh", "-c", "cp -a /site/. /dist/ && echo 'tuna-site static synced to /dist'"]
