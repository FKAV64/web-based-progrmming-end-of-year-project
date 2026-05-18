# Angular + RxJS Crypto Dashboard

> Real-time cryptocurrency tracking dashboard built with Angular 17 (signals + RxJS) and a NestJS 11 API.

![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Backend CI](https://github.com/FKAV64/web-based-progrmming-end-of-year-project/actions/workflows/backend-ci.yml/badge.svg)
![Frontend CI](https://github.com/FKAV64/web-based-progrmming-end-of-year-project/actions/workflows/frontend-ci.yml/badge.svg)
[![Demo](https://img.shields.io/website?label=demo&url=https%3A%2F%2Fweb-based-progrmming-end-of-year-pr.vercel.app)](https://web-based-progrmming-end-of-year-pr.vercel.app)

A full-stack crypto dashboard: live prices over WebSocket, interactive charts,
a personal watchlist, portfolio P&L tracking, price alerts with web-push
notifications, a market news/sentiment feed, multi-currency support, dark mode
and PWA install. Built as the final project for **BMU1208 Web Tabanlı
Programlama** at Bitlis Eren University.

- **Live demo:** https://web-based-progrmming-end-of-year-pr.vercel.app
- **Demo account:** `demo@example.com` / `Demo#123`

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Repository Layout](#repository-layout)
4. [Prerequisites](#prerequisites)
5. [Quick Start](#quick-start)
6. [Environment Variables](#environment-variables)
7. [Running the Apps](#running-the-apps)
8. [Testing](#testing)
9. [API & Data Model](#api--data-model)
10. [CI/CD](#cicd)
11. [Architecture](#architecture)
12. [License](#license)

---

## Features

- **Live prices** — top‑100 coins streamed via a backend Binance WebSocket proxy.
- **Interactive charts** — candle / line / area, multiple intervals (1H · 1D · 1W · 1M · YTD) with ApexCharts, pinch‑to‑zoom and crosshair.
- **Watchlist** — per‑user, persisted server‑side.
- **Portfolio** — positions (quantity × average buy price), realised/unrealised P&L, position close.
- **Price alerts** — `ABOVE` / `BELOW` thresholds evaluated server‑side against live snapshots, delivered via Web Push.
- **News & sentiment** — RSS news feed and a Fear & Greed sentiment indicator.
- **Multi-currency** — USD / EUR / TRY with live exchange-rate conversion.
- **Theming & i18n** — light / dark / system theme, TR + EN locales.
- **PWA** — installable, service worker, push notifications.
- **Security** — Argon2id password hashing; short-lived **Bearer access token** (response body) + **httpOnly `refresh_token` cookie** with rotation and instant all-device logout; structural CSRF defense (access token is never a cookie) + CORS allowlist; Helmet headers; rate limiting + account lockout; audit log. See [`docs/adr/ADR-007-threat-model.md`](docs/adr/ADR-007-threat-model.md) and [`docs/security-scan-2026-05-18.md`](docs/security-scan-2026-05-18.md).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 17 (standalone components, signals), RxJS 7, Angular Material, Tailwind CSS 3, ApexCharts (`ng-apexcharts`) |
| PWA | `@angular/service-worker`, Web Push |
| Backend | NestJS 11, Node.js 20 |
| ORM / DB | Prisma 5, PostgreSQL 16 |
| Cache | Redis 7 (CoinGecko market snapshot) |
| Realtime | `ws` Binance proxy gateway, RxJS streams |
| Auth | Argon2id, `@nestjs/jwt` + Passport JWT — Bearer access token + httpOnly `refresh_token` cookie |
| API docs | `@nestjs/swagger` → OpenAPI 3 (`docs/openapi.yaml`) |
| Tests | Jest (unit) + Supertest (backend e2e), Jest + Angular Testing Library (frontend unit), Playwright (frontend e2e) |
| CI/CD | GitHub Actions, Vercel (frontend), Railway (backend) |
| Data sources | CoinGecko API, Binance WebSocket, Alternative.me Fear & Greed, RSS news |

## Repository Layout

```
repo/
├── README.md                # this file
├── LICENSE                  # MIT
├── .env.example             # root env template
├── .gitignore
├── docker-compose.yml       # PostgreSQL 16 + Redis 7 + one-shot Prisma migrator
├── DEVELOPMENT-PLAN.md      # phase-by-phase implementation plan
├── backend/                 # NestJS 11 API (Prisma, PostgreSQL, Redis)
│   ├── src/                 #   modules: auth, users, market, watchlist,
│   │                        #   portfolio, alerts, push, settings, health,
│   │                        #   audit, dev
│   ├── prisma/              #   schema + migrations
│   ├── fixtures/            #   seed market data for the dev endpoints
│   └── scripts/             #   OpenAPI generator
├── frontend/                # Angular 17 SPA
│   └── src/app/             #   core/ · features/ · shared/
├── tests/                   # all test suites live here (moved out of the apps)
│   ├── backend/             #   backend e2e (Jest + Supertest) + jest-e2e.json
│   └── frontend/            #   frontend e2e (Playwright)
└── docs/
    ├── adr/                 #   architecture decision records
    ├── diagrams/            #   architecture diagrams
    ├── screenshots/         #   UI screenshots
    ├── openapi.yaml         #   generated API spec (+ openapi.json)
    └── security-scan-*.md   #   OWASP ZAP scan report
```

> **Note on tests:** unit specs that must stay next to their source (Angular /
> Nest convention, `*.spec.ts`) remain colocated under `frontend/src` and
> `backend/src`. The standalone end-to-end suites have been relocated to
> `tests/backend` and `tests/frontend`; the Jest and Playwright configs were
> rewired accordingly.

> **Note on CI:** GitHub Actions only reads workflows from `.github/` at the
> **git repository root** (the parent of `repo/`), so the workflow files live
> there by design — moving them into `repo/` would disable CI entirely.

## Prerequisites

- Node.js ≥ 20
- Docker + Docker Compose (local PostgreSQL & Redis)

## Quick Start

```bash
# 1. Clone
git clone https://github.com/FKAV64/web-based-progrmming-end-of-year-project.git
cd web-based-progrmming-end-of-year-project/repo

# 2. Start infrastructure (PostgreSQL 16 + Redis 7).
#    A one-shot migrator container applies the Prisma schema once
#    PostgreSQL is healthy.
docker compose up -d

# 3. Backend
cd backend
cp .env.example .env          # then fill in the secrets (see below)
npm install
npm run start:dev             # API on http://localhost:3000/api

# 4. Frontend (new terminal)
cd ../frontend
npm install
npm start                     # app on http://localhost:4200
```

## Environment Variables

The backend reads its configuration from `backend/.env` (template:
`backend/.env.example`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (default points to the Docker DB on port 5433) |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ≥ 32-byte secrets — `openssl rand -base64 48` |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token lifetimes (default `15m` / `7d`) |
| `COOKIE_DOMAIN` | Cookie domain (`localhost` in dev) |
| `FRONTEND_ORIGIN` | Allowed CORS origin |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push (VAPID) keys |
| `ARGON2_TIME_COST` / `ARGON2_MEMORY_COST` | Argon2 hashing parameters |
| `PORT` | API port (default `3000`) |
| `COINGECKO_API_KEY` | Optional CoinGecko API key |

## Running the Apps

**Backend** (`backend/`)

```bash
npm run start:dev      # watch mode
npm run start:prod     # run compiled dist/
npm run prisma:setup   # prisma generate + migrate deploy (manual fallback)
npm run openapi:generate  # regenerate docs/openapi.{yaml,json}
```

**Frontend** (`frontend/`)

```bash
npm start              # ng serve → http://localhost:4200
npm run build          # i18n production build
```

## Testing

| Suite | Location | Command (run from) |
|-------|----------|--------------------|
| Backend unit | `backend/src/**/*.spec.ts` | `npm test` (in `backend/`) |
| Backend e2e | `tests/backend/*.e2e-spec.ts` | `npm run test:e2e` (in `backend/`) |
| Frontend unit | `frontend/src/**/*.spec.ts` | `npm run test:ci` (in `frontend/`) |
| Frontend e2e | `tests/frontend/*.e2e.ts` | `npm run test:e2e` (in `frontend/`) |

The backend e2e suite uses Jest + Supertest with the relocated config at
`tests/backend/jest-e2e.json` and needs a running PostgreSQL + Redis (use
`docker compose up -d`). The Playwright e2e suite needs both the backend and
frontend running.

```bash
# Backend (PostgreSQL + Redis must be up)
cd backend && npm test && npm run test:e2e

# Frontend unit
cd frontend && npm run test:ci

# Frontend e2e (backend + frontend must be running)
cd frontend && npm run test:e2e
```

## API & Data Model

The REST API is served under `/api` and documented with OpenAPI 3 — the
generated spec lives at [`docs/openapi.yaml`](docs/openapi.yaml) (and
`docs/openapi.json`). Swagger UI is available at
`http://localhost:3000/api/docs` in development.

Endpoint groups: `auth` (register / login / refresh / logout / me),
`me` (profile, data export), `settings`, `watchlist`, `portfolio`,
`alerts`, `market` (top / coin / chart / ohlc / news / sentiment /
exchange-rates), `push`, `health`, and dev-only seeding endpoints.

**Prisma models:** `User`, `RefreshToken`, `WatchlistItem`,
`PortfolioPosition`, `PriceAlert`, `PushSubscription`, `UserSettings`,
`AuditLog` (PostgreSQL, see [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)).

After changing any controller or DTO, run `npm run openapi:generate` in
`backend/` and commit the updated spec — CI fails on spec drift.

## CI/CD

GitHub Actions workflows live at the **git repository root** in
`.github/workflows/` and run on every push / PR:

| Workflow | Triggers on | Steps |
|----------|-------------|-------|
| **Backend CI** | `repo/backend/**`, `repo/tests/backend/**` | install → Prisma migrate → lint → unit tests + coverage → e2e tests → build → OpenAPI generate + drift check |
| **Frontend CI** | `repo/frontend/**`, `repo/tests/frontend/**` | install → lint → unit tests + coverage → build → Lighthouse CI |

Lighthouse budgets: Performance ≥ 85, Accessibility ≥ 95. The `main` branch is
protected and requires both workflows to be green before merge.

## Architecture

```
[Browser PWA] ── HTTPS ──> [NestJS API (Railway)] ──> [PostgreSQL 16]
       │                          │              └──> [Redis 7]
       │                          └── WSS proxy ──> [Binance WebSocket]
       └── deployed on Vercel
```

See [`docs/diagrams/`](docs/diagrams/) and the ADRs in
[`docs/adr/`](docs/adr/) for detailed design decisions.

## License

MIT © 2026 ABDOU VALERIO FOMA KENFACK — see [LICENSE](LICENSE).

Developed as a final project for **BMU1208 Web Tabanlı Programlama**,
Bitlis Eren University — Computer Engineering (instructor: Dr. Öğr. Üyesi
Davut ARI).
