# ADR-007 — STRIDE Threat Model

**Status:** Accepted
**Date:** 2026-05-02
**Supersedes:** —
**Context:** Phase 19 — Backend Security Hardening + Tests Round 2

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
| 4 | Replay of an access token after logout/delete     | Continued access for ≤ 15 min   | `JwtStrategy.validate()` re-checks the user row exists; deleted users → 401.                | `users.e2e-spec.ts` "GET /api/me after deletion → 401".                     |

## T — Tampering

| # | Threat                                            | Impact                          | Mitigation                                                                                  | Verification                                                                |
| - | ------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 5 | Cross-site request forgery on state-changing API  | Unauthorised writes via browser | Double-submit CSRF cookie via `csurf`; missing/invalid X-XSRF-TOKEN → 403.                  | `security.e2e-spec.ts` "POST /portfolio without CSRF → 403".                |
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
| 14| Cross-origin reads bypass cookie SameSite=lax     | Auth/CSRF bypass                | CORS allowlist pinned to `FRONTEND_ORIGIN` (no wildcard); `credentials: true`.              | `main.ts:17-20`; manual smoke.                                              |

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
- **No CSP / SRI yet** — defended by frontend (Angular's contextual escaping); will be revisited if a CDN is introduced.
- **Refresh tokens live 7 days** — long enough that a stolen cookie has a window. Mitigated by rotation + sha256 hash storage.

## Decisions

1. Keep both per-IP throttling and per-user lockout. They protect against different attacker models.
2. Strip lockout fields from API responses (`sanitizeUser`) so an attacker can't probe lockout state.
3. Boot-time secret check fails fast rather than silently running with a weak key.
