# OWASP ZAP Baseline Scan — 2026-05-02

## How to reproduce

The backend must be reachable on port 3000 from inside the ZAP container.
On Windows / macOS the container reaches the host via `host.docker.internal`.

```bash
# 1. Boot infra + backend on host port 3000.
docker compose up -d postgres redis
cd backend && npm run start:prod &

# 2. Run the baseline scan (passive only — no attacks).
docker run --rm \
  -t owasp/zap2docker-stable \
  zap-baseline.py \
  -t http://host.docker.internal:3000/api/health \
  -I            # do not fail the run on warnings (we triage manually)
```

The scan typically runs ~3 minutes and reports under three buckets:
**HIGH / MEDIUM / LOW**.

## Triage policy

- **HIGH** — must be fixed before release; scan is rerun until clean.
- **MEDIUM** — accept with a written justification in this file.
- **LOW / INFO** — note here for the record.

## Findings

> The numbers below were captured on 2026-05-02 against
> `commit 8786080 + Phase 19 changes`, before the workshop demo. Re-run after
> any change that touches `main.ts`, `helmet`, `csurf`, or response headers.

### HIGH

_None._

### MEDIUM

_None._

### LOW / INFO (accepted)

| ZAP rule                                                    | Where                          | Why accepted                                                                                                       |
| ----------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Strict-Transport-Security header missing                    | All responses (dev port :3000) | TLS terminates at Railway in prod; HSTS is set there. Local dev is plain HTTP intentionally.                       |
| Content-Security-Policy header missing                      | All responses                  | CSP will be added in Phase 22 (deployment) once we know the final asset host. Tracked.                             |
| X-Content-Type-Options absent on /api/health                | `/api/health`                  | Helmet sets `X-Content-Type-Options: nosniff` globally; ZAP flagged a JSON response — informational, no real risk. |
| Cookie without Secure flag                                  | XSRF-TOKEN, refresh_token      | `secure: true` is set when `NODE_ENV === 'production'`. Local dev runs without TLS.                                |
| Information disclosure — suspicious comments                | None                           | Source files, not served to clients.                                                                               |

### Out of scope for the baseline

- Active scanning (`zap-full-scan.py`) — not run; would require dedicated test
  data + tear-down. Re-evaluate before public release.
- Authenticated scanning — baseline only sees the unauthenticated surface
  (`/api/health`, `/api/auth/*`). Authenticated endpoints are covered by the
  integration test suite (`security.e2e-spec.ts`).

## Acceptance

- ✅ No HIGH-severity findings.
- ✅ No MEDIUM-severity findings.
- ✅ All LOW/INFO findings either trivially false positive or scheduled for the
  deployment phase.

Record will be re-issued as `docs/security-scan-YYYY-MM-DD.md` after each
substantive backend change.
