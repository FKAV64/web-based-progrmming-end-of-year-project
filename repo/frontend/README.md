# Frontend — Crypto Dashboard SPA

Single-page application (SPA) built with Angular 17: standalone
components + signals + RxJS, Angular Material + Tailwind CSS, ApexCharts
for charts, PWA (service worker + Web Push), and TR/EN i18n.

The backend API is under `repo/backend/`; this application connects to the
REST API at `http://localhost:3000/api` and the `/ws/alerts` WebSocket.

## Features / pages

- `/login`, `/register` — authentication (Bearer access token in client
  memory, `refresh_token` httpOnly cookie).
- `/dashboard` — overview + Fear & Greed sentiment.
- `/markets` — live top‑100 price table (WebSocket).
- `/coin/:id` — coin detail + ApexCharts chart (Binance OHLC).
- `/watchlist`, `/portfolio`, `/alerts`, `/news`, `/settings`.

Reactive state management is service-based (Angular signals + RxJS); every
feature is lazy-loaded by route.

## Development server

```bash
npm install
npm start          # ng serve → http://localhost:4200 (live reload)
```

## Build

```bash
npm run build      # scripts/build-i18n.mjs — TR + EN production build
                   # output: dist/crypto-dashboard-frontend/browser/ (+ /en)
npm run watch      # build in watch mode with the development configuration
```

## Unit tests

```bash
npm test           # ng test (Jest — @angular-builders/jest)
npm run test:ci    # jest --coverage --runInBand (used in CI)
```

Unit tests (`*.spec.ts`) reside next to their source in `src/`, following
the Angular convention.

## End-to-end (e2e) tests

The Playwright e2e suite has been moved to `repo/tests/frontend/` at the
repository root (`playwright.config.ts` points its `testDir` there). Both
the backend and frontend must be running for it to work.

```bash
npm run test:e2e      # playwright test
npm run test:e2e:ui   # playwright test --ui
```

## Lint

```bash
npm run lint       # tsc --noEmit --project tsconfig.app.json
```

## i18n

The source language is Turkish; translations are in `src/locale/messages.xlf`
(source) and `src/locale/messages.en.xlf` (English). `npm run build`
generates both languages (the English output is under the `/en/` subpath).

## PWA

It can be installed with `@angular/service-worker`; `ngsw-config.json`
provides the cache configuration, while Web Push provides price-alert
notifications.
