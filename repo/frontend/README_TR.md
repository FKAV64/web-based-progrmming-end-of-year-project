# Frontend — Kripto Dashboard SPA

Angular 17 ile geliştirilmiş tek sayfa uygulama (SPA): standalone
bileşenler + signals + RxJS, Angular Material + Tailwind CSS, grafikler
için ApexCharts, PWA (service worker + Web Push) ve TR/EN i18n.

Backend API'si `repo/backend/` altındadır; bu uygulama
`http://localhost:3000/api` adresindeki REST API'ye ve `/ws/alerts`
WebSocket'ine bağlanır.

## Özellikler / sayfalar

- `/login`, `/register` — kimlik doğrulama (Bearer access token istemci
  belleğinde, `refresh_token` httpOnly çerez).
- `/dashboard` — özet + Fear & Greed duyarlılığı.
- `/markets` — top‑100 canlı fiyat tablosu (WebSocket).
- `/coin/:id` — coin detayı + ApexCharts grafik (Binance OHLC).
- `/watchlist`, `/portfolio`, `/alerts`, `/news`, `/settings`.

Reaktif durum yönetimi servis tabanlıdır (Angular signals + RxJS); her
özellik route bazında lazy-load edilir.

## Geliştirme sunucusu

```bash
npm install
npm start          # ng serve → http://localhost:4200 (canlı yeniden yükleme)
```

## Derleme

```bash
npm run build      # scripts/build-i18n.mjs — TR + EN production derlemesi
                   # çıktı: dist/crypto-dashboard-frontend/browser/ (+ /en)
npm run watch      # development yapılandırmasıyla izleme modunda derleme
```

## Birim testleri

```bash
npm test           # ng test (Jest — @angular-builders/jest)
npm run test:ci    # jest --coverage --runInBand (CI'da kullanılır)
```

Birim testleri (`*.spec.ts`) Angular geleneği gereği `src/` içinde
kaynağının yanında durur.

## Uçtan-uca (e2e) testler

Playwright e2e süiti depo kökündeki `repo/tests/frontend/` altına
taşınmıştır (`playwright.config.ts` `testDir`'i oraya işaret eder).
Çalışması için hem backend hem frontend ayakta olmalıdır.

```bash
npm run test:e2e      # playwright test
npm run test:e2e:ui   # playwright test --ui
```

## Lint

```bash
npm run lint       # tsc --noEmit --project tsconfig.app.json
```

## i18n

Kaynak dil Türkçe'dir; çeviriler `src/locale/messages.xlf` (kaynak) ve
`src/locale/messages.en.xlf` (İngilizce). `npm run build` her iki dili
de üretir (İngilizce çıktı `/en/` alt yolunda).

## PWA

`@angular/service-worker` ile kurulabilir; `ngsw-config.json` cache
yapılandırmasını, Web Push ise fiyat alarmı bildirimlerini sağlar.
