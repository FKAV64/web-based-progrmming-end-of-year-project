# Angular + RxJS Crypto Dashboard

> Real-time cryptocurrency monitoring dashboard developed with Angular 17
> (signals + RxJS) and a NestJS 11 API.

![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Backend CI](https://github.com/FKAV64/web-based-progrmming-end-of-year-project/actions/workflows/backend-ci.yml/badge.svg)
![Frontend CI](https://github.com/FKAV64/web-based-progrmming-end-of-year-project/actions/workflows/frontend-ci.yml/badge.svg)
[![Demo](https://img.shields.io/website?label=demo&url=https%3A%2F%2Fweb-based-progrmming-end-of-year-pr.vercel.app)](https://web-based-progrmming-end-of-year-pr.vercel.app)

A full-stack crypto dashboard: live prices over WebSocket, interactive
charts, a personal watchlist, portfolio profit/loss tracking, price alerts
with web-push notifications, a news/sentiment feed, multi-currency support,
dark mode, and PWA installation. It was developed at Bitlis Eren University
as the final project for the **BMU1208 Web-Based Programming** course.

- **Live demo:** https://web-based-progrmming-end-of-year-pr.vercel.app
- **Demo account:** `demo@example.com` / `Demo#123`

---

## Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Repository Structure](#repository-structure)
4. [Requirements](#requirements)
5. [Quick Start](#quick-start)
6. [Environment Variables](#environment-variables)
7. [Running the Applications](#running-the-applications)
8. [Tests](#tests)
9. [API and Data Model](#api-and-data-model)
10. [CI/CD](#cicd)
11. [Architecture](#architecture)
12. [License](#license)

---

## Features

- **Live prices** — top‑100 coins streamed through a server-side Binance WebSocket proxy.
- **Interactive charts** — candlestick / line / area, multiple ranges (1H · 1D · 1W · 1M · YTD), ApexCharts, pinch‑to‑zoom, and crosshair.
- **Watchlist** — per-user and persisted on the server.
- **Portfolio** — positions (quantity × average purchase price), realized/unrealized profit and loss, closing positions.
- **Price alerts** — `ABOVE` / `BELOW` thresholds are evaluated against live ticks on the server and delivered via Web Push.
- **News and sentiment** — RSS news feed and Fear & Greed sentiment indicator.
- **Multi-currency** — USD / EUR / TRY, live exchange-rate conversion.
- **Theme and i18n** — light / dark / system theme, TR + EN languages.
- **PWA** — installable, service worker, push notifications.
- **Security** — Argon2id password hashing; short-lived **Bearer access token** (response body) + **httpOnly `refresh_token` cookie**, rotation, and immediate sign-out on all devices; structural CSRF protection (the access token is never a cookie) + CORS allowlist; Helmet headers; rate limiting + account lockout; audit logging. See [`docs/adr/ADR-007-threat-model.md`](docs/adr/ADR-007-threat-model.md) and [`docs/security-scan-2026-05-18.md`](docs/security-scan-2026-05-18.md).

## Technology Stack

| Layer | Technology |
|--------|------------|
| Frontend | Angular 17 (standalone components, signals), RxJS 7, Angular Material, Tailwind CSS 3, ApexCharts (`ng-apexcharts`) |
| PWA | `@angular/service-worker`, Web Push |
| Backend | NestJS 11, Node.js 20 |
| ORM / DB | Prisma 5, PostgreSQL 16 |
| Cache | Redis 7 (CoinGecko market snapshot) |
| Real-time | `ws` Binance proxy gateway, RxJS streams |
| Authentication | Argon2id, `@nestjs/jwt` + Passport JWT — Bearer access token + httpOnly `refresh_token` cookie |
| API documentation | `@nestjs/swagger` → OpenAPI 3 (`docs/openapi.yaml`) |
| Tests | Jest (unit) + Supertest (backend e2e), Jest + Angular Testing Library (frontend unit), Playwright (frontend e2e) |
| CI/CD | GitHub Actions, Vercel (frontend), Railway (backend) |
| Data sources | CoinGecko API, Binance WebSocket, Alternative.me Fear & Greed, RSS news |

## Repository Structure

```
repo/
├── README.md                # this file
├── LICENSE                  # MIT
├── .gitignore
├── docker-compose.yml       # PostgreSQL 16 + Redis 7 + one-time Prisma migrator
├── backend/                 # NestJS 11 API (Prisma, PostgreSQL, Redis)
│   ├── src/                 #   modules: auth, users, market, watchlist,
│   │                        #   portfolio, alerts, push, settings, health,
│   │                        #   audit, dev
│   ├── prisma/              #   schema + migrations
│   ├── fixtures/            #   seeded market data for dev endpoints
│   └── scripts/             #   OpenAPI generator
├── frontend/                # Angular 17 SPA
│   └── src/app/             #   core/ · features/ · shared/
├── tests/                   # all test suites are here (moved from applications)
│   ├── backend/             #   backend e2e (Jest + Supertest) + jest-e2e.json
│   └── frontend/            #   frontend e2e (Playwright)
└── docs/
    ├── adr/                 #   architecture decision records
    ├── diagrams/            #   architecture diagrams (architecture · erd · user-flow)
    ├── screenshots/         #   UI screenshots
    ├── openapi.yaml         #   generated API schema (+ openapi.json)
    └── security-scan-*.md   #   OWASP ZAP scan report
```

> **Test note:** unit tests that must remain beside their source (the Angular /
> Nest convention, `*.spec.ts`) stay under `frontend/src` and `backend/src`.
> Independent end-to-end suites have been moved to `tests/backend` and
> `tests/frontend`; Jest and Playwright configurations have been updated
> accordingly.

> **CI note:** GitHub Actions reads workflows only from `.github/` at the
> **root of the Git repository** (the parent directory of `repo/`); therefore,
> workflow files are there by design—moving them into `repo/` completely
> disables CI.

## Requirements

- Node.js ≥ 20
- Docker + Docker Compose (local PostgreSQL and Redis)

## Quick Start

```bash
# 1. Clone
git clone https://github.com/FKAV64/web-based-progrmming-end-of-year-project.git
cd web-based-progrmming-end-of-year-project/repo

# 2. Start the infrastructure (PostgreSQL 16 + Redis 7).
#    The one-time migrator container applies the Prisma schema
#    once PostgreSQL is healthy.
docker compose up -d

# 3. Backend
cd backend
cp .env.example .env          # copy from repo/backend/.env.example, then fill in the secrets
npm install
npm run start:dev             # API: http://localhost:3000/api

# 4. Frontend (new terminal)
cd ../frontend
npm install
npm start                     # application: http://localhost:4200
```

## Environment Variables

The backend reads its configuration from `backend/.env` (template:
`backend/.env.example`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (default Docker DB, port 5433) |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ≥ 32-byte secrets — `openssl rand -base64 48` |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token lifetimes (default `15m` / `7d`) |
| `COOKIE_DOMAIN` | Cookie domain (`localhost` in development) |
| `FRONTEND_ORIGIN` | Allowed CORS origin |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push (VAPID) keys |
| `ARGON2_TIME_COST` / `ARGON2_MEMORY_COST` | Argon2 hash parameters |
| `PORT` | API port (default `3000`) |
| `DISABLE_THROTTLE` / `DISABLE_BINANCE_PROXY` | Optional local overrides during development |

The CoinGecko integration uses its public endpoint anonymously; the backend
no longer reads or attempts to send an API key.

## Running the Applications

**Backend** (`backend/`)

```bash
npm run start:dev      # watch mode
npm run start:prod     # run with the compiled dist/
npm run prisma:setup   # prisma generate + migrate deploy (manual fallback)
npm run openapi:generate  # regenerate docs/openapi.{yaml,json}
```

The `/api/dev/*` helper endpoints load only when `NODE_ENV=development`; for
the Playwright frontend e2e flow, start the backend with `npm run start:dev`.

**Frontend** (`frontend/`)

```bash
npm start              # ng serve → http://localhost:4200
npm run build          # i18n production build
```

## Tests

| Suite | Location | Command (working directory) |
|-------|----------|-----------------------------|
| Backend unit | `backend/src/**/*.spec.ts` | `npm test` (in `backend/`) |
| Backend e2e | `tests/backend/*.e2e-spec.ts` | `npm run test:e2e` (in `backend/`) |
| Frontend unit | `frontend/src/**/*.spec.ts` | `npm run test:ci` (in `frontend/`) |
| Frontend e2e | `tests/frontend/*.e2e.ts` | `npm run test:e2e` (in `frontend/`) |

The backend e2e suite uses Jest + Supertest; its configuration is at
`tests/backend/jest-e2e.json` and it requires running PostgreSQL + Redis
(`docker compose up -d`). The Playwright e2e suite requires both the backend
and frontend to be running.

```bash
# Backend (PostgreSQL + Redis must be running)
cd backend && npm test && npm run test:e2e

# Frontend unit
cd frontend && npm run test:ci

# Frontend e2e (backend + frontend must be running)
cd frontend && npm run test:e2e
```

## API and Data Model

The REST API is served under `/api` and documented with OpenAPI 3—the generated
schema is at [`docs/openapi.yaml`](docs/openapi.yaml) (and
`docs/openapi.json`). Swagger UI in development:
`http://localhost:3000/api/docs`.

Endpoint groups: `auth` (register / login / refresh / logout / me),
`me` (profile, data export), `settings`, `watchlist`, `portfolio`,
`alerts`, `market` (top / coin / chart / ohlc / news / sentiment /
exchange-rates), `push`, `health`, and development-only seed endpoints.

**Prisma models:** `User`, `RefreshToken`, `WatchlistItem`,
`PortfolioPosition`, `PriceAlert`, `PushSubscription`, `UserSettings`,
`AuditLog` (PostgreSQL—see
[`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)).
Full ERD: [`docs/diagrams/erd.md`](docs/diagrams/erd.md).

After changing any controller or DTO, run `npm run openapi:generate` inside
`backend/` and commit the updated schema—CI fails if the schema drifts.

## CI/CD

GitHub Actions workflows are under `.github/workflows/` **at the root of the
Git repository** and run on every push / PR:

| Workflow | Trigger | Steps |
|----------|---------|-------|
| **Backend CI** | `repo/backend/**`, `repo/tests/backend/**` | install → Prisma migrate → lint → unit tests + coverage → e2e tests → build → OpenAPI generation + drift check |
| **Frontend CI** | `repo/frontend/**`, `repo/tests/frontend/**` | install → lint → unit tests + coverage → build → Lighthouse CI |

Lighthouse budgets: Performance ≥ 85, Accessibility ≥ 95. The `main` branch
is protected and requires both workflows to pass before merging.

## Architecture

```
[Browser PWA] ── HTTPS ──> [NestJS API (Railway)] ──> [PostgreSQL 16]
       │                          │              └──> [Redis 7]
       │                          └── WSS proxy ──> [Binance WebSocket]
       └── Deployed on Vercel
```

Detailed design decisions and Turkish diagrams:
[`docs/diagrams/architecture.md`](docs/diagrams/architecture.md) ·
[`docs/diagrams/erd.md`](docs/diagrams/erd.md) ·
[`docs/diagrams/user-flow.md`](docs/diagrams/user-flow.md) and
[`docs/adr/`](docs/adr/) (architecture decision records).

## License

MIT © 2026 ABDOU VALERIO FOMA KENFACK — See [LICENSE](LICENSE).

Developed as the final project for the **BMU1208 Web-Based Programming**
course—Bitlis Eren University, Computer Engineering
(course instructor: Dr. Davut ARI).
