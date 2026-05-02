-- Account lockout columns: defense-in-depth on top of per-IP throttler.
-- Counter rolls over after 15 minutes of inactivity; reaching the threshold
-- sets `locked_until` to (now + 15 min) and the auth service rejects logins
-- against locked accounts with HTTP 429.
ALTER TABLE "users"
  ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_failed_login_at"  TIMESTAMP(3),
  ADD COLUMN "locked_until"          TIMESTAMP(3);
