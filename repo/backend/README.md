# Backend

NestJS API for the crypto dashboard. It uses Prisma with PostgreSQL for
persistence and Redis for cached market snapshots.

## Quick start

First, start the local services from the repository root (`repo/`):

```bash
docker compose up -d
```

This command starts PostgreSQL + Redis and, once PostgreSQL is healthy, runs
a one-time `prisma migrate deploy` container; therefore, a new Docker volume
automatically receives the schema.

Then, in this `backend/` folder:

```bash
cp .env.example .env   # copy from backend/.env.example
npm install
npm run start:dev
```

The API runs at `http://localhost:3000/api`.

The `/api/dev/*` helper endpoints load only when `NODE_ENV=development`; for
fixture-based frontend e2e flows, start the backend with `npm run start:dev`.

## Prisma setup

The following helper scripts are available:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:setup
```

`npm run prisma:setup` is the standard command to use after a fresh Docker
reset, with a new PostgreSQL volume, or when the database schema has not yet
been created.

With the existing `docker-compose.yml`, a fresh `docker compose up -d`
already applies migrations automatically. `npm run prisma:setup` remains a
useful fallback if you want to apply them manually from the host.

## Development

```bash
npm run start
npm run start:dev
npm run start:prod
```

## Tests

Unit tests (`*.spec.ts`) reside next to their source in `src/`, following
the Nest convention. The end-to-end (e2e) suite has been moved to
`repo/tests/backend/` at the repository root (configuration:
`repo/tests/backend/jest-e2e.json`); `npm run test:e2e` uses it and requires
a running PostgreSQL + Redis instance.

```bash
npm run test       # unit tests (Jest)
npm run test:e2e   # e2e (Jest + Supertest, repo/tests/backend)
npm run test:cov   # coverage report
```
