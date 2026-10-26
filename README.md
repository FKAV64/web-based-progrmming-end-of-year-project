# Angular + RxJS Crypto Dashboard

> **Real-time crypto-asset monitoring dashboard powered by RxJS**

![Difficulty](https://img.shields.io/badge/Difficulty-Medium-yellow)
![Score](https://img.shields.io/badge/Score-45-blue)
![Week](https://img.shields.io/badge/Week-1-gray)
![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Backend CI](https://github.com/FKAV64/web-based-progrmming-end-of-year-project/actions/workflows/backend-ci.yml/badge.svg)
![Frontend CI](https://github.com/FKAV64/web-based-progrmming-end-of-year-project/actions/workflows/frontend-ci.yml/badge.svg)
[![Demo](https://img.shields.io/website?label=demo&url=https%3A%2F%2Fweb-based-progrmming-end-of-year-pr.vercel.app)](https://web-based-progrmming-end-of-year-pr.vercel.app)

## 🎯 Summary

Angular + RxJS Crypto Dashboard is a full-stack web application developed to
let cryptocurrency investors manage their portfolios and watchlists from a
single screen. It provides real-time prices over WebSocket, interactive
charts, a personal watchlist, a profit/loss-tracking portfolio, price alerts
(with web-push notifications), a news/sentiment feed, and multi-currency
support.

Instead of the cluttered, advertising-heavy interfaces of exchange
applications, it provides a simple, fast, personalized monitoring dashboard
with TR/EN language support, dark mode, and PWA capabilities (add to home
screen + push). The backend includes secure authentication (Argon2 + JWT
rotation), an alert-evaluation engine, and cached market data.

## 🎥 Demo

🔗 **Live demo:** https://web-based-progrmming-end-of-year-pr.vercel.app<br>
👤 **Demo account:** `demo@example.com` · `Demo#123`
![Demo MP4](repo/docs/demo.mp4)

### Screenshots

Images: [`repo/docs/screenshots/`](repo/docs/screenshots/)

| Sign in | Register | Dashboard (empty) |
|-------|-------|-------------------|
| ![login](repo/docs/screenshots/01-login.png) | ![register](repo/docs/screenshots/02-register.png) | ![dashboard empty](repo/docs/screenshots/03-dashboard-empty.png) |

| Dashboard (populated) | Markets | Coin detail |
|-----------------------|---------|-------------|
| ![dashboard populated](repo/docs/screenshots/04-dashboard-populated.png) | ![markets](repo/docs/screenshots/05-markets.png) | ![coin detail](repo/docs/screenshots/06-coin-detail.png) |

| Mobile (responsive) | Dark mode |
|---------------------|-----------|
| ![mobile](repo/docs/screenshots/07-mobile.png) | ![dark mode](repo/docs/screenshots/08-dark-mode.png) |

## ✨ Key Features

- ✅ Real-time prices for the top 100 cryptocurrencies (WebSocket)
- ✅ Multiple chart types (candlestick, line, area) — 1H / 1D / 1W / 1M / YTD
- ✅ Personal watchlist + portfolio tracking (quantity × price)
- ✅ Price alerts (above/below)
- ✅ News/social-sentiment analysis feed
- ✅ Dark mode + responsive dashboard
- ✅ PWA: add to home screen + push notifications (alerts)
- ✅ Multi-currency support (TRY, USD, EUR)

## 🧰 Technology Stack

**Frontend:** `Angular 17 (standalone components, signals)`, `Angular Material`, `Tailwind CSS 3`<br>
**Reactivity:** `RxJS 7 (Observable, Subject, operators)`<br>
**Charts:** `ApexCharts (ng-apexcharts)`<br>
**Backend:** `NestJS 11`, `Prisma 5`, `PostgreSQL 16`, `Redis 7`<br>
**Data Sources:** `CoinGecko API`, `Binance WebSocket`, `Alternative.me Fear & Greed`, `RSS news feed`<br>
**State:** `Service-based (Angular signals + RxJS)`<br>
**Auth:** `Argon2id + JWT — Bearer access (15 min, response body) + httpOnly refresh cookie (7 days, rotation, logout-all)`<br>
**Tests:** `Jest + Supertest (backend), Jest + Angular Testing Library (frontend), Playwright (e2e)`<br>
**Hosting:** `Vercel (frontend) · Railway (backend)`

> Detailed rationale for the technology choices: [PROJE-RAPORU.md · Section 7](PROJE-RAPORU.md#7-teknoloji-yığını-tech-stack)

## 🏗 Architecture

```
[Browser PWA]   ── HTTPS ──>  [NestJS API (Railway)]  ──>  [PostgreSQL 16]
       │                              │                └──>  [Redis 7]
       │                              └── WSS proxy ──>  [Binance WebSocket]
       └── Deployed on Vercel
```

The frontend (Angular SPA) runs on Vercel and the backend (NestJS API) on
Railway. Market snapshots are cached in Redis; persistent data is kept in
PostgreSQL through Prisma ORM. Turkish diagram documentation:
[architecture](repo/docs/diagrams/architecture.md) ·
[ERD](repo/docs/diagrams/erd.md) ·
[user flows](repo/docs/diagrams/user-flow.md).

[Detailed architecture and ADRs →](PROJE-RAPORU.md#8-sistem-mimarisi)

## 📦 Subprojects

| Folder | Description | README |
|--------|-------------|--------|
| `repo/frontend/` | Angular 17 SPA — UI, RxJS flows, charts | [repo/frontend/README.md](repo/frontend/README.md) |
| `repo/backend/` | NestJS 11 API — Prisma, PostgreSQL, Redis | [repo/backend/README.md](repo/backend/README.md) |
| `repo/tests/` | All e2e tests — `backend/` (Jest+Supertest), `frontend/` (Playwright) | [repo/README.md](repo/README.md#tests) |

For local development, first start the Docker services inside `repo/`:

```bash
cd repo
docker compose up -d   # PostgreSQL 16 + Redis 7 + one-time Prisma migrator
```

## 🚀 Setup

### Requirements

- Node.js ≥ 20
- Docker + Docker Compose (local DB/Redis)

### Step by step

```bash
# 1) Clone the repository
git clone https://github.com/FKAV64/web-based-progrmming-end-of-year-project.git
cd web-based-progrmming-end-of-year-project/repo

# 2) Start Docker services (PostgreSQL 16 + Redis 7)
#    The one-time Prisma migrator automatically applies the schema
#    once PostgreSQL is healthy.
docker compose up -d

# 3) Backend
cd backend
cp .env.example .env          # copy from repo/backend/.env.example and fill in the secrets
npm install
npm run start:dev             # API: http://localhost:3000/api

# 4) Frontend (new terminal)
cd ../frontend
npm install
npm start                     # Application: http://localhost:4200
```

Project: http://localhost:4200 · API: http://localhost:3000/api

## 🧪 Tests

All e2e tests have been moved to `repo/tests/` (unit `*.spec.ts` files stay
beside the source according to Angular/Nest conventions).

```bash
# Backend unit + e2e (PostgreSQL + Redis must be running)
cd repo/backend && npm test && npm run test:e2e

# Frontend unit
cd repo/frontend && npm run test:ci

# Frontend e2e (backend + frontend must be running)
cd repo/frontend && npm run test:e2e
```

## 🔄 CI/CD

GitHub Actions workflows run automatically on every push and pull request.

Workflow files reside in `.github/workflows/` at the **root** of the Git
repository (GitHub Actions reads only this location—therefore they are not
moved into `repo/`).

| Workflow | Trigger | Steps |
|----------|---------|-------|
| **Backend CI** | `repo/backend/**`, `repo/tests/backend/**` | Prisma migrate → lint → unit tests + coverage → e2e tests → build → OpenAPI generation + drift check |
| **Frontend CI** | `repo/frontend/**`, `repo/tests/frontend/**` | lint → unit tests + coverage → build → Lighthouse CI |

### OpenAPI Schema

The generated API schema is at `repo/docs/openapi.yaml` (and
`repo/docs/openapi.json`).<br>
**After changing any controller or DTO, run `npm run openapi:generate` inside
`repo/backend/`** and commit the updated files. If the committed schema differs
from the application's generated version, CI fails with `git diff --exit-code`.

Interactive Swagger UI in development mode: `http://localhost:3000/api/docs`.

### Branch protection

The `main` branch is protected in GitHub settings (**Settings → Branches →
Branch protection rules**):

- Status checks must pass before merging.
- Required checks: **Backend CI / test** and **Frontend CI / test**.
- A PR cannot be merged while either workflow is failing.

### Lighthouse budgets

Frontend CI enforces Lighthouse score budgets for the production build:

| Category | Minimum score |
|----------|---------------|
| Performance | 80 (CI environment) |
| Accessibility | 95 |
| Largest Contentful Paint | < 4.0s (Warning) |

## 📁 Folder Structure

```
.
├── README.md                   (this file — summary, setup, demo)
├── PROJE-RAPORU.md             (long-form final report — Markdown)
├── LICENSE
├── .github/workflows/          (CI — must be at the Git root: backend-ci, frontend-ci)
└── repo/                       (working source code)
    ├── README.md               (technical project README)
    ├── docker-compose.yml      (PostgreSQL 16 + Redis 7 + Prisma migrator)
    ├── LICENSE
    ├── backend/                (NestJS 11 API — Prisma, PostgreSQL, Redis)
    ├── frontend/               (Angular 17 SPA — RxJS, signals, ApexCharts)
    ├── tests/                  (e2e: backend/ Jest+Supertest · frontend/ Playwright)
    └── docs/                   (ADR, diagrams, screenshots, openapi.yaml)
```

## 🛣 Roadmap

- [x] V1 — MVP (this submission)
- [ ] V2 — Real exchange integration (placing orders, Binance API), prediction model
- [ ] V3 — AI-assisted automated trading strategy (DCA bot)

## 🤝 Contributing

This project was developed as a final assignment for the **BMU1208 Web-Based
Programming** course in the **Computer Engineering** department at **Bitlis
Eren University**.

Course instructor: **Dr. Davut ARI**

Code contributions are not expected, but you may open an issue for ideas or
feedback.

## 📜 License

MIT © 2026 **ABDOU VALERIO FOMA KENFACK** — See [LICENSE](LICENSE) for the
full text.

## 🙋‍♂️ Contact

- **Student:** ABDOU VALERIO FOMA KENFACK
- **Student No.:** 24080410152
- **Email:** fomavalerio@gmail.com
- **Course:** BMU1208 · Web-Based Programming
- **Institution:** Bitlis Eren University — Faculty of Engineering and Architecture

---

<sub>🤖 Claude Code, ChatGPT, and in-editor AI assistants were used in this project. All architectural decisions and usage choices were made by the student.</sub>
