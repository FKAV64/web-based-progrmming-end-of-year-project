# Angular + RxJS Kripto Dashboard

> Angular 17 (signals + RxJS) ve NestJS 11 API ile geliştirilmiş gerçek
> zamanlı kripto para izleme paneli.

![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Backend CI](https://github.com/FKAV64/web-based-progrmming-end-of-year-project/actions/workflows/backend-ci.yml/badge.svg)
![Frontend CI](https://github.com/FKAV64/web-based-progrmming-end-of-year-project/actions/workflows/frontend-ci.yml/badge.svg)
[![Demo](https://img.shields.io/website?label=demo&url=https%3A%2F%2Fweb-based-progrmming-end-of-year-pr.vercel.app)](https://web-based-progrmming-end-of-year-pr.vercel.app)

Tam yığın (full-stack) bir kripto panosu: WebSocket üzerinden canlı
fiyatlar, etkileşimli grafikler, kişisel takip listesi (watchlist),
portföy kâr/zarar takibi, web-push bildirimli fiyat alarmları,
haber/duyarlılık akışı, çoklu para birimi, koyu mod ve PWA kurulumu.
**BMU1208 Web Tabanlı Programlama** dersi final projesi olarak Bitlis
Eren Üniversitesi'nde geliştirilmiştir.

- **Canlı demo:** https://web-based-progrmming-end-of-year-pr.vercel.app
- **Demo hesap:** `demo@example.com` / `Demo#123`

---

## İçindekiler

1. [Özellikler](#özellikler)
2. [Teknoloji Yığını](#teknoloji-yığını)
3. [Depo Yapısı](#depo-yapısı)
4. [Gereksinimler](#gereksinimler)
5. [Hızlı Başlangıç](#hızlı-başlangıç)
6. [Ortam Değişkenleri](#ortam-değişkenleri)
7. [Uygulamaları Çalıştırma](#uygulamaları-çalıştırma)
8. [Testler](#testler)
9. [API ve Veri Modeli](#api-ve-veri-modeli)
10. [CI/CD](#cicd)
11. [Mimari](#mimari)
12. [Lisans](#lisans)

---

## Özellikler

- **Canlı fiyatlar** — top‑100 coin, sunucu tarafı Binance WebSocket proxy ile akıtılır.
- **Etkileşimli grafikler** — mum / çizgi / area, çoklu aralık (1H · 1D · 1W · 1M · YTD), ApexCharts, pinch‑to‑zoom ve crosshair.
- **Watchlist** — kullanıcı bazlı, sunucuda kalıcı.
- **Portföy** — pozisyonlar (adet × ortalama alış), gerçekleşen/gerçekleşmemiş kâr-zarar, pozisyon kapatma.
- **Fiyat alarmları** — `ABOVE` / `BELOW` eşikleri sunucu tarafında canlı tick'lere karşı değerlendirilir, Web Push ile iletilir.
- **Haber ve duyarlılık** — RSS haber akışı ve Fear & Greed duyarlılık göstergesi.
- **Çoklu para birimi** — USD / EUR / TRY, canlı kur dönüşümü.
- **Tema ve i18n** — açık / koyu / sistem teması, TR + EN dilleri.
- **PWA** — kurulabilir, service worker, push bildirimleri.
- **Güvenlik** — Argon2id şifre hash'leme; kısa ömürlü **Bearer access token** (yanıt gövdesi) + **httpOnly `refresh_token` çerezi**, rotasyon ve tüm cihazlarda anında oturum kapatma; yapısal CSRF savunması (access token asla çerez değildir) + CORS allowlist; Helmet başlıkları; hız sınırlama + hesap kilidi; denetim kaydı. Bkz. [`docs/adr/ADR-007-threat-model.md`](docs/adr/ADR-007-threat-model.md) ve [`docs/security-scan-2026-05-18.md`](docs/security-scan-2026-05-18.md).

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Angular 17 (standalone bileşenler, signals), RxJS 7, Angular Material, Tailwind CSS 3, ApexCharts (`ng-apexcharts`) |
| PWA | `@angular/service-worker`, Web Push |
| Backend | NestJS 11, Node.js 20 |
| ORM / DB | Prisma 5, PostgreSQL 16 |
| Önbellek | Redis 7 (CoinGecko piyasa snapshot'u) |
| Gerçek zamanlı | `ws` Binance proxy gateway, RxJS akışları |
| Kimlik doğrulama | Argon2id, `@nestjs/jwt` + Passport JWT — Bearer access token + httpOnly `refresh_token` çerezi |
| API dokümanı | `@nestjs/swagger` → OpenAPI 3 (`docs/openapi.yaml`) |
| Testler | Jest (birim) + Supertest (backend e2e), Jest + Angular Testing Library (frontend birim), Playwright (frontend e2e) |
| CI/CD | GitHub Actions, Vercel (frontend), Railway (backend) |
| Veri kaynakları | CoinGecko API, Binance WebSocket, Alternative.me Fear & Greed, RSS haber |

## Depo Yapısı

```
repo/
├── README.md                # bu dosya
├── LICENSE                  # MIT
├── .gitignore
├── docker-compose.yml       # PostgreSQL 16 + Redis 7 + tek seferlik Prisma migrator
├── backend/                 # NestJS 11 API (Prisma, PostgreSQL, Redis)
│   ├── src/                 #   modüller: auth, users, market, watchlist,
│   │                        #   portfolio, alerts, push, settings, health,
│   │                        #   audit, dev
│   ├── prisma/              #   şema + migration'lar
│   ├── fixtures/            #   dev uçları için seed piyasa verisi
│   └── scripts/             #   OpenAPI üreteci
├── frontend/                # Angular 17 SPA
│   └── src/app/             #   core/ · features/ · shared/
├── tests/                   # tüm test süitleri burada (uygulamalardan taşındı)
│   ├── backend/             #   backend e2e (Jest + Supertest) + jest-e2e.json
│   └── frontend/            #   frontend e2e (Playwright)
└── docs/
    ├── adr/                 #   mimari karar kayıtları
    ├── diagrams/            #   mimari diyagramlar (architecture · erd · user-flow)
    ├── screenshots/         #   arayüz ekran görüntüleri
    ├── openapi.yaml         #   üretilen API şeması (+ openapi.json)
    └── security-scan-*.md   #   OWASP ZAP tarama raporu
```

> **Testler hakkında not:** kaynağının yanında kalması gereken birim
> testleri (Angular / Nest geleneği, `*.spec.ts`) `frontend/src` ve
> `backend/src` altında kalır. Bağımsız uçtan-uca süitler
> `tests/backend` ve `tests/frontend` altına taşınmıştır; Jest ve
> Playwright yapılandırmaları buna göre güncellenmiştir.

> **CI hakkında not:** GitHub Actions iş akışlarını yalnızca **git deposu
> kökündeki** (`repo/`'nun üst dizini) `.github/`'dan okur; bu yüzden iş
> akışı dosyaları tasarım gereği oradadır — `repo/` içine taşımak CI'yi
> tamamen devre dışı bırakır.

## Gereksinimler

- Node.js ≥ 20
- Docker + Docker Compose (yerel PostgreSQL ve Redis)

## Hızlı Başlangıç

```bash
# 1. Klonla
git clone https://github.com/FKAV64/web-based-progrmming-end-of-year-project.git
cd web-based-progrmming-end-of-year-project/repo

# 2. Altyapıyı başlat (PostgreSQL 16 + Redis 7).
#    PostgreSQL sağlıklı olduğunda tek seferlik migrator container'ı
#    Prisma şemasını uygular.
docker compose up -d

# 3. Backend
cd backend
cp .env.example .env          # repo/backend/.env.example'dan kopyalayın, ardından secret'ları doldurun
npm install
npm run start:dev             # API: http://localhost:3000/api

# 4. Frontend (yeni terminal)
cd ../frontend
npm install
npm start                     # uygulama: http://localhost:4200
```

## Ortam Değişkenleri

Backend yapılandırmasını `backend/.env` dosyasından okur (şablon:
`backend/.env.example`):

| Değişken | Açıklama |
|----------|----------|
| `DATABASE_URL` | PostgreSQL bağlantı dizesi (varsayılan Docker DB, port 5433) |
| `REDIS_URL` | Redis bağlantı dizesi |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ≥ 32 baytlık secret'lar — `openssl rand -base64 48` |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token ömürleri (varsayılan `15m` / `7d`) |
| `COOKIE_DOMAIN` | Çerez alan adı (dev'de `localhost`) |
| `FRONTEND_ORIGIN` | İzin verilen CORS origin'i |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push (VAPID) anahtarları |
| `ARGON2_TIME_COST` / `ARGON2_MEMORY_COST` | Argon2 hash parametreleri |
| `PORT` | API portu (varsayılan `3000`) |
| `COINGECKO_API_KEY` | İsteğe bağlı CoinGecko API anahtarı |
| `DISABLE_THROTTLE` / `DISABLE_BINANCE_PROXY` | Geliştirme sırasında isteğe bağlı yerel geçişler |

## Uygulamaları Çalıştırma

**Backend** (`backend/`)

```bash
npm run start:dev      # izleme (watch) modu
npm run start:prod     # derlenmiş dist/ ile çalıştır
npm run prisma:setup   # prisma generate + migrate deploy (elle yedek yöntem)
npm run openapi:generate  # docs/openapi.{yaml,json} yeniden üret
```

`/api/dev/*` yardımcı uçları yalnızca `NODE_ENV=development` iken
yüklenir; Playwright frontend e2e akışı için backend'i `npm run start:dev`
ile başlatın.

**Frontend** (`frontend/`)

```bash
npm start              # ng serve → http://localhost:4200
npm run build          # i18n production derlemesi
```

## Testler

| Süit | Konum | Komut (çalıştırma dizini) |
|------|-------|---------------------------|
| Backend birim | `backend/src/**/*.spec.ts` | `npm test` (`backend/` içinde) |
| Backend e2e | `tests/backend/*.e2e-spec.ts` | `npm run test:e2e` (`backend/` içinde) |
| Frontend birim | `frontend/src/**/*.spec.ts` | `npm run test:ci` (`frontend/` içinde) |
| Frontend e2e | `tests/frontend/*.e2e.ts` | `npm run test:e2e` (`frontend/` içinde) |

Backend e2e süiti Jest + Supertest kullanır; yapılandırması
`tests/backend/jest-e2e.json` konumundadır ve çalışan bir PostgreSQL +
Redis gerektirir (`docker compose up -d`). Playwright e2e süiti hem
backend hem frontend'in çalışıyor olmasını gerektirir.

```bash
# Backend (PostgreSQL + Redis ayakta olmalı)
cd backend && npm test && npm run test:e2e

# Frontend birim
cd frontend && npm run test:ci

# Frontend e2e (backend + frontend çalışır durumda olmalı)
cd frontend && npm run test:e2e
```

## API ve Veri Modeli

REST API `/api` altında sunulur ve OpenAPI 3 ile belgelenir — üretilen
şema [`docs/openapi.yaml`](docs/openapi.yaml) (ve `docs/openapi.json`)
konumundadır. Geliştirmede Swagger UI:
`http://localhost:3000/api/docs`.

Uç grupları: `auth` (register / login / refresh / logout / me),
`me` (profil, veri export), `settings`, `watchlist`, `portfolio`,
`alerts`, `market` (top / coin / chart / ohlc / news / sentiment /
exchange-rates), `push`, `health` ve yalnızca-dev seed uçları.

**Prisma modelleri:** `User`, `RefreshToken`, `WatchlistItem`,
`PortfolioPosition`, `PriceAlert`, `PushSubscription`, `UserSettings`,
`AuditLog` (PostgreSQL — bkz.
[`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)).
Tam ERD: [`docs/diagrams/erd.md`](docs/diagrams/erd.md).

Herhangi bir controller veya DTO değiştirdikten sonra `backend/` içinde
`npm run openapi:generate` çalıştırın ve güncellenen şemayı commit'leyin
— CI, şema drift'inde başarısız olur.

## CI/CD

GitHub Actions iş akışları **git deposu kökündeki**
`.github/workflows/` içindedir ve her push / PR'da çalışır:

| İş Akışı | Tetikleyen | Adımlar |
|----------|------------|---------|
| **Backend CI** | `repo/backend/**`, `repo/tests/backend/**` | install → Prisma migrate → lint → birim testleri + kapsam → e2e testleri → derleme → OpenAPI üretimi + drift kontrolü |
| **Frontend CI** | `repo/frontend/**`, `repo/tests/frontend/**` | install → lint → birim testleri + kapsam → derleme → Lighthouse CI |

Lighthouse bütçeleri: Performans ≥ 85, Erişilebilirlik ≥ 95. `main`
dalı korumalıdır ve birleştirme öncesi her iki iş akışının da yeşil
olmasını gerektirir.

## Mimari

```
[Tarayıcı PWA] ── HTTPS ──> [NestJS API (Railway)] ──> [PostgreSQL 16]
       │                          │              └──> [Redis 7]
       │                          └── WSS proxy ──> [Binance WebSocket]
       └── Vercel üzerinde dağıtılır
```

Ayrıntılı tasarım kararları ve Türkçe diyagramlar:
[`docs/diagrams/architecture.md`](docs/diagrams/architecture.md) ·
[`docs/diagrams/erd.md`](docs/diagrams/erd.md) ·
[`docs/diagrams/user-flow.md`](docs/diagrams/user-flow.md) ve
[`docs/adr/`](docs/adr/) (mimari karar kayıtları).

## Lisans

MIT © 2026 ABDOU VALERIO FOMA KENFACK — bkz. [LICENSE](LICENSE).

**BMU1208 Web Tabanlı Programlama** dersi final projesi olarak
geliştirilmiştir — Bitlis Eren Üniversitesi, Bilgisayar Mühendisliği
(ders yürütücüsü: Dr. Öğr. Üyesi Davut ARI).
