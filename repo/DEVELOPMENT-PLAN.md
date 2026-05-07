# Angular + RxJS Crypto Dashboard — Full-Stack Development Plan

> **Project Code:** P06
> **Frontend:** Angular 17 · RxJS 7 · Tailwind · Angular Material · ApexCharts
> **Backend:** NestJS 10 · Prisma 5 · PostgreSQL 16 · Redis (CoinGecko cache only)
> **Audience for this document:** Claude Code (or any coding agent) executing the build phase by phase

---

## 0. Reading Order for the Agent

Before writing any code, the agent must:

1. Read `README.md` and `PROJE-RAPORU.md` in the project root for context.
2. Read this file end-to-end.
3. Confirm Node.js ≥ 20, Docker, and Docker Compose are installed.
4. Work phase-by-phase. Do **not** skip ahead. Each phase ends with a working, committable state and explicit acceptance criteria.

---

## 1. Architectural Decisions (Locked In)

These are resolved choices. The agent must not re-debate them.

| Decision | Choice | Rationale |
|---|---|---|
| Repo layout | **Two folders in one repo**: `repo/frontend/` + `repo/backend/` | Simpler than monorepo tooling; one URL for the professor. Types duplicated where needed. |
| Frontend rendering | **SPA + prerender** (`ng build --prerender`) for landing/login | Auth-gated app — SSR adds complexity for no SEO benefit. Static pages still get crawled. |
| Frontend UI lib | **Angular Material 17** | Tighter Angular team integration, signals-friendly, dark theme out-of-the-box. |
| Charts | **ApexCharts** via `ng-apexcharts` | Native candle + line + area, built-in dark mode, zoom/brush. |
| OHLC data source | **Binance Klines REST** (`/api/v3/klines`) | Granular intervals (1m–1M) needed for proper candlestick charting. CoinGecko's free OHLC tier only supports 4 fixed `days` values. |
| Top-100 list source | **CoinGecko `/coins/markets`** via background fetcher | Background NestJS Cron fetches every 15s and writes to Redis. User-facing endpoints + alert evaluator read **only from Redis**, fully decoupling user traffic from CoinGecko's rate limit. |
| Alert evaluator trigger | **Snapshot-driven event** (not standalone cron) | The Top-100 fetcher emits an event after each successful Redis write; evaluator subscribes. No overlap, no lock needed, evaluator runs at exactly the snapshot cadence (~15s). |
| Frontend state | **Angular Signals + RxJS** (no NgRx) | Project too small for NgRx ceremony. Signals for state, RxJS for streams. |
| Backend framework | **NestJS 10** | Modular DI, decorator-based — maps cleanly onto Angular conventions. Built-in support for guards/interceptors/pipes. |
| ORM | **Prisma 5** | Type-safe, migrations as code, blocks SQL injection by default. |
| Database | **PostgreSQL 16** | Local Docker for dev, managed Postgres for prod. No vendor lock-in. |
| Cache | **Redis** — *CoinGecko responses only* | NOT used for rate-limit counters or sessions. Survives restarts so deploys don't hammer CoinGecko's 30 req/min limit. |
| Password hashing | **argon2 with timeCost = 12** | OWASP's current top recommendation. The "12" matches PROJE-RAPORU's bcrypt-cost-12 spec. README/docs will explain the upgrade. |
| Auth pattern | JWT access (15min) + refresh (7d, hashed in DB) | Refresh stored hashed → DB leak doesn't grant access. Refresh in httpOnly cookie, access in memory. |
| Validation | `class-validator` + `class-transformer` | NestJS native, decorator-based. |
| Rate limiting | `@nestjs/throttler` with **in-memory store** | Single-instance V1 deployment. Move to Redis-backed if scaling beyond one container. |
| Logging | Pino + Sentry | Pino for structured access logs; Sentry for error tracking. |
| Hosting (FE) | Vercel | Spec's live demo URL is on Vercel. |
| Hosting (BE) | Railway (or DigitalOcean App Platform) | Native Postgres + Redis support. |
| Push notifications | Web Push API + `web-push` library | No third-party push provider; works with Chrome/Firefox/Edge/Safari 16+. |
| API documentation | **`@nestjs/swagger`** auto-generated `openapi.yaml` | Required by PROJE-RAPORU rubric; derived from DTOs and controller decorators, no manual maintenance. |
| i18n | TR (primary) + EN | `@angular/localize` with two locale files. |
| Currency | TRY · USD · EUR | Conversion via CoinGecko `/exchange_rates`. |

---

## 2. Repository Layout

```
repo/
├── README.md
├── PROJE-RAPORU.md
├── PROJE-RAPORU-SABLON.docx
├── LICENSE
├── docker-compose.yml          (postgres + redis for local dev)
├── .gitignore
├── .editorconfig
│
├── frontend/                   (Angular 17 SPA)
│   ├── src/
│   ├── angular.json
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── ngsw-config.json
│   ├── manifest.webmanifest
│   ├── .env.example
│   └── README.md
│
├── backend/                    (NestJS 10 API)
│   ├── src/
│   │   ├── modules/
│   │   ├── common/
│   │   ├── prisma/
│   │   ├── main.ts
│   │   └── app.module.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── test/                   (e2e tests)
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── jest.config.js
│   ├── .env.example
│   ├── Dockerfile
│   └── README.md
│
├── docs/
│   ├── adr/                    (architecture decision records)
│   ├── diagrams/
│   └── screenshots/
│
└── .github/
    └── workflows/
        ├── frontend-ci.yml
        └── backend-ci.yml
```

---

## 3. Backend Architecture (NestJS)

### 3.1 Module structure

```
backend/src/
├── main.ts                    bootstrap, helmet, cors, csrf, validation pipe
├── app.module.ts              composes all feature modules
│
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts      Prisma client wrapper, lifecycle hooks
│
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── public.decorator.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts   (uniform { data, error } shape)
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── pipes/
│       └── (custom pipes if needed)
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   ├── refresh.strategy.ts
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       ├── login.dto.ts
│   │       └── refresh.dto.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts        GET /me, DELETE /me, GET /me/export
│   │   ├── users.service.ts
│   │   └── dto/
│   ├── settings/
│   ├── watchlist/
│   ├── portfolio/
│   ├── alerts/
│   │   ├── alerts.module.ts
│   │   ├── alerts.controller.ts
│   │   ├── alerts.service.ts
│   │   ├── alerts-evaluator.service.ts   (subscribes to MarketSnapshot.events$, evaluates on each new snapshot)
│   │   └── dto/
│   ├── push/
│   │   ├── push.module.ts
│   │   ├── push.controller.ts
│   │   ├── push.service.ts
│   │   └── dto/
│   ├── market/
│   │   ├── market.module.ts
│   │   ├── market.controller.ts
│   │   ├── coingecko-fetcher.service.ts  (Cron @ 15s — fetches CoinGecko top-100, writes to Redis, emits "snapshot.updated")
│   │   ├── binance-rest.service.ts       (Klines REST for OHLC — direct, no cache, called per request)
│   │   ├── market-snapshot.service.ts    (reads top-100 from Redis ONLY; never calls CoinGecko)
│   │   ├── sentiment.service.ts          (Fear & Greed, cached 1h)
│   │   ├── news.service.ts               (RSS, cached 15min)
│   │   └── dto/
│   ├── audit/
│   │   ├── audit.module.ts
│   │   └── audit.service.ts
│   └── health/
│       └── health.controller.ts        (GET /health for uptime checks)
```

### 3.2 Request flow

```
Request
  → helmet (security headers)
  → cors (allowlist)
  → cookie-parser
  → csrf middleware (skip on /api/auth/login + /register)
  → ValidationPipe (whitelist + transform DTOs)
  → ThrottlerGuard (per-IP for auth, per-user for rest)
  → JwtAuthGuard (unless @Public())
  → Controller method
  → AuditService.log() for sensitive actions
  → TransformInterceptor wraps response in { data }
  → HttpExceptionFilter catches errors → { error: { code, message } }
Response
```

### 3.3 Database schema (Prisma)

```prisma
// prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role            { USER ADMIN }
enum AlertCondition  { ABOVE BELOW }
enum Currency        { USD EUR TRY }
enum Theme           { LIGHT DARK SYSTEM }
enum Locale          { TR EN }

model User {
  id              String    @id @default(uuid()) @db.Uuid
  email           String    @unique  @db.VarChar(255)
  passwordHash    String    @map("password_hash")  @db.VarChar(255)
  name            String?   @db.VarChar(100)
  role            Role      @default(USER)
  emailVerifiedAt DateTime? @map("email_verified_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  refreshTokens   RefreshToken[]
  watchlistItems  WatchlistItem[]
  positions       PortfolioPosition[]
  alerts          PriceAlert[]
  pushSubs        PushSubscription[]
  settings        UserSettings?
  auditLogs       AuditLog[]

  @@map("users")
}

model RefreshToken {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  tokenHash  String    @unique @map("token_hash") @db.VarChar(255)
  expiresAt  DateTime  @map("expires_at")
  revokedAt  DateTime? @map("revoked_at")
  userAgent  String?   @map("user_agent") @db.VarChar(500)
  ip         String?   @db.VarChar(45)
  createdAt  DateTime  @default(now()) @map("created_at")

  user       User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, revokedAt])
  @@map("refresh_tokens")
}

model WatchlistItem {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  coinId    String   @map("coin_id") @db.VarChar(100)
  addedAt   DateTime @default(now()) @map("added_at")

  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, coinId])
  @@map("watchlist_items")
}

model PortfolioPosition {
  id            String    @id @default(uuid()) @db.Uuid
  userId        String    @map("user_id") @db.Uuid
  coinId        String    @map("coin_id") @db.VarChar(100)
  quantity      Decimal   @db.Decimal(24, 8)
  avgBuyPrice   Decimal   @map("avg_buy_price") @db.Decimal(18, 2)
  buyCurrency   Currency  @map("buy_currency")
  notes         String?   @db.VarChar(500)
  closedAt      DateTime? @map("closed_at")
  closePrice    Decimal?  @map("close_price") @db.Decimal(18, 2)
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  user          User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, closedAt])
  @@map("portfolio_positions")
}

model PriceAlert {
  id            String          @id @default(uuid()) @db.Uuid
  userId        String          @map("user_id") @db.Uuid
  coinId        String          @map("coin_id") @db.VarChar(100)
  condition     AlertCondition
  targetPrice   Decimal         @map("target_price") @db.Decimal(18, 2)
  currency      Currency
  triggeredAt   DateTime?       @map("triggered_at")
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")

  user          User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, triggeredAt])
  @@index([triggeredAt])  // partial-active query: WHERE triggered_at IS NULL
  @@map("price_alerts")
}

model PushSubscription {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  endpoint    String   @unique @db.VarChar(1000)
  p256dhKey   String   @map("p256dh_key") @db.VarChar(255)
  authKey     String   @map("auth_key") @db.VarChar(100)
  userAgent   String?  @map("user_agent") @db.VarChar(500)
  createdAt   DateTime @default(now()) @map("created_at")

  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("push_subscriptions")
}

model UserSettings {
  userId                 String   @id @map("user_id") @db.Uuid
  theme                  Theme    @default(SYSTEM)
  currency               Currency @default(USD)
  locale                 Locale   @default(TR)
  notificationsEnabled   Boolean  @default(true) @map("notifications_enabled")
  updatedAt              DateTime @updatedAt @map("updated_at")

  user                   User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_settings")
}

model AuditLog {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String?  @map("user_id") @db.Uuid
  action       String   @db.VarChar(100)        // 'auth.login_success', 'user.email_changed', ...
  resourceType String?  @map("resource_type") @db.VarChar(50)
  resourceId   String?  @map("resource_id") @db.VarChar(100)
  ip           String?  @db.VarChar(45)
  userAgent    String?  @map("user_agent") @db.VarChar(500)
  meta         Json?
  createdAt    DateTime @default(now()) @map("created_at")

  user         User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([action, createdAt])
  @@map("audit_log")
}
```

### 3.4 REST API surface

All responses are wrapped: `{ "data": ... }` on success, `{ "error": { "code": "...", "message": "..." } }` on failure.

#### Auth
| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/api/auth/register` | public | `{ email, password, name? }` | argon2 hash, returns access token + sets refresh cookie |
| POST | `/api/auth/login` | public | `{ email, password }` | Throttled 5/min/IP, audit on success and failure |
| POST | `/api/auth/refresh` | refresh cookie | — | Rotates: revokes old refresh, issues new pair |
| POST | `/api/auth/logout` | JWT | — | Revokes current refresh token |
| POST | `/api/auth/logout-all` | JWT | — | Revokes all refresh tokens for the user |

#### Users
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/me` | JWT | Returns user + settings |
| GET | `/api/me/export` | JWT | KVKK: full data dump as JSON download |
| DELETE | `/api/me` | JWT | KVKK: hard delete with cascade, audit logged |

#### Settings
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/settings` | JWT | |
| PATCH | `/api/settings` | JWT | Partial update (theme, currency, locale, notificationsEnabled) |

#### Watchlist
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/watchlist` | JWT | |
| POST | `/api/watchlist` | JWT | `{ coinId }` — 409 if already there |
| DELETE | `/api/watchlist/:coinId` | JWT | |

#### Portfolio
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/portfolio` | JWT | Active by default; `?includeClosed=true` for full history |
| POST | `/api/portfolio` | JWT | `{ coinId, quantity, avgBuyPrice, buyCurrency, notes? }` |
| PATCH | `/api/portfolio/:id` | JWT | Edit qty / avg price / notes |
| POST | `/api/portfolio/:id/close` | JWT | `{ closePrice }` — sets closedAt to now |
| DELETE | `/api/portfolio/:id` | JWT | Hard delete |

#### Alerts
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/alerts` | JWT | Active by default (triggeredAt IS NULL); `?includeTriggered=true` |
| POST | `/api/alerts` | JWT | `{ coinId, condition, targetPrice, currency }` |
| DELETE | `/api/alerts/:id` | JWT | |

#### Push
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/push/vapid-public-key` | JWT | Returns the server's VAPID public key for the browser to subscribe |
| POST | `/api/push/subscribe` | JWT | `{ endpoint, keys: { p256dh, auth } }` from `pushManager.subscribe()` |
| DELETE | `/api/push/subscribe` | JWT | `{ endpoint }` to unsubscribe one device |

#### Market
| Method | Path | Auth | Cache | Source | Notes |
|---|---|---|---|---|---|
| GET | `/api/market/top` | JWT | Redis (read-only) | CoinGecko via fetcher | Reads ONLY from Redis. Never calls CoinGecko on user request. |
| GET | `/api/market/coin/:id` | JWT | 5min | CoinGecko `/coins/:id` | Direct call with cache; low-frequency endpoint. |
| GET | `/api/market/ohlc/:symbol` | JWT | none | **Binance `/api/v3/klines`** | Query: `?interval={1m\|5m\|15m\|30m\|1h\|4h\|1d\|1w\|1M}&limit={1-1000}`. Symbol is Binance format (`BTCUSDT`). |
| GET | `/api/market/chart/:id?days=` | JWT | 60s | CoinGecko `/coins/:id/market_chart` | For line/area views that span longer history than klines easily provide. |
| GET | `/api/market/exchange-rates` | JWT | 1h | CoinGecko `/exchange_rates` | |
| GET | `/api/market/sentiment` | JWT | 1h | Alternative.me Fear & Greed | |
| GET | `/api/market/news` | JWT | 15min | CoinDesk + CoinTelegraph RSS | |

#### Health
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | public | Returns `{ status, db, redis, uptime }` |

---

## 4. Frontend Architecture (Angular)

### 4.1 Folder structure

```
frontend/src/app/
├── core/
│   ├── services/
│   │   ├── api/
│   │   │   ├── auth.api.ts
│   │   │   ├── users.api.ts
│   │   │   ├── settings.api.ts
│   │   │   ├── watchlist.api.ts
│   │   │   ├── portfolio.api.ts
│   │   │   ├── alerts.api.ts
│   │   │   ├── push.api.ts
│   │   │   └── market.api.ts
│   │   ├── streaming/
│   │   │   ├── binance-ws.service.ts
│   │   │   └── price-stream.service.ts
│   │   ├── state/
│   │   │   ├── auth.service.ts          (signals)
│   │   │   ├── settings.service.ts      (signals)
│   │   │   ├── watchlist.service.ts     (signals + API sync)
│   │   │   ├── portfolio.service.ts     (signals + API sync)
│   │   │   └── alerts.service.ts        (signals + API sync)
│   │   ├── notification.service.ts
│   │   └── push.service.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── public-only.guard.ts
│   ├── interceptors/
│   │   ├── auth.interceptor.ts          (Authorization header + 401 refresh)
│   │   └── error.interceptor.ts
│   └── models/
│       └── (interfaces — duplicate of backend DTOs)
│
├── shared/
│   ├── components/
│   ├── pipes/
│   └── directives/
│
├── features/
│   ├── auth/                            (login, register)
│   ├── shell/                           (top-bar, side-nav, layout)
│   ├── dashboard/
│   ├── markets/
│   ├── coin-detail/
│   ├── watchlist/
│   ├── portfolio/
│   ├── alerts/
│   ├── news/
│   └── settings/
│
├── app.config.ts
├── app.routes.ts
└── app.component.ts
```

### 4.2 Data flow (the heart of the app)

```
[ /api/market/top (every 30s) ]   [ Binance WS (live ticks) ]
         │                                    │
         │ Observable<Coin[]>                 │ Observable<PriceTick>
         ▼                                    ▼
       ┌────────────────────────────────────────────┐
       │           PriceStreamService               │
       │   • combineLatest snapshot + tick stream   │
       │   • scan into Map<symbol, Coin>            │
       │   • throttleTime(250) per symbol           │
       │   • shareReplay(1)                         │
       │   • exposes:                               │
       │       topCoins$: Observable<Coin[]>        │
       │       priceFor(sym): Signal<Coin>          │
       └────────────────────────────────────────────┘
                          │
              (consumed by every component)
```

Critical RxJS operators: `combineLatest`, `switchMap`, `scan`, `shareReplay({bufferSize:1, refCount:true})`, `throttleTime`, `retry({delay})`, `takeUntilDestroyed`.

---

## 5. Phase-by-Phase Build Plan

The agent must complete each phase fully before the next, and commit at the end of each with the specified message. Run `npm test` and a manual smoke check at every phase boundary.

---

### **Phase 0 — Repo & Docker Compose** (≈30 min)

**Goal:** Repo initialized with two empty subprojects, Postgres + Redis up locally.

1. `git init` at `repo/`. Add `.gitignore` (Node, IDE, env files).
2. Create `docker-compose.yml` at the repo root:
   ```yaml
   services:
     postgres:
       image: postgres:16-alpine
       environment:
         POSTGRES_USER: crypto
         POSTGRES_PASSWORD: crypto
         POSTGRES_DB: crypto_dashboard
       ports: ["5432:5432"]
       volumes: ["pgdata:/var/lib/postgresql/data"]
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U crypto"]
         interval: 5s
     redis:
       image: redis:7-alpine
       ports: ["6379:6379"]
       healthcheck:
         test: ["CMD", "redis-cli", "ping"]
         interval: 5s
   volumes:
     pgdata:
   ```
3. `docker compose up -d` and confirm both containers healthy.
4. Create empty `frontend/` and `backend/` directories.
5. Add a root README pointing to each subdirectory's README.

**Acceptance:** `docker compose ps` shows both healthy. `psql postgresql://crypto:crypto@localhost:5432/crypto_dashboard -c '\l'` connects. `redis-cli ping` returns `PONG`.

**Commit:** `chore: initialize repo with docker compose for postgres and redis`

---

### **Phase 1 — Backend Bootstrap** (≈45 min)

**Goal:** NestJS project running with Prisma connected to Postgres.

1. `cd backend && npx @nestjs/cli new . --package-manager npm --skip-install` (project name: `crypto-dashboard-backend`). Confirm the agent overwrites the empty directory; install after.
2. Install runtime deps:
   ```bash
   npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt \
     @nestjs/throttler @nestjs/schedule @nestjs/cache-manager cache-manager \
     @keyv/redis cache-manager-ioredis-yet ioredis \
     @prisma/client argon2 cookie-parser csurf helmet class-validator \
     class-transformer web-push uuid pino pino-http nestjs-pino \
     rss-parser
   ```
3. Install dev deps:
   ```bash
   npm install -D prisma @types/cookie-parser @types/csurf @types/passport-jwt \
     @types/web-push @types/uuid supertest @types/supertest
   ```
4. `npx prisma init` — creates `prisma/schema.prisma` and `.env`.
5. Set up `.env`:
   ```
   DATABASE_URL=postgresql://crypto:crypto@localhost:5432/crypto_dashboard?schema=public
   REDIS_URL=redis://localhost:6379
   JWT_ACCESS_SECRET=change-me-in-prod-32-bytes-min
   JWT_REFRESH_SECRET=change-me-in-prod-also-32-bytes
   JWT_ACCESS_TTL=15m
   JWT_REFRESH_TTL=7d
   COOKIE_DOMAIN=localhost
   FRONTEND_ORIGIN=http://localhost:4200
   VAPID_PUBLIC_KEY=
   VAPID_PRIVATE_KEY=
   VAPID_SUBJECT=mailto:fomavalerio@gmail.com
   ARGON2_TIME_COST=12
   ARGON2_MEMORY_COST=65536
   PORT=3000
   ```
   Mirror to `.env.example` (with secrets blanked).
6. Paste the full Prisma schema from §3.3. Run `npx prisma migrate dev --name init`.
7. Replace `src/main.ts` with bootstrap that wires:
   - `app.use(helmet())`
   - `app.use(cookieParser())`
   - `app.enableCors({ origin: env.FRONTEND_ORIGIN, credentials: true })`
   - `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))`
   - global prefix `api`
   - Pino logger
8. Create `PrismaService` extending `PrismaClient` with `onModuleInit` connect and `enableShutdownHooks`.
9. Add a stub `HealthController` returning `{ status: 'ok', uptime: process.uptime() }`.
10. Run `npm run start:dev`. Hit `GET http://localhost:3000/api/health`.

**Acceptance:** `/api/health` returns 200 with valid JSON. `npx prisma studio` shows all 8 tables empty.

**Commit:** `feat(backend): bootstrap nestjs with prisma, postgres, helmet, validation`

---

### **Phase 2 — Backend Auth (register, login, refresh, logout)** (≈2.5 hours)

**Goal:** Full JWT auth flow with argon2 hashing, refresh-token rotation, audit logging, throttling.

1. **AuditModule** first: `AuditService.log(action, userId?, meta?)` writes to `audit_log` (use the request's IP and user-agent — pass via decorator). Inject this service into AuthService.
2. **DTOs** with `class-validator`:
   - `RegisterDto`: email (IsEmail, lowercase transform), password (min 8 chars, must contain digit + letter), name (optional, max 100).
   - `LoginDto`: email, password.
3. **AuthService**:
   - `register(dto, ip, ua)`: check unique email → `argon2.hash(password, { type: argon2id, timeCost: 12, memoryCost: 65536 })` → create user → create default UserSettings row → issue token pair → log `auth.register`.
   - `login(dto, ip, ua)`: lookup by email → `argon2.verify(hash, password)` → on success issue tokens + log `auth.login_success`; on failure log `auth.login_failed` and throw 401 (constant-time comparison via argon2 already).
   - `refresh(refreshToken, ip, ua)`: hash incoming token (sha256), find row, check not revoked + not expired → revoke it → issue new pair → log `auth.refresh`.
   - `logout(userId, refreshToken)`: revoke the matching refresh row.
   - `logoutAll(userId)`: revoke all refresh rows for the user.
   - Token issuance helper: signs access (15m) with `JWT_ACCESS_SECRET`, signs refresh (7d) with `JWT_REFRESH_SECRET`, stores `sha256(refresh)` as `tokenHash`.
4. **Guards**: `JwtAuthGuard` (passport-jwt strategy reading `Authorization: Bearer ...`).
5. **Throttling**: `ThrottlerModule` global with `{ ttl: 60_000, limit: 100 }` default. On auth controller methods: `@Throttle({ default: { ttl: 60_000, limit: 5 } })` for login + register.
6. **AuthController** at `/api/auth`:
   - `POST /register` → returns `{ user, accessToken }`, sets `refresh_token` httpOnly+secure+sameSite=lax cookie.
   - `POST /login` → same shape.
   - `POST /refresh` → reads cookie, returns new access token, rotates cookie.
   - `POST /logout` → clears cookie, revokes refresh.
   - `POST /logout-all` → clears cookie, revokes all refresh tokens for user.
7. **Tests** (Jest, mocking PrismaService):
   - argon2 hash and verify happy path
   - register rejects duplicate email
   - login fails with wrong password
   - refresh rejects revoked token
   - refresh rotates: new refresh works, old refresh fails
   - audit log written on each event
   - throttler returns 429 after 5 failed logins
8. **E2E test** (supertest against running app + test DB):
   - register → login → me → refresh → logout → me returns 401

**Acceptance:** All tests green. Manual flow with curl works end-to-end. `audit_log` table has rows for register, login_success, login_failed, refresh, logout.

**Commit:** `feat(backend): auth with argon2, jwt rotation, throttling, audit log`

---

### **Phase 3 — Backend Users + Settings + KVKK** (≈1 hour)

**Goal:** `/api/me`, `/api/settings`, data export, account deletion.

1. **UsersController**:
   - `GET /api/me` → returns `{ id, email, name, role, createdAt, settings: { ... } }`.
   - `GET /api/me/export` → assembles all user data (user + settings + watchlist + portfolio + alerts + push subs + audit logs) and streams as `application/json` with `Content-Disposition: attachment; filename="my-data-{date}.json"`. Audit log: `user.exported_data`.
   - `DELETE /api/me` → cascade deletes all user data (Prisma cascades handle this), revokes all tokens, returns 204. Audit log: `user.deleted` (created *before* the delete so it survives the cascade — keep userId nullable).
2. **SettingsController**:
   - `GET /api/settings` → returns the row.
   - `PATCH /api/settings` with `UpdateSettingsDto` (all fields optional, validated).
3. **CSRF**: enable `csurf` middleware globally except on `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh` (those are entry points). Frontend will receive CSRF token via cookie + header.
4. **Tests**: settings update happy path, /me returns user, export returns valid JSON containing the expected keys, delete cascades all rows.

**Acceptance:** Curl flow: register → patch settings → get /me shows new settings → export returns full JSON → delete account → /me returns 401.

**Commit:** `feat(backend): users, settings, data export, account deletion (kvkk)`

---

### **Phase 4 — Backend Market Module (CoinGecko Fetcher + Binance Klines + Sentiment + News)** (≈2.5 hours)

**Goal:** All market endpoints working. Top-100 served from Redis (decoupled from CoinGecko's rate limit). OHLC powered by Binance Klines. Foundation laid for snapshot-driven alert evaluation in Phase 6.

#### 4.1 Snapshot architecture (the central pattern)

The system has **one writer** and **many readers** for the top-100 list:

```
   Cron @ 15s
       │
       ▼
┌──────────────────────────┐    fetches    ┌──────────────┐
│ CoinGeckoFetcherService  │ ─────────────►│  CoinGecko   │
│  • runs Cron every 15s   │               │   /coins/    │
│  • on success: WRITE to  │               │   markets    │
│    Redis key             │               └──────────────┘
│    "market:top"          │
│  • on success: EMIT      │
│    "snapshot.updated"    │
│    via EventEmitter2     │
└─────┬────────────────────┘
      │ event
      ▼
   ┌──────────────────────────────────┐
   │  Subscribers:                    │
   │  • AlertsEvaluatorService        │ (Phase 6 — evaluates alerts on each snapshot)
   │  • (future) WebSocket gateway     │
   └──────────────────────────────────┘

User-facing endpoints READ the Redis key only:
   GET /api/market/top  ────►  redis.get("market:top")  ────►  return as-is
```

CoinGecko is hit at most 4 times/minute (15s cadence), regardless of how many users are connected. User requests are served entirely from Redis.

#### 4.2 Implementation steps

1. **Install `@nestjs/event-emitter`** alongside the cache packages:
   ```bash
   npm install @nestjs/event-emitter
   ```
   Register `EventEmitterModule.forRoot()` in `AppModule`.

2. **CacheModule** with Redis store via `cache-manager-ioredis-yet`. Inject `CACHE_MANAGER`. Default TTL irrelevant — each set call specifies its own.

3. **CoinGeckoFetcherService** (the writer):
   - `@Cron('*/15 * * * * *')` — every 15 seconds.
   - Calls CoinGecko `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=true&price_change_percentage=1h,24h,7d` with a 10s fetch timeout.
   - On success:
     - `cache.set('market:top', data, { ttl: 60_000 })` — TTL of 60s acts as a safety net if the fetcher dies; readers keep getting stale-but-recent data for 45s before staleness becomes obvious.
     - `eventEmitter.emit('snapshot.updated', data)` — Phase 6's evaluator listens here.
   - On 429: log warning, do NOT clear cache, do NOT emit event. Backoff is automatic — next cron tick is 15s away.
   - On network error: log error, same — don't disturb the cache.
   - Includes a startup hook (`onApplicationBootstrap`) that runs an immediate fetch so the cache is warm before the first user request.

4. **MarketSnapshotService** (the reader, used by `MarketController`):
   - `getTop()`: returns `cache.get('market:top')`. If null (very first boot, fetcher hasn't completed) → throw 503 "Market data warming up, retry shortly."
   - **Never calls CoinGecko directly.** This is the contract — user traffic and CoinGecko traffic are decoupled.

5. **CoinGeckoService** (for the few endpoints that don't use the snapshot — coin detail, exchange rates):
   - `getCoin(id)` — TTL 5min, uses `cache-manager` `wrap()` pattern.
   - `getMarketChart(id, days)` — TTL 60s.
   - `getExchangeRates()` — TTL 1h.
   - These are low-frequency; per-call caching is fine, no separate cron.

6. **BinanceRestService** — new, replaces CoinGecko for OHLC:
   - `getKlines(symbol, interval, limit = 200): Promise<OHLC[]>` calls `https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}`.
   - Validate `interval` against the allowed list: `['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']`. Reject anything else with 400.
   - Validate `limit` between 1 and 1000.
   - Maps Binance's array response `[openTime, open, high, low, close, volume, closeTime, ...]` to the project's `OHLC` shape: `{ time, open, high, low, close }`.
   - **No Redis cache** — Binance's rate limit is 1200 weight/min for public endpoints (klines = weight 1 or 2), so 1200/min is plenty for our scale. Caching would add staleness for no benefit; users want fresh chart data when they switch timeframes.

7. **SentimentService** — fetches `https://api.alternative.me/fng/?limit=30`. Cached 1h.

8. **NewsService** with `rss-parser`:
   - Fetches CoinDesk + CoinTelegraph RSS in parallel.
   - Merges, sorts by pubDate, returns top 30.
   - Cached 15min.
   - Per-headline sentiment hint via a small bullish/bearish keyword list (documented as heuristic, not real NLP).

9. **MarketController** — all routes JWT-protected:
   - `GET /api/market/top` → `MarketSnapshotService.getTop()`
   - `GET /api/market/coin/:id` → `CoinGeckoService.getCoin(id)`
   - `GET /api/market/ohlc/:symbol?interval=&limit=` → `BinanceRestService.getKlines(...)`
   - `GET /api/market/chart/:id?days=` → `CoinGeckoService.getMarketChart(...)`
   - `GET /api/market/exchange-rates` → `CoinGeckoService.getExchangeRates()`
   - `GET /api/market/sentiment` → `SentimentService.get()`
   - `GET /api/market/news` → `NewsService.get()`

10. **Tests** (Jest, mock fetch):
    - **Fetcher**: writes Redis key on success; emits event with payload; on 429 the cache is unchanged.
    - **Snapshot reader**: returns cached value; throws 503 when cache empty.
    - **Snapshot reader does NOT call fetch()** — assert via mocked global fetch that 0 calls happened during a `getTop()`.
    - **Klines**: rejects invalid interval `'7m'` with 400; maps Binance array response correctly; rejects `limit > 1000`.
    - **News merge**: combines two RSS feeds, sorts by date.

**Acceptance:**
- Boot the backend, watch logs: every 15s sees `[CoinGeckoFetcher] snapshot updated (100 coins)`.
- `redis-cli get market:top | head -c 200` shows JSON.
- 100 sequential calls to `/api/market/top` over 30s → 0 outbound calls to CoinGecko (verifiable via mock or network monitor).
- `/api/market/ohlc/BTCUSDT?interval=1h&limit=200` returns 200 candles in <800ms.
- `/api/market/ohlc/BTCUSDT?interval=7m` returns 400 with a clear error message.

**Commit:** `feat(backend): coingecko fetcher cron + binance klines + decoupled market snapshot`

---

### **Phase 5 — Backend Watchlist + Portfolio + Alerts CRUD** (≈2 hours)

**Goal:** All user-data CRUD endpoints working with row-level ownership enforcement.

1. **WatchlistModule**: GET/POST/DELETE. Unique constraint `(userId, coinId)` returns 409 on duplicate add.
2. **PortfolioModule**: GET (filters by `closedAt IS NULL` unless `?includeClosed=true`), POST, PATCH (only allowed fields), `POST /:id/close` with closePrice, DELETE. Use Prisma's `Decimal` carefully — accept string in DTO, coerce.
3. **AlertsModule**: GET (filters `triggeredAt IS NULL` unless `?includeTriggered=true`), POST, DELETE.
4. **Ownership enforcement**: every PATCH/DELETE/close path queries with `where: { id, userId: req.user.id }` so users can't touch each other's rows. Returns 404 (not 403) on mismatch — don't leak existence.
5. **Audit log** for sensitive ops: portfolio close, account-deletion (already handled), settings change.
6. **DTOs** with `class-validator`:
   - `CreatePortfolioPositionDto`: coinId (string), quantity (numeric, min 0.00000001), avgBuyPrice (numeric, min 0.01), buyCurrency (enum), notes (optional, max 500).
   - `CreateAlertDto`: coinId, condition, targetPrice (min 0.01), currency.
7. **Tests**:
   - User A cannot DELETE user B's portfolio position (returns 404).
   - Adding duplicate watchlist entry returns 409.
   - Closing a position sets `closedAt` and `closePrice`; subsequent PATCH on closed position rejected.
   - Alert with triggeredAt set is excluded from default GET.

**Acceptance:** Full CRUD demo via curl. Cross-user attack blocked. All tests green.

**Commit:** `feat(backend): watchlist, portfolio (with close), alerts crud with ownership checks`

---

### **Phase 6 — Backend Push + Snapshot-Driven Alert Evaluator** (≈2 hours)

**Goal:** Browser can subscribe to push; backend evaluates alerts on every Top-100 snapshot update (~15s cadence) and pushes when triggered.

1. **Generate VAPID keys** at first run (or via npm script):
   ```bash
   node -e "const w=require('web-push');const k=w.generateVAPIDKeys();console.log(k)"
   ```
   Add to `.env`. Document in README.
2. **PushModule**:
   - `GET /api/push/vapid-public-key` → returns `{ publicKey: env.VAPID_PUBLIC_KEY }`.
   - `POST /api/push/subscribe` with `{ endpoint, keys: { p256dh, auth } }` → upsert by `endpoint`. Stores `userAgent` from header.
   - `DELETE /api/push/subscribe` with `{ endpoint }` → deletes the row (ownership-checked).
3. **PushService.send(userId, { title, body, url? })**:
   - Loads all `PushSubscription` rows for the user.
   - For each, calls `webpush.sendNotification(subscription, JSON.stringify(payload))` with VAPID keys.
   - On 410 Gone or 404: deletes the subscription row (it's invalid).
   - Other errors: log + continue.

4. **AlertsEvaluatorService** — **snapshot-driven, NOT a separate cron**:

   ```typescript
   @Injectable()
   export class AlertsEvaluatorService {
     @OnEvent('snapshot.updated', { async: true })
     async handleSnapshot(snapshot: CoinSnapshot[]) {
       // 1. Build a price map for O(1) lookup by coin id
       const priceByCoinId = new Map(snapshot.map(c => [c.id, c.current_price]));

       // 2. Load fresh exchange rates (cached 1h, free)
       const rates = await this.coingecko.getExchangeRates();

       // 3. Load all active alerts in one query
       const alerts = await this.prisma.priceAlert.findMany({
         where: { triggeredAt: null },
       });

       // 4. Evaluate each alert
       const triggered: { alert, priceUsd, priceInAlertCurrency }[] = [];
       for (const alert of alerts) {
         const priceUsd = priceByCoinId.get(alert.coinId);
         if (priceUsd === undefined) continue; // coin not in top-100 — silently skip
         const price = this.convert(priceUsd, 'USD', alert.currency, rates);

         const fired =
           (alert.condition === 'ABOVE' && price >= Number(alert.targetPrice)) ||
           (alert.condition === 'BELOW' && price <= Number(alert.targetPrice));

         if (fired) triggered.push({ alert, priceUsd, priceInAlertCurrency: price });
       }

       // 5. For each triggered alert: atomic update with WHERE triggeredAt IS NULL
       //    so a concurrent evaluator (e.g. accidental restart) cannot double-fire.
       for (const t of triggered) {
         const result = await this.prisma.priceAlert.updateMany({
           where: { id: t.alert.id, triggeredAt: null },
           data: { triggeredAt: new Date() },
         });
         if (result.count === 0) continue; // someone else triggered it first

         await this.pushService.send(t.alert.userId, {
           title: `${t.alert.coinId.toUpperCase()} ${t.alert.condition.toLowerCase()} ${t.alert.targetPrice} ${t.alert.currency}`,
           body: `Now at ${t.priceInAlertCurrency.toFixed(2)} ${t.alert.currency}`,
         });
         await this.audit.log('alert.triggered', t.alert.userId, { alertId: t.alert.id });
       }
     }
   }
   ```

   Key properties of this design:
   - **No cron** — runs exactly when there's new data to evaluate against. No wasted cycles.
   - **No overlap lock** — `@OnEvent` queues handler invocations sequentially per emitter. The fetcher only emits after a successful 15s fetch; the handler always finishes before the next emit (push calls are async but the DB update happens first).
   - **Atomic firing** — the `updateMany` with `WHERE triggeredAt IS NULL` is a CAS (compare-and-swap). Even if the evaluator somehow ran twice for the same alert, only the first update sets `triggeredAt`; the second sees `count: 0` and skips.
   - **Push messages composed live** — no `notifications` table; the message is built from the alert row + current price. Reflects the schema decision.

5. **Tests**:
   - Mock the snapshot event payload; assert ABOVE alert at $50k with current $51k triggers, sets `triggeredAt`, calls `pushService.send` once.
   - Already-triggered alerts (`triggeredAt IS NOT NULL`) are not loaded by the query.
   - PushService: 410 response deletes the subscription.
   - **Idempotency**: emit the snapshot event twice rapidly with the same triggering price → assert `pushService.send` called only once (CAS works).
   - Coin not in snapshot → silently skipped, no error.

**Acceptance:** Manual test: in browser dev console, subscribe to push → backend logs subscription → create alert at price below current → within ~15s, OS-level notification appears. Backend logs show one `alert.triggered` audit row, not multiple.

**Commit:** `feat(backend): web push + snapshot-driven alert evaluator with cas idempotency`

---

### **Phase 7 — Frontend Bootstrap** (≈30 min)

**Goal:** Empty Angular app with all tooling installed.

1. `cd frontend && ng new . --standalone --style=css --routing --skip-install --strict` (project name: `crypto-dashboard-frontend`).
2. `npm install`.
3. Tailwind: `npm i -D tailwindcss postcss autoprefixer && npx tailwindcss init`. Configure `content`, set `darkMode: 'class'`. Add directives to `src/styles.css`.
4. Angular Material: `ng add @angular/material` (Indigo/Pink theme placeholder; we'll override).
5. `npm install rxjs ng-apexcharts apexcharts uuid && npm install -D @types/uuid`.
6. Replace Karma with Jest: `npm install -D jest @types/jest jest-preset-angular @angular-builders/jest @testing-library/angular @testing-library/jest-dom`. Wire `angular.json` test target and add `jest.config.js`.
7. PWA: `ng add @angular/pwa`.
8. i18n: `ng add @angular/localize`.
9. Create `src/environments/environment.ts` and `environment.prod.ts` with:
   ```ts
   export const environment = {
     production: false,
     apiBaseUrl: 'http://localhost:3000/api',
     binanceWsUrl: 'wss://stream.binance.com:9443/stream',
   };
   ```

**Acceptance:** `npm start` opens 4200 with no errors. Tailwind class works.

**Commit:** `chore(frontend): bootstrap angular 17 with tailwind, material, jest, pwa`

---

### **Phase 8 — Frontend Shell + Auth Integration** (≈2 hours)

**Goal:** Real login form talking to the real backend.

1. **AppShell**: top bar (logo, search placeholder, currency selector, theme toggle, user menu) + side nav + `<router-outlet>`. Responsive: drawer collapses under 768px.
2. **Routes** (`app.routes.ts`):
   - `/login` (PublicOnlyGuard — redirect to /dashboard if already authed)
   - `/register`
   - `''` (AuthGuard) → ShellComponent with children: dashboard, markets, coin/:id, watchlist, portfolio, alerts, news, settings.
   - `**` → 404.
3. **AuthApiService**: `register`, `login`, `refresh`, `logout`, `me` calling `${apiBaseUrl}/auth/...`. `withCredentials: true` for refresh cookie.
4. **AuthService** (state):
   - `currentUser = signal<User | null>(null)`
   - `accessToken = signal<string | null>(null)` (in memory only; survives via refresh on app load)
   - `isAuthenticated = computed(() => !!currentUser())`
   - `init()` on app start: try `/api/auth/refresh`; if 200, store token + fetch `/me`; if 401, leave logged out.
5. **AuthInterceptor**:
   - Adds `Authorization: Bearer <token>` to `/api/*` requests (except auth/refresh).
   - On 401: pause queue, call refresh, retry original request once. If refresh fails → redirect to /login.
6. **CSRF handling**: backend sets `XSRF-TOKEN` cookie. Angular's `HttpClientXsrfModule` automatically reads it and sends `X-XSRF-TOKEN` header. Configure cookieName + headerName.
7. **LoginComponent + RegisterComponent**: reactive forms, validation, submit → API → store token → navigate to dashboard. Display backend error messages from the unified error envelope.
8. **SettingsService** (frontend):
   - Loads from `/api/settings` after login.
   - Signals for theme/currency/locale.
   - PATCH on every change (debounced 300ms).
   - Apply theme by toggling `dark` class on `<html>`.
9. **Tests** (frontend):
   - AuthService.login happy path with mock HttpClient.
   - AuthInterceptor refreshes on 401 and retries.
   - LoginComponent shows error toast on bad creds.

**Acceptance:** Register a new user via UI → land on dashboard. Refresh page → still logged in. Wait 16 minutes → next API call silently refreshes the access token. Logout works.

**Commit:** `feat(frontend): app shell + real auth integration with refresh interceptor`

---

### **Phase 9 — Frontend Markets Page + Top-100 via Backend** (≈1.5 hours)

**Goal:** `/markets` shows top-100 coins from the backend snapshot endpoint with sortable columns. Design language draws from TradingView (chip-style timeframe selector, dense information layout, green/red price scale) — study patterns, do not copy assets.

1. **MarketApiService**:
   - `getTop()` — calls `/api/market/top` (Redis-backed).
   - `getCoin(id)` — coin detail.
   - `getKlines(symbol, interval, limit)` — calls `/api/market/ohlc/:symbol?interval=&limit=` (Binance-backed via backend).
   - `getChart(id, days)` — for line/area views.
   - `getSentiment()`, `getNews()`, `getExchangeRates()`.
2. Polling helper: `topCoins$ = timer(0, 15_000).pipe(switchMap(() => api.getTop()), shareReplay(1))`. **Cadence aligned with backend's 15s snapshot — no point polling faster than the data source updates.**
3. **CoinsTableComponent** with Material `<mat-table>`:
   - Columns: rank, name+icon, price, 1h, 24h, 7d, market cap, volume, sparkline, watchlist-star.
   - Sortable, paginated (20 rows), search filter (debounced 200ms).
   - Sparkline: small ApexCharts line chart per row.
   - Skeleton loader during initial load.
   - Click row → `/coin/:id`.
   - **TradingView-inspired touch**: brief background flash on price change (green if up, red if down), fades over 300ms via CSS transition. Disabled if `prefers-reduced-motion`.
4. **PriceChangeBadge** shared component: green/red coloring based on sign.

**Acceptance:** `/markets` shows 100 coins. Sort by market cap / 24h change works. Search "bitcoin" narrows to one row. No console errors. Refresh polls silently every 15s. Price changes flash green/red briefly.

**Commit:** `feat(frontend): markets page with top-100 from backend snapshot, tradingview-inspired flash`

---

### **Phase 10 — Frontend Binance WebSocket Layer** (≈2 hours)

**Goal:** Prices on `/markets` tick in real time. Reconnection works. Silent disconnects (half-open TCP, idle stream) detected within 10s and force a reconnect.

1. **BinanceWsService**:
   - Single shared connection via RxJS `webSocket()`.
   - Public API: `tick$(symbol): Observable<PriceTick>`.
   - Internal subscription set: refcount via `finalize`. When the set changes, send `SUBSCRIBE` / `UNSUBSCRIBE` frames.
   - **Connection pipeline (in this exact order)**:
     ```typescript
     this.connection$ = this.socket$.pipe(
       // (1) Throw TimeoutError if no message arrives for 10s — catches silent
       //     half-open sockets where the TCP connection lives but data stops flowing.
       //     Binance sends ticks for active pairs many times per second, so 10s
       //     of silence is unambiguously a dead stream.
       timeout({ each: 10_000 }),

       // (2) Multicast — every subscriber shares the same underlying socket.
       share({
         connector: () => new ReplaySubject(1),
         resetOnError: true,
         resetOnComplete: true,
         resetOnRefCountZero: true,
       }),

       // (3) Reconnect with exponential backoff. timeout() throws TimeoutError
       //     here, which retry() catches → new connection attempt.
       retry({
         count: Infinity,
         delay: (err, attempt) => {
           this.connectionState.set('reconnecting');
           return timer(Math.min(30_000, 2 ** attempt * 1000));
         },
       }),
     );
     ```
   - Connection state signal: `'connecting' | 'live' | 'reconnecting' | 'offline'`. Transitions:
     - On socket open → `live`.
     - On `timeout` or any error → `reconnecting`.
     - After 60s in `reconnecting` → `offline` (visible to user as red dot).
   - The first message after a reconnect resets the timeout window automatically (it's per-emission, not from connection start).
2. **PriceStreamService**:
   - Combines `MarketApiService.topCoins$` (15s snapshots) + Binance ticks.
   - `scan` accumulates a `Map<symbol, Coin>` keyed by binance symbol.
   - `throttleTime(250)` per symbol to bound UI updates.
   - Emits `topCoins$: Observable<Coin[]>` with live prices.
   - `priceFor(sym): Signal<Coin | undefined>` derived via `toSignal`.
3. CoinGecko symbol → Binance symbol: `${symbol.toUpperCase()}USDT`. Maintain a deny-list (`USDT`, `USDC`, `DAI`, `BUSD`) that skips WS subscription — these stablecoins have no Binance USDT pair.
4. Update `CoinsTableComponent` to consume `PriceStreamService.topCoins$`.
5. Connection-status pill in top bar bound to BinanceWsService state.
6. **Tests** (RxJS marbles + jest fake timers):
   - PriceStreamService merges snapshot + ticks correctly.
   - `timeout(10_000)` fires after 10s of silence → `retry()` reconnects (verify connection state transitions).
   - Reconnect attempts back off exponentially: 1s, 2s, 4s, 8s, 16s, 30s, 30s, …
   - First tick after reconnect resets the timeout (no false positive immediately after reconnecting).

**Acceptance:** Visible price changes at sub-second cadence. Disable Wi-Fi 5s → "Reconnecting…" → restore → "Live". CPU < 30% on 4-core laptop. **Half-open test**: use Chrome DevTools "Network → Throttling → Offline" for 11s while keeping the page open → after ~10s the status pill flips to "Reconnecting…" without waiting for a manual page refresh.

**Commit:** `feat(frontend): binance ws + 10s timeout watchdog + exponential-backoff retry`

---

### **Phase 11 — Frontend Coin Detail + Charts (Binance Klines)** (≈2.5 hours)

**Goal:** `/coin/:id` with candle/line/area chart powered by Binance Klines for granular timeframes (1m → 1M). Design language references TradingView.

1. **CoinDetailComponent**:
   - Resolves coin metadata from `/api/market/coin/:id`.
   - Live current price via `PriceStreamService.priceFor(symbol)`.
   - Header: icon, name, symbol, current price, 24h badge, market cap, rank.
   - Layout draws from TradingView's symbol detail page: header on top with price + key stats inline, chart taking 60-70% of viewport, stats panel collapsed/expandable on the right.

2. **TimeframeSelectorComponent** — TradingView-style chip group:
   - Options: `1m | 5m | 15m | 30m | 1H | 4H | 1D | 1W | 1M`.
   - Emits `{ interval: BinanceInterval, limit: number }`. Default limits chosen so the chart shows a useful window:
     - 1m → 120 candles (= 2h window)
     - 5m → 144 candles (= 12h)
     - 15m → 96 candles (= 24h)
     - 30m → 96 candles (= 48h)
     - 1H → 168 candles (= 1 week)
     - 4H → 180 candles (= 30 days)
     - 1D → 365 candles (= 1 year)
     - 1W → 156 candles (= 3 years)
     - 1M → 60 candles (= 5 years)
   - Active chip styled prominently (filled background, contrasting text).

3. **PriceChartComponent**:
   - Inputs: `symbol` (Binance format, e.g. `BTCUSDT`), `interval`, `limit`, `chartType` (`candle | line | area`).
   - On input change: `MarketApiService.getKlines(symbol, interval, limit)` → ApexCharts data.
   - All three chart types use the same kline data; `line`/`area` plot the close price.
   - ApexCharts dark/light variants, reactive to theme signal via `effect()`.
   - Skeleton loader while data fetches.
   - Color scheme matches TradingView: green up-candle `#26a69a`, red down-candle `#ef5350` (Material's default candle colors).
   - X-axis time format respects locale (`tr-TR` → `25 Nis 14:30`, `en-US` → `Apr 25 2:30 PM`).
   - Live updating: when a Binance tick arrives for the symbol, **update the last candle's close price** in place (don't redraw the whole chart). New candle starts on each interval boundary.

4. **ChartTypeToggleComponent**: small icon group (candle / line / area), persists last choice in `user_settings` (or just `localStorage` keyed by user — your call; project plan defaults to localStorage for a UI preference like this).

5. **CoinStatsComponent**: 24h high/low, ATH, ATL, supply (circulating/max), volume, market cap. Live where applicable. Right side panel, collapsible on mobile.

6. **Tests**:
   - PriceChartComponent renders with each `chartType` for fixture klines data.
   - Switching `interval` triggers `getKlines` with new params and replaces chart series.
   - Live tick updates last candle's `close` in place.

**Acceptance:** Click row in `/markets` → `/coin/BTCUSDT` loads in <1s. All 9 timeframes return data within 800ms. Switching candle/line/area is instant (cached data). Switching `1m` → `1H` shows weekly view. Dark mode respected. Last candle updates live with each Binance tick.

**Commit:** `feat(frontend): coin detail with binance klines (1m→1M) + tradingview-style chip selector`

---

### **Phase 12 — Frontend Watchlist + Portfolio + Alerts (DB-backed)** (≈2.5 hours)

**Goal:** All three features synced with backend, no `localStorage`.

1. **WatchlistService** (frontend state):
   - `items = signal<WatchlistItem[]>([])`
   - On login: `loadFromApi()` populates the signal.
   - `add(coinId)`: optimistic update → API call → on failure, rollback + toast.
   - `remove(coinId)`: same pattern.
   - `has(coinId): Signal<boolean>` for the star-toggle indicator.
2. **WatchlistComponent**: lists watched coins with same card layout as /markets, live prices via PriceStreamService. Empty state with CTA.
3. **PortfolioService** (frontend state):
   - `positions = signal<Position[]>([])` (active by default).
   - `totalValue = computed(...)`, `totalCost = computed(...)`, `totalPnL = computed(...)`, `totalPnLPercent`.
   - All values converted to user's preferred currency.
   - Optimistic add/edit/close/delete.
4. **PortfolioComponent**:
   - 4 KPI cards (value, cost, P&L, P&L %).
   - Doughnut allocation chart.
   - Active positions table with row actions (edit, close, delete).
   - Closed positions tab (filter switch).
5. **AddPositionDialog / ClosePositionDialog / EditPositionDialog**: Material dialogs, reactive forms.
6. **AlertsService** (frontend state):
   - `active = signal<Alert[]>([])` (triggeredAt IS NULL).
   - `triggered = signal<Alert[]>([])` (set on demand via `?includeTriggered=true`).
   - `add()`, `remove()`.
7. **AlertsComponent**: tabs Active / Triggered. New Alert button opens dialog. Each alert row shows coin, condition, target, status.
8. **Tests**:
   - WatchlistService rolls back on API failure.
   - PortfolioService computed values match expected math with seeded data.
   - AlertsService loads active vs triggered correctly.

**Acceptance:** Add coin to watchlist → reload page → still there (DB-backed). Close a position → moves to Closed tab; total value drops accordingly. Create alert.

**Commit:** `feat(frontend): watchlist, portfolio (with close), alerts — db-backed`

---

### **Phase 13 — Frontend Push Notifications** (≈1 hour)

**Goal:** Browser subscribes to push; receives real notification when alert triggers.

1. **PushService** (frontend):
   - `requestPermission()`: prompts the user if `Notification.permission === 'default'`.
   - `subscribe()`: gets VAPID public key from `/api/push/vapid-public-key`, calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, POSTs the subscription to `/api/push/subscribe`.
   - `unsubscribe()`: gets current subscription, calls `unsubscribe()` on it, DELETEs from backend.
   - `state = signal<'denied' | 'granted' | 'default' | 'unsupported'>(...)`.
2. **Service worker push listener** (extend the ngsw-generated one or use a custom one):
   ```js
   self.addEventListener('push', (event) => {
     const data = event.data.json();
     event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/assets/icons/icon-192.png' }));
   });
   self.addEventListener('notificationclick', (event) => {
     event.notification.close();
     event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
   });
   ```
3. **Settings page**: "Enable browser notifications" toggle wired to PushService.
4. **First-time prompt**: when user creates their first alert, prompt for permission.

**Acceptance:** Enable notifications → create alert at price below current price → within 30s, OS notification appears. Click notification → opens the app. Disable notifications → DELETE called, no further pushes.

**Commit:** `feat(frontend): web push subscription + service worker listener`

---

### **Phase 14 — Dashboard + Sentiment + News + Multi-Currency** (≈2 hours)

**Goal:** Useful dashboard composing existing widgets; news + sentiment pages.

1. **FearGreedCard** (Dashboard widget): ApexCharts radial-bar gauge from `/api/market/sentiment`. Color-coded.
2. **NewsComponent**: list of cards (thumbnail, source, title, excerpt, relative time, sentiment badge, "Read" link). Source filter chips.
3. **DashboardComponent** layout (responsive grid):
   - Row 1: 3 KPIs (portfolio value, top gainer 24h, top loser 24h).
   - Row 2: Fear & Greed gauge (1/3) + Top movers (2/3).
   - Row 3: Watchlist preview (top 5 + "View all").
   - Row 4: News (top 3 + "View all").
   - Each card has its own loading + error state.
4. **CurrencyConverterPipe**: takes USD value + target currency + exchange rates signal → returns formatted string with the locale's number rules.
5. Apply pipe everywhere a price is displayed. Switching currency in top bar updates everything live.

**Acceptance:** Dashboard loads in <2s on fresh session. Switch currency to TRY → every price re-renders as `30.452,17 ₺`.

**Commit:** `feat(frontend): dashboard, sentiment gauge, news feed, multi-currency`

---

### **Phase 15 — i18n (TR + EN)** (≈1 hour)

**Goal:** Full app translatable; user setting drives the language.

1. Mark all user-visible strings with `i18n` attribute or `$localize` tagged template.
2. `ng extract-i18n` → generates `messages.xlf`.
3. Create `messages.tr.xlf` and `messages.en.xlf`. Translate menu items, buttons, error messages, empty states.
4. Configure `angular.json` `i18n` block with two locales.
5. Build with `--localize`. Result: two builds, one per locale; serve based on `user_settings.locale`.
6. Settings page: locale toggle reloads to the proper build (use a small redirect logic to switch the served locale).
7. Date / number formatting respects locale via Angular's built-in pipes.

**Acceptance:** Switching locale to EN → menu items, buttons, error messages all in English. TR formats numbers as `30.452,17`, EN as `30,452.17`.

**Commit:** `feat(frontend): i18n with tr + en`

---

### **Phase 16 — Accessibility + Responsive Polish** (≈1.5 hours)

**Goal:** WCAG 2.1 AA + Lighthouse a11y ≥ 95.

1. Audit each page at 375px / 768px / 1280px. Fix overflows, hamburger nav, table responsiveness (collapse less-important columns under 768px).
2. Touch targets ≥ 44×44px.
3. Tab navigation: every interactive element reachable; visible `focus-visible` ring.
4. Color contrast ≥ 4.5:1; verify with Material's palettes — adjust dark mode if any combos fail.
5. `aria-label` on icon-only buttons; `aria-live="polite"` on toast region; `<label>` on every input.
6. `prefers-reduced-motion`: disable chart animations and entrance transitions.
7. Skeleton loaders on every data-loading view.
8. Empty states (illustration + helpful CTA) for watchlist / portfolio / alerts when empty.
9. Run Lighthouse: target Performance ≥ 85, A11y ≥ 95, Best Practices ≥ 90, SEO ≥ 90.

**Acceptance:** Lighthouse scores meet targets on /dashboard and /markets. Tab through every page without losing focus.

**Commit:** `feat(frontend): a11y polish, responsive layouts, empty/loading states`

---

### **Phase 17 — PWA Finalization** (≈45 min)

**Goal:** Installable PWA with offline support.

1. Update `manifest.webmanifest`: name, short_name, theme_color (`#2563eb`), background_color, all icon sizes.
2. Configure `ngsw-config.json`:
   - `assetGroups`: `app` (prefetch bundle), `assets` (lazy-cache fonts/images).
   - `dataGroups`:
     - `market-top` (URL pattern `/api/market/top`): `freshness` strategy, 30s cache.
     - `market-static` (`/api/market/coin/**`, `/api/market/ohlc/**`): `performance` strategy, 1h.
3. Install prompt: show banner / button when `beforeinstallprompt` fires.
4. Offline banner: when navigator.onLine is false, show "Offline — data may be stale".
5. Test offline: load app, disconnect, navigate to previously viewed pages → still render.

**Acceptance:** Chrome shows install icon. After install, app opens in its own window. Offline navigation works for cached pages.

**Commit:** `feat(frontend): pwa manifest, ngsw config, install prompt, offline banner`

---

### **Phase 18 — Frontend Tests + E2E** (≈2 hours)

**Goal:** ≥60% coverage on services; 5 E2E happy paths green.

1. **Unit / component tests** (Jest + Angular Testing Library):
   - AuthService.login + token refresh
   - StorageService get/set/remove (legacy storage abstraction if we kept any)
   - WatchlistService optimistic add + rollback
   - PortfolioService computed totals (3 seeded scenarios)
   - PriceStreamService merge logic (marble tests)
   - BinanceWsService reconnect (mocked WebSocket)
   - LoginComponent renders error on bad creds
   - CoinsTableComponent renders 100 rows from seed
2. **E2E with Playwright**:
   - Install: `npm i -D @playwright/test && npx playwright install chromium`.
   - 5 happy paths:
     1. Register → land on dashboard.
     2. Login → add coin to watchlist → reload → still there.
     3. Create position with 0.5 BTC at $30k → P&L renders.
     4. Create alert at price below current → wait 35s → notification (mock browser permission).
     5. Delete account → /me returns 401.
3. Runs against local backend + Postgres (test schema).

**Acceptance:** All unit tests pass with ≥60% coverage. All 5 Playwright tests pass against dev stack.

**Commit:** `test(frontend): unit + component + playwright e2e`

---

### **Phase 19 — Backend Security Hardening + Tests Round 2** (≈2 hours)

**Goal:** All OWASP Top 10 covered, ZAP clean scan, integration tests for security.

1. **Security checklist verification** (each item must be tested or commented):
   - [ ] argon2 timeCost = 12 (audit `auth.service.ts`).
   - [ ] JWT secrets ≥ 32 bytes; rotated via env.
   - [ ] Refresh token stored as sha256 hash, never plaintext.
   - [ ] Refresh cookie: httpOnly, secure (prod only), sameSite=lax.
   - [ ] CSRF: double-submit pattern; verify via test that missing header → 403.
   - [ ] Helmet headers present (verify via supertest).
   - [ ] CORS allowlist enforces `FRONTEND_ORIGIN` (no wildcard).
   - [ ] ValidationPipe with `whitelist + forbidNonWhitelisted` (test rejects extra fields).
   - [ ] Rate limit returns 429 after threshold (test).
   - [ ] Account lockout after 10 failed logins in 15min (add this — extra mitigation).
   - [ ] All Prisma queries parametrized (no `$queryRaw` with template strings).
   - [ ] Outbound HTTP allowlist: only `api.coingecko.com`, `api.alternative.me`, `*.binance.com` (informational, document in code).
2. **STRIDE threat model** in `docs/adr/ADR-007-threat-model.md`: walk through 6 threats (spoofing, tampering, repudiation, info disclosure, DoS, elevation), document mitigations.
3. **OWASP ZAP baseline scan** (manual, document the result):
   - Run `docker run -t owasp/zap2docker-stable zap-baseline.py -t http://host.docker.internal:3000`.
   - Triage findings; record in `docs/security-scan-{date}.md`.
4. **Integration tests** for security controls:
   - 11 failed logins → 11th returns 429.
   - POST /portfolio without CSRF token → 403.
   - GET /portfolio with expired access token → 401, refresh succeeds, retry → 200.
   - User A tries to PATCH user B's position → 404 (not 403, no leak).
5. **Dependabot** config (`.github/dependabot.yml`): weekly npm updates for both subprojects.

**Acceptance:** All checklist boxes ticked. ZAP baseline returns no high-severity findings. Integration tests green.

**Commit:** `feat(backend): security hardening — owasp top 10 controls + zap clean`

---

### **Phase 20 — CI/CD** (≈1.5 hours)

**Goal:** Both subprojects CI'd; PRs blocked on red.

1. **`.github/workflows/backend-ci.yml`**:
   - Trigger: push + PR on `backend/**`.
   - Services: postgres + redis (via `services:` block).
   - Steps: checkout, setup-node 20, `npm ci`, `npx prisma migrate deploy`, `npm run lint`, `npm test -- --coverage`, `npm run test:e2e`, build.
   - Coverage upload as artifact.
2. **`.github/workflows/frontend-ci.yml`**:
   - Trigger: push + PR on `frontend/**`.
   - Steps: checkout, setup-node 20, `npm ci`, `npm run lint`, `npm test -- --coverage`, `npm run build`, Lighthouse CI with budgets (perf ≥ 85, a11y ≥ 95) on built `dist/`.
3. **Branch protection**: main requires both workflows to pass (manual GitHub config, document in README).
4. README badges: build status for both, license, demo link.

**Acceptance:** PR shows two green checks. Failing test blocks merge.

**Commit:** `chore(ci): github actions for frontend and backend with lighthouse budgets`

---

### **Phase 21 — OpenAPI Specification (`@nestjs/swagger` → `openapi.yaml`)** (≈1 hour)

**Goal:** Auto-generate the `openapi.yaml` artifact required by the PROJE-RAPORU rubric, derived from existing DTOs and controller decorators (no manual maintenance).

1. **Install dependencies** in `backend/`:
   ```bash
   npm install @nestjs/swagger
   npm install -D js-yaml @types/js-yaml
   ```

2. **Enable the Swagger CLI plugin** in `nest-cli.json` — this auto-injects schema decorators from TypeScript types so we don't have to annotate every property manually:
   ```json
   {
     "compilerOptions": {
       "plugins": [
         {
           "name": "@nestjs/swagger",
           "options": { "introspectComments": true }
         }
       ]
     }
   }
   ```
   With `introspectComments: true`, JSDoc comments on DTO properties become schema descriptions automatically.

3. **Add Swagger decorators to controllers** — the plugin handles most fields; controllers need explicit `@ApiTags()` and `@ApiBearerAuth()` for auth-protected groups. Example for one controller; replicate the pattern across all of them:
   ```typescript
   @ApiTags('Auth')
   @Controller('auth')
   export class AuthController {
     @Post('login')
     @ApiOperation({ summary: 'Log in with email and password' })
     @ApiResponse({ status: 200, type: LoginResponseDto })
     @ApiResponse({ status: 401, description: 'Invalid credentials' })
     @ApiResponse({ status: 429, description: 'Too many attempts' })
     login(@Body() dto: LoginDto) { ... }
   }
   ```
   Tags to apply: `Auth`, `Users`, `Settings`, `Watchlist`, `Portfolio`, `Alerts`, `Push`, `Market`, `Health`. Add `@ApiBearerAuth()` at the controller level for any controller that has a global `@UseGuards(JwtAuthGuard)`.

4. **Wire Swagger into `main.ts`** — exposes the live spec at `/api/docs` (interactive Swagger UI) **only in non-production**:
   ```typescript
   if (process.env.NODE_ENV !== 'production') {
     const config = new DocumentBuilder()
       .setTitle('Crypto Dashboard API')
       .setDescription('Final project for BMU1208 Web-Based Programming')
       .setVersion('1.0.0')
       .addBearerAuth()
       .addCookieAuth('refresh_token')
       .addServer('http://localhost:3000', 'Local')
       .build();
     const document = SwaggerModule.createDocument(app, config);
     SwaggerModule.setup('api/docs', app, document);
   }
   ```
   Production-disabled to avoid leaking endpoint structure to scanners — the YAML file in the repo is the canonical reference.

5. **Build script: `scripts/generate-openapi.ts`** — runs the same `createDocument()` call but writes the result to disk as YAML:
   ```typescript
   import { NestFactory } from '@nestjs/core';
   import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
   import * as fs from 'fs';
   import * as yaml from 'js-yaml';
   import { AppModule } from '../src/app.module';

   async function generate() {
     const app = await NestFactory.create(AppModule, { logger: false });
     const config = new DocumentBuilder()
       .setTitle('Crypto Dashboard API')
       .setVersion('1.0.0')
       .addBearerAuth()
       .build();
     const document = SwaggerModule.createDocument(app, config);
     fs.writeFileSync('../docs/openapi.yaml', yaml.dump(document, { lineWidth: 120 }));
     fs.writeFileSync('../docs/openapi.json', JSON.stringify(document, null, 2));
     await app.close();
     console.log('Wrote docs/openapi.yaml and docs/openapi.json');
   }

   generate().catch((e) => { console.error(e); process.exit(1); });
   ```

6. **Add npm script** to `backend/package.json`:
   ```json
   "scripts": {
     "openapi:generate": "ts-node scripts/generate-openapi.ts"
   }
   ```

7. **Wire into CI** — extend `.github/workflows/backend-ci.yml` with a step after the build:
   ```yaml
   - name: Generate OpenAPI spec
     run: npm run openapi:generate
   - name: Verify spec is committed and up to date
     run: git diff --exit-code docs/openapi.yaml docs/openapi.json
   ```
   The `--exit-code` flag fails CI if the generated file differs from what's committed — forces the developer to regenerate after API changes. Document in the README: "Run `npm run openapi:generate` after modifying any controller or DTO."

8. **Tests** — verify the spec generates without errors and contains expected paths:
   ```typescript
   it('generates a valid openapi spec with all expected paths', async () => {
     const app = await NestFactory.create(AppModule, { logger: false });
     const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
     expect(Object.keys(document.paths)).toEqual(
       expect.arrayContaining([
         '/api/auth/login', '/api/auth/register', '/api/auth/refresh',
         '/api/me', '/api/settings',
         '/api/watchlist', '/api/portfolio', '/api/alerts',
         '/api/push/subscribe', '/api/push/vapid-public-key',
         '/api/market/top', '/api/market/ohlc/{symbol}',
       ]),
     );
     await app.close();
   });
   ```

9. **Verify the rubric requirement** — `docs/openapi.yaml` exists at the repo root, is valid OpenAPI 3.x (paste into editor.swagger.io to confirm). Add a screenshot of the Swagger UI to the report's Appendix B.

**Acceptance:**
- `npm run openapi:generate` produces `docs/openapi.yaml` and `docs/openapi.json`.
- `http://localhost:3000/api/docs` shows interactive Swagger UI in dev mode.
- The YAML validates as OpenAPI 3.x at `editor.swagger.io`.
- All 22+ endpoints from §3.4 appear with correct request/response schemas.
- CI fails if the committed YAML drifts from generated.

**Commit:** `feat(backend): @nestjs/swagger with auto-generated openapi.yaml + ci drift check`

---

### **Phase 22 — Deployment** (≈1.5 hours)

**Goal:** Live URLs matching the spec; demo creds work end-to-end.

1. **Backend on Railway**:
   - Create project, link GitHub repo, set root directory `backend/`.
   - Add Postgres + Redis plugins; set `DATABASE_URL`, `REDIS_URL` from Railway-injected vars.
   - Set all `JWT_*`, `VAPID_*`, `FRONTEND_ORIGIN` env vars.
   - Build command: `npm ci && npx prisma migrate deploy && npm run build`.
   - Start command: `node dist/main.js`.
   - Custom domain (optional): `api.your-domain.com`.
2. **Frontend on Vercel**:
   - Create project, link GitHub, set root directory `frontend/`.
   - Build command: `npm ci && npm run build -- --localize`.
   - Output dir: `dist/crypto-dashboard-frontend/browser`.
   - Env: `apiBaseUrl=https://<railway-url>/api`.
   - Add `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.
3. **Smoke test on prod URL**:
   - Register a fresh user → land on dashboard with live prices ticking.
   - Add a portfolio position → reload → persists.
   - Create an alert at a low price → notification arrives within ~15s (snapshot cadence).
4. **Seed a demo user** via a one-shot script: `npm run seed:demo` in backend, creates `demo@example.com` / `demo123` (matches the README's published creds). Document this — it's a deliberate exception to "no hardcoded creds in prod" because the spec promises this account.
5. Update root `README.md` with both live URLs, screenshots (capture 8: landing, login, dashboard empty/full, markets, coin detail, mobile, dark mode, error state).

**Acceptance:** Visiting the live frontend URL, logging in with `demo@example.com / demo123`, sees a dashboard with live prices and seeded demo data (1-2 watchlist items, 1 portfolio position, 1 alert).

**Commit:** `chore(deploy): deploy backend to railway + frontend to vercel + seed demo`

---

## 6. Definition of Done (V1)

The project is "done" when **all** of the following are true:

- [ ] `docker compose up -d` starts both services healthy.
- [ ] Backend `npm run start:dev` boots clean; `/api/health` returns 200.
- [ ] Frontend `npm start` boots clean.
- [ ] All 8 features from the spec demonstrably work (see checklist below).
- [ ] Lighthouse: Performance ≥ 85, A11y ≥ 95, PWA installable.
- [ ] Backend test coverage ≥ 70% on services.
- [ ] Frontend test coverage ≥ 60% on services.
- [ ] All 5 Playwright E2E scenarios pass.
- [ ] OWASP ZAP baseline scan: no high-severity findings.
- [ ] CI green on both subprojects.
- [ ] Live demo URL works with `demo@example.com / demo123`.
- [ ] `README.md` has 8+ screenshots and both live URLs.
- [ ] `docs/openapi.yaml` exists, validates as OpenAPI 3.x, regenerates cleanly via `npm run openapi:generate`.
- [ ] CoinGecko traffic verified ≤ 4 requests/min in production logs (snapshot fetcher only).
- [ ] WebSocket survives a 15-second network black-hole (timeout watchdog kicks in, reconnect succeeds).

### Spec feature checklist

- [ ] Top 100 cryptos with real-time prices via WebSocket
- [ ] Multi-chart (candle / line / area), 9 timeframes (1m / 5m / 15m / 30m / 1H / 4H / 1D / 1W / 1M) via Binance Klines
- [ ] Personal watchlist (DB-backed)
- [ ] Portfolio tracking (qty × price → live P&L; close positions for realized P&L)
- [ ] Price alerts (snapshot-driven evaluator, push when triggered, idempotent via CAS)
- [ ] News + sentiment feed
- [ ] Dark mode + responsive
- [ ] PWA: installable + push notifications
- [ ] Multi-currency: TRY, USD, EUR
- [ ] Multi-language: TR, EN
- [ ] Auto-generated OpenAPI 3 spec at `docs/openapi.yaml`

---

## 7. Anti-Patterns (Things the Agent Must NOT Do)

- **Do not** invent endpoints not listed in §3.4.
- **Do not** call CoinGecko directly from the frontend — always go through `/api/market/*`.
- **Do not** call the Binance WebSocket through the backend — keep it direct from the browser.
- **Do not** store the refresh token plaintext anywhere — only the sha256 hash in `refresh_tokens.tokenHash`.
- **Do not** put `localStorage` calls anywhere except inside a `StorageService` (kept for theme + access-token-on-page-reload only).
- **Do not** subscribe to RxJS streams in components without `takeUntilDestroyed()`.
- **Do not** use `$queryRaw` with template literals in Prisma — use parametrized form or `Prisma.sql`.
- **Do not** add new dependencies without checking they're maintained (last commit < 12 months).
- **Do not** add NgRx, Redux, MobX, Zustand, or any state library.
- **Do not** skip a phase. Each phase is a checkpoint.
- **Do not** leave `.env` files committed — `.env.example` only.
- **Do not** mark TODO comments and call a phase done. Tests + acceptance criteria must pass.

---

## 8. Time Estimate Summary

| Phase | Estimate |
|---|---|
| 0. Repo + Docker Compose | 30 min |
| 1. Backend bootstrap | 45 min |
| 2. Backend auth | 2.5h |
| 3. Backend users + settings + KVKK | 1h |
| 4. Backend market (CoinGecko fetcher + Binance Klines + sentiment + news) | 2.5h |
| 5. Backend watchlist + portfolio + alerts CRUD | 2h |
| 6. Backend push + snapshot-driven alert evaluator | 2h |
| 7. Frontend bootstrap | 30 min |
| 8. Frontend shell + auth | 2h |
| 9. Frontend markets page | 1.5h |
| 10. Frontend Binance WS (with timeout watchdog) | 2h |
| 11. Frontend coin detail + Binance Klines charts | 2.5h |
| 12. Frontend watchlist/portfolio/alerts (DB) | 2.5h |
| 13. Frontend push | 1h |
| 14. Dashboard + sentiment + news + multi-currency | 2h |
| 15. i18n | 1h |
| 16. A11y + responsive | 1.5h |
| 17. PWA finalization | 45 min |
| 18. Frontend tests + E2E | 2h |
| 19. Backend security + tests round 2 | 2h |
| 20. CI/CD | 1.5h |
| 21. OpenAPI generation (`@nestjs/swagger`) | 1h |
| 22. Deployment | 1.5h |
| **Total** | **≈34 hours focused work** |

Realistic calendar with debugging and breaks: **7–11 days at full focus**, or **3.5 weeks at 2h/day**.

---

## 9. Recommended First Prompt for Claude Code

When you open Claude Code in this repo, paste:

> Read `DEVELOPMENT-PLAN.md`, `README.md`, and `PROJE-RAPORU.md` in this directory. Then start **Phase 0 — Repo & Docker Compose**. After completing it, stop and show me the result; do not proceed to Phase 1 until I confirm. For every phase: follow the task list in order, write the unit tests it asks for, meet the acceptance criteria, and commit at the end with the message specified in the plan. If anything in the plan is ambiguous or you disagree with a choice, ask before proceeding — do not improvise.

This forces phase-by-phase progress with explicit checkpoints so you stay in the loop.
