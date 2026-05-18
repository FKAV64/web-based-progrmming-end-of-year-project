# ADR-007 — STRIDE Threat Model

**Status:** Accepted
**Date:** 2026-05-18 (revised; original 2026-05-02)
**Supersedes:** ADR-007 (2026-05-02 revision)
**Context:** Phase 19 (Backend Security Hardening) + post-restructure
security adjustments. Material changes since the 2026-05-02 revision:

1. **`csurf` double-submit middleware removed** — it broke every
   state-changing POST in the cross-origin production deployment
   (Vercel frontend → Railway API). CSRF is now mitigated structurally:
   the **access token is a Bearer token returned in the response body**
   and held client-side (not a cookie), so browsers never auto-attach
   it cross-site. The only cookie-authenticated endpoint is
   `POST /api/auth/refresh` (`refresh_token` httpOnly cookie), guarded
   by token rotation + a CORS allowlist pinned to `FRONTEND_ORIGIN`
   (`credentials: true`, no wildcard) + a `SameSite` cookie.
2. **Refresh-cookie attributes are now dynamic**: cross-site
   deployments (prod, or `FRONTEND_ORIGIN` starting with `https://`)
   get `Secure` + `SameSite=None`; local dev gets `SameSite=Lax`.
3. **Instant logout-all** via a server-side `User.logoutAllAt`
   timestamp: any access/refresh token issued before that instant is
   rejected by `JwtStrategy`, in addition to refresh-row revocation.

---

## Scope

Crypto Dashboard backend (NestJS + Prisma + Postgres + Redis), exposed at
`/api/*`, consumed by the Angular frontend served from a separate origin.

The model walks the six STRIDE categories and lists the threat → impact →
mitigation → verification (test or code reference) for each. Anything that
reads "no test — code reference only" relies on code review, not an automated
check.

---

## S — Spoofing

| # | Threat                                            | Impact                          | Mitigation                                                                                  | Verification                                                                |
| - | ------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1 | Attacker forges JWT with weak/leaked secret       | Full account takeover           | `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` enforced ≥ 32 bytes at boot (`main.ts`).       | `assertSecretsHardened()` throws on boot; covered by smoke run.             |
| 2 | Credential stuffing against `/api/auth/login`     | Account takeover at scale       | Argon2id (timeCost ≥ 12) + per-IP rate limit (5/min) + per-user lockout (10 fails / 15min). | `auth.service.spec.ts` lockout suite + `security.e2e-spec.ts` 11→429 test.  |
| 3 | Stolen refresh-token cookie used from another box | Session hijack                  | Refresh token stored as sha256 hash; rotated on every `/refresh`; revoked on logout.        | `auth.service.spec.ts` refresh rotation test.                               |
| 4 | Replay of an access token after logout/delete     | Continued access for ≤ 15 min   | `JwtStrategy.validate()` re-checks the user row exists **and** rejects any token issued before `User.logoutAllAt`; deleted users → 401. `POST /auth/logout-all` sets `logoutAllAt = now` for instant, all-device revocation. | `users.e2e-spec.ts` "GET /api/me after deletion → 401"; `security.e2e-spec.ts` expired-token→refresh flow. |

## T — Tampering

| # | Threat                                            | Impact                          | Mitigation                                                                                  | Verification                                                                |
| - | ------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 5 | Cross-site request forgery on state-changing API  | Unauthorised writes via browser | **No `csurf`** (removed — its double-submit broke cross-origin POST in prod). Structural defense instead: the access token is a **Bearer token in the response body / `Authorization` header, not a cookie**, so browsers never auto-send it cross-site → all mutating endpoints (`@UseGuards(JwtAuthGuard)`) are not CSRF-able. The lone cookie-auth endpoint, `POST /auth/refresh`, is protected by token rotation + CORS pinned to `FRONTEND_ORIGIN` + a `SameSite` cookie. | Code reference: `auth.controller.ts` (Bearer in body, `refresh_token` cookie only), `main.ts` CORS allowlist. No automated CSRF test (pattern retired with `csurf`). |
| 6 | Mass-assignment via extra DTO fields              | Privilege escalation, role flip | Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.                   | Existing controller specs reject unknown fields with 400.                   |
| 7 | SQL injection through user input                  | DB exfiltration / corruption    | All queries go through Prisma's parameterised query builder; no `$queryRaw`.                | Code reference: `grep -r "\$queryRaw" backend/src` returns no matches.      |
| 8 | JWT alg=none / algorithm confusion                | Forged tokens                   | `passport-jwt` + explicit `secretOrKey`; default verifier rejects `alg=none`.               | `jwt.strategy.ts:22`; covered transitively by auth e2e.                     |

## R — Repudiation

| # | Threat                                            | Impact                          | Mitigation                                                                                  | Verification                                                                |
| - | ------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 9 | User denies action (login, position close, etc.)  | No accountability               | `AuditService.log()` writes user id, action, IP, UA, JSON meta into `audit_log` table.      | `auth.service.spec.ts` audit-log assertions; `users.e2e-spec.ts` cascade.   |
| 10| User row deleted → audit trail lost               | Repudiation                     | `AuditLog.userId` uses `onDelete: SetNull`, so rows survive account deletion.               | `users.e2e-spec.ts` "user.deleted" audit row survives DELETE /api/me.       |

## I — Information Disclosure

| # | Threat                                            | Impact                          | Mitigation                                                                                  | Verification                                                                |
| - | ------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 11| Password hash leaked in API responses             | Offline cracking                | `AuthService.sanitizeUser()` strips `passwordHash` (and lockout fields) from responses.     | `users.e2e-spec.ts` "no passwordHash in /me/export".                        |
| 12| IDOR: User A reads/writes User B's data           | Account-scoped data leak        | All scoped queries use `findFirst({ where: { id, userId } })` → 404 on miss (no 403 leak).  | `security.e2e-spec.ts` "User A PATCH user B's position → 404".              |
| 13| Verbose error stack traces in prod                | Internal-structure leak         | `HttpExceptionFilter` returns `{ statusCode, message, path, timestamp }` only.              | `http-exception.filter.ts`; existing controller specs.                      |
| 14| Cross-origin reads/writes bypass cookie SameSite  | Auth/CSRF bypass                | CORS allowlist pinned to `FRONTEND_ORIGIN` (no wildcard), `credentials: true`. Refresh cookie attributes are environment-aware: cross-site (prod / `https://` origin) → `Secure` + `SameSite=None`; local dev → `SameSite=Lax`. | `main.ts` (`enableCors`), `auth.controller.ts` `getCookieOptions()`; manual smoke. |

## D — Denial of Service

| # | Threat                                            | Impact                          | Mitigation                                                                                  | Verification                                                                |
| - | ------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 15| Login flood from a single IP                      | CPU burn (argon2 verify)        | Per-route throttler 5/min on `/auth/login` and `/auth/register`.                            | `auth.e2e-spec.ts` "5 fails → 6th = 429".                                   |
| 16| Distributed credential-stuffing across many IPs   | Account takeover bypass         | Per-user lockout: 10 fails / 15 min → account locked for 15 min.                            | `security.e2e-spec.ts` "11 failed logins → 429".                            |
| 17| Global request flood                              | Service unavailability          | Global throttler 100/min/IP via `ThrottlerModule`.                                          | `app.module.ts:25`.                                                         |
| 18| Slow upstream (CoinGecko / Binance) blocks calls  | Cascading timeouts              | All outbound HTTP wrapped in `fetchWithRetry` with explicit timeouts; cached in Redis.      | `coingecko.service.ts`; not load-tested.                                    |

## E — Elevation of Privilege

| # | Threat                                            | Impact                          | Mitigation                                                                                  | Verification                                                                |
| - | ------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 19| Unauthenticated access to user resources          | Full data exposure              | All non-public controllers carry `@UseGuards(JwtAuthGuard)`.                                | E2e suites assert 401 on missing token across Portfolio/Watchlist/Alerts.   |
| 20| User claims `role: ADMIN` via DTO                 | Admin actions from regular user | Role is server-side only; not in any DTO; ValidationPipe `forbidNonWhitelisted` strips.     | Schema: `User.role` defaults to `USER`; no admin endpoints currently used.  |
| 21| Outbound SSRF to internal services                | Internal-network probing        | All outbound calls hit a documented allowlist (`api.coingecko.com`, `api.alternative.me`, `*.binance.com`); no user-controlled URL is fetched server-side. | `main.ts` allowlist comment + code review.                                  |

---

## Residual risk

- **Per-user lockout is by email**, so an attacker can lock a victim out by spamming wrong passwords (mild DoS, 15 min). Acceptable trade-off vs. credential-stuffing protection.
- **Access token held client-side** (returned in the response body, kept in an Angular service in memory). A successful XSS could read it; mitigated by Angular's contextual auto-escaping, the short 15-min TTL, and refresh rotation. No custom CSP — Helmet's default CSP is active (verified PASS in the ZAP baseline) but not tightened per-route.
- **`csurf` removed**: CSRF defense is now structural (Bearer access token is never a cookie). This holds only as long as no mutating endpoint authenticates via a cookie. Any future cookie-authenticated write **must** reintroduce a CSRF token.
- **Refresh tokens live 7 days** — long enough that a stolen cookie has a window. Mitigated by rotation + sha256 hash storage + instant `logoutAllAt` revocation.

## Decisions

1. Keep both per-IP throttling and per-user lockout. They protect against different attacker models.
2. Strip lockout fields from API responses (`sanitizeUser`) so an attacker can't probe lockout state.
3. Boot-time secret check fails fast rather than silently running with a weak key.
4. **Remove `csurf`.** Its double-submit cookie broke every cross-origin POST in the Vercel→Railway production split. Replace it with a Bearer-token-not-cookie model so state-changing endpoints carry no ambient cookie credential and are inherently non-CSRF-able; the single cookie-auth endpoint (`/auth/refresh`) is covered by rotation + CORS pin + `SameSite`.
5. **Access token in body, refresh token in httpOnly cookie.** Keeps the long-lived secret out of JavaScript while keeping the short-lived token off the cookie jar (CSRF-safe). Refresh-cookie `Secure`/`SameSite` are environment-aware so local HTTP dev still works while prod stays cross-site-safe.
