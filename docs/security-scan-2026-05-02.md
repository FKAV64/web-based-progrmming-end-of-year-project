# OWASP ZAP Baseline Scan — 2026-05-02

## How to reproduce

The backend must be reachable on port 3000 from inside the ZAP container.
On Windows / macOS the container reaches the host via `host.docker.internal`.

```bash
# 1. Boot infra + backend on host port 3000.
docker compose up -d postgres redis
cd backend && npm run start:dev

# 2. Run the baseline scan (passive only — no attacks).
docker run --rm \
  -t \
  -v "$(pwd):/zap/wrk:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
  -t http://host.docker.internal:3000/api \
  -I            # do not fail the run on warnings (we triage manually)
```

The scan typically runs ~3 minutes and reports under three buckets:
**FAIL / WARN / PASS**.

## Triage policy

- **FAIL** — must be fixed before release; scan is rerun until clean.
- **WARN** — accept with a written justification in this file.
- **PASS / INFO** — note here for the record.

## Findings

> Captured on 2026-05-02 against commit `8786080` (master branch, Phase 19).
> Re-run after any change that touches `main.ts`, `helmet`, `csurf`, or response headers.
>
> **Scan stats: FAIL-NEW: 0 | WARN-NEW: 3 | PASS: 64**
> Target: `http://host.docker.internal:3000/api` — 5 URLs discovered.
> Image: `ghcr.io/zaproxy/zaproxy:stable` (digest `sha256:707fc6b9fd83…`).

### FAIL

_None._

### WARN (accepted)

| ZAP rule | Rule ID | Occurrences | Why accepted |
| -------- | ------- | ----------- | ------------ |
| Cookie No HttpOnly Flag | 10010 | 4 × 404 responses (/, /api, /robots.txt, /sitemap.xml) | `XSRF-TOKEN` cookie intentionally omits `HttpOnly` — Angular's `HttpClientXsrfModule` must read it via JavaScript for the double-submit CSRF pattern. The companion `_csrf` secret cookie **does** have `HttpOnly`. |
| Storable and Cacheable Content | 10049 | 4 × 404 responses | Default Express 404 responses lack an explicit `Cache-Control: no-store` header. Authenticated API responses set proper cache headers. Low real-world risk; no sensitive data in 404 bodies. |
| Session Management Response Identified | 10112 | 6 × 404 responses | ZAP detected cookie-based session management. Correct — the app issues a `refresh_token` httpOnly cookie and an `XSRF-TOKEN` cookie. This is informational; the cookies are correctly scoped and flagged `SameSite=Lax`. |

### Notable PASSes (rules expected to fail in dev that actually pass)

| ZAP rule | Rule ID | Result |
| -------- | ------- | ------ |
| Strict-Transport-Security Header | 10035 | **PASS** — Helmet sets the HSTS header on all responses. |
| Content Security Policy (CSP) Header Not Set | 10038 | **PASS** — Helmet's default CSP policy is active. |
| X-Content-Type-Options Header Missing | 10021 | **PASS** — Helmet sets `nosniff` globally. |
| Anti-clickjacking Header | 10020 | **PASS** — Helmet sets `X-Frame-Options: SAMEORIGIN`. |
| Server Leaks Information via X-Powered-By | 10037 | **PASS** — `X-Powered-By` header is suppressed. |
| Cookie without SameSite Attribute | 10054 | **PASS** — Both cookies carry `SameSite=Lax`. |
| Permissions Policy Header Not Set | 10063 | **PASS** — Helmet sets the Permissions-Policy header. |

### Spider coverage note

ZAP's spider started from `/api` (returns 404) and found 5 URLs: `/`, `/api`,
`/robots.txt`, `/sitemap.xml`, and one duplicate. All are unauthenticated paths.
Authenticated endpoints (`/api/portfolio`, `/api/alerts`, etc.) are not reachable
by the unauthenticated baseline spider — they are covered by the integration test
suite (`security.e2e-spec.ts`, 5 security-specific tests).

### Out of scope for the baseline

- Active scanning (`zap-full-scan.py`) — not run; would require dedicated test
  data + tear-down. Re-evaluate before public release.
- Authenticated scanning — baseline only sees the unauthenticated surface.
  Authenticated endpoints are covered by `security.e2e-spec.ts`.

## Acceptance

- ✅ No FAIL-severity findings.
- ✅ All WARN findings triaged and accepted with justification above.
- ✅ Key security headers (HSTS, CSP, X-Content-Type-Options, X-Frame-Options,
  Permissions-Policy) all **PASS** — Helmet is effective.

Record will be re-issued as `docs/security-scan-YYYY-MM-DD.md` after each
substantive backend change.
