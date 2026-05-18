# System Architecture

## High-Level

```
[Browser PWA]  ──HTTPS──>  [Angular SPA on Vercel]
      │                          │
      │  /api (Bearer access     │  /api/auth/refresh
      │  token in header)        │  (refresh_token httpOnly cookie)
      ▼                          ▼
            [NestJS API on Railway]
              │            │            │
              ▼            ▼            ▼
        [PostgreSQL]   [Redis]   ──WSS──> [Binance WebSocket]
         (Prisma)   (CoinGecko snapshot)
```

Frontend is served from Vercel; the NestJS API runs on Railway with
PostgreSQL + Redis. CORS is pinned to `FRONTEND_ORIGIN`; the
refresh-cookie is `Secure`+`SameSite=None` cross-site (prod) and
`SameSite=Lax` for local dev.

## Tech Stack

- Frontend: Angular 17, RxJS 7, Tailwind, Angular Material, ApexCharts; PWA + Web Push
- Backend: NestJS 11, Prisma 5, PostgreSQL 16
- Cache: Redis (CoinGecko market snapshot only)
- Auth: Argon2id + JWT — short-lived **Bearer access token (in response body)** + **httpOnly `refresh_token` cookie** (7d), rotation on refresh, instant all-device revocation via `User.logoutAllAt`
- Security: Helmet (HSTS/CSP/nosniff/X-Frame-Options/Permissions-Policy), CORS allowlist pinned to `FRONTEND_ORIGIN`, `@nestjs/throttler` rate limiting + per-user account lockout, boot-time JWT-secret hardening. **CSRF defense is structural** — the access token is never a cookie, so mutating endpoints carry no ambient credential (`csurf` was removed; it broke cross-origin POST in prod). OWASP ZAP baseline: `docs/security-scan-2026-05-18.md`.
- Tests: Jest (unit, colocated `*.spec.ts`), Jest+Supertest backend e2e and Playwright frontend e2e — both under `repo/tests/`
- CI/CD: GitHub Actions (workflows at the git repo root `.github/`), Vercel, Railway
- API: OpenAPI 3 via `@nestjs/swagger` → `docs/openapi.yaml` (CI drift-checked)

> Threat model: `docs/adr/ADR-007-threat-model.md` (2026-05-18 revision).
