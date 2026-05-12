# System Architecture

## High-Level

[Browser PWA] — HTTPS — [NestJS API on Railway] — [Postgres + Redis]
                  \
                   — WSS — [Binance WebSocket]

## Tech Stack

- Frontend: Angular 17, RxJS, Tailwind, Angular Material, ApexCharts
- Backend: NestJS 10, Prisma 5, PostgreSQL 16
- Cache: Redis (CoinGecko snapshot only)
- Auth: Argon2 + JWT 15min/7d rotation
- Security: Helmet, CSRF, Throttler, OWASP ZAP verified
- Tests: Jest, Angular Testing Library, Playwright E2E
- CI/CD: GitHub Actions, Vercel, Railway
- API: OpenAPI 3.0 via @nestjs/swagger
