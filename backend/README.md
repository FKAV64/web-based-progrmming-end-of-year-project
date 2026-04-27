# Backend

NestJS API for the crypto dashboard. It uses Prisma with PostgreSQL for persistence and Redis for cached market snapshots.

## Quick start

From the repository root, start the local services first:

```bash
docker compose up -d
```

Then in this `backend/` folder:

```bash
copy .env.example .env
npm install
npm run prisma:setup
npm run start:dev
```

The API runs on `http://localhost:3000/api`.

## Prisma setup

These helper scripts are available:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:setup
```

`npm run prisma:setup` is the normal command to use after a fresh Docker reset, a new PostgreSQL volume, or any time the database schema has not been created yet.

## Development

```bash
npm run start
npm run start:dev
npm run start:prod
```

## Tests

```bash
npm run test
npm run test:e2e
npm run test:cov
```
