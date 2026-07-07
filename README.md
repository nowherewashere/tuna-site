# Tuna VPN — website (frontend)

The conversion website / web cabinet for Tuna VPN. It is a **pure client** of the
bot's public API (`/api/v1/public/*`) — the single backend. There is **no site
database, no Remnawave calls, and no server business logic here**: authentication,
subscriptions, devices, payments and Remnawave orchestration all live in the
Python backend (`remnashop/`). See `specs/tuna-vpn-website-backend-spec-en.md`.

- UI/UX/brand follow `tocheck/tuna-vpn-website-spec-v2-en.md` (V2).
- Auth is passwordless: email → 6-digit code → session (httpOnly JWT + refresh
  cookies set by the API). All API calls go through `src/lib/api.ts`.

## Architecture

```
Browser ──▶ this SPA (Next.js, client-only) ──▶ /api/v1/public/*
                                                     │ (same origin)
                                     nginx proxy ────┘──▶ Python app (bot backend)
```

Same-origin is what keeps the auth cookies first-party. In production nginx serves
this SPA at `/` and proxies `/api/v1` to the app. In local dev, `next.config.ts`
rewrites `/api/v1/*` to `NEXT_PUBLIC_API_ORIGIN` (default: the prod bot domain).

## Getting started

```bash
cp .env.example .env.local   # optional: point NEXT_PUBLIC_API_ORIGIN at your backend
npm install
npm run dev                  # http://localhost:3000
```

By default `npm run dev` talks to the production API at
`https://tunashop.tuna-transfer.xyz`. The backend must have `WEB_ENABLED=true`.

## Build

```bash
npm run build
```

## Deploy (production)

CI builds a self-contained image (`ghcr.io/nowherewashere/tuna-site`) — a tiny
nginx serving the static `out/` on port 80. Run it as one more service on the
bot's docker network:

```yaml
services:
  tuna-site:
    image: ghcr.io/nowherewashere/tuna-site:latest
    restart: unless-stopped
    networks: [remnawave-network]
```

The front nginx (TLS + Cloudflare) adds a `tuna-vpn.com` server block that
proxies `/` to `tuna-site` and `/api/v1/(public|connect)` to the app
(`remnashop`). No Node server or database is required for this site. See the
backend spec §9 and the deploy runbook.
