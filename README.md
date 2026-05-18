# Angular + RxJS Kripto Dashboard

> **RxJS'in gücü ile gerçek zamanlı kripto varlık izleme paneli**

![Zorluk](https://img.shields.io/badge/Zorluk-Orta-yellow)
![Puan](https://img.shields.io/badge/Puan-45-blue)
![Hafta](https://img.shields.io/badge/Hafta-1-gray)
![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Backend CI](https://github.com/FKAV64/web-based-progrmming-end-of-year-project/actions/workflows/backend-ci.yml/badge.svg)
![Frontend CI](https://github.com/FKAV64/web-based-progrmming-end-of-year-project/actions/workflows/frontend-ci.yml/badge.svg)
[![Demo](https://img.shields.io/website?label=demo&url=https%3A%2F%2Fweb-based-progrmming-end-of-year-pr.vercel.app)](https://web-based-progrmming-end-of-year-pr.vercel.app)

## 🎯 Özet

Angular + RxJS Kripto Dashboard, kripto para yatırımcılarının portföylerini ve
takip listelerini tek bir ekrandan yönetebilmesi için geliştirilmiş tam yığın
(full-stack) bir web uygulamasıdır. WebSocket üzerinden gerçek zamanlı fiyatlar,
interaktif grafikler, kişisel watchlist, kâr/zarar takibi yapan portföy,
fiyat alarmları (web-push bildirimli), haber/duygu akışı ve çoklu para birimi
desteği sunar.

Borsa uygulamalarının dağınık ve reklam yoğun arayüzleri yerine; sade, hızlı,
TR/EN dil destekli, koyu mod ve PWA (ana ekrana ekle + push) özellikli, kişiye
özel bir izleme paneli sağlar. Backend tarafında güvenli kimlik doğrulama
(Argon2 + JWT rotasyonu), alarm değerlendirme motoru ve önbellekli piyasa
verisi bulunur.

## 🎥 Demo

🔗 **Canlı Demo:** https://web-based-progrmming-end-of-year-pr.vercel.app  
👤 **Demo Hesap:** `demo@example.com` · `Demo#123`

### Ekran Görüntüleri

Görseller: [`repo/docs/screenshots/`](repo/docs/screenshots/)

| Giriş | Kayıt | Dashboard (boş) |
|-------|-------|-----------------|
| ![login](repo/docs/screenshots/01-login.png) | ![register](repo/docs/screenshots/02-register.png) | ![dashboard empty](repo/docs/screenshots/03-dashboard-empty.png) |

| Dashboard (dolu) | Piyasalar | Coin Detay |
|------------------|-----------|------------|
| ![dashboard populated](repo/docs/screenshots/04-dashboard-populated.png) | ![markets](repo/docs/screenshots/05-markets.png) | ![coin detail](repo/docs/screenshots/06-coin-detail.png) |

| Mobil (responsive) | Koyu Mod |
|--------------------|----------|
| ![mobile](repo/docs/screenshots/07-mobile.png) | ![dark mode](repo/docs/screenshots/08-dark-mode.png) |

## ✨ Ana Özellikler

- ✅ Top 100 kripto gerçek zamanlı fiyat (WebSocket)
- ✅ Çoklu grafik (mum, çizgi, area) — 1H / 1D / 1W / 1M / YTD
- ✅ Kişisel watchlist + portföy takibi (adet × fiyat)
- ✅ Fiyat uyarısı (üzerine/altına)
- ✅ Haber/sosyal duygu analizi akışı
- ✅ Karanlık mod + responsive dashboard
- ✅ PWA: ana ekrana ekle + push notification (uyarı)
- ✅ Çoklu para birimi (TRY, USD, EUR)

## 🧰 Tech Stack

**Frontend:** `Angular 17 (standalone components, signals)`, `Angular Material`, `Tailwind CSS 3`  
**Reaktiflik:** `RxJS 7 (Observable, Subject, operators)`  
**Grafik:** `ApexCharts (ng-apexcharts)`  
**Backend:** `NestJS 11`, `Prisma 5`, `PostgreSQL 16`, `Redis 7`  
**Veri Kaynağı:** `CoinGecko API`, `Binance WebSocket`, `Alternative.me Fear & Greed`, `RSS haber akışı`  
**State:** `Servis tabanlı (Angular signals + RxJS)`  
**Auth:** `Argon2id + JWT — Bearer access (15dk, gövde) + httpOnly refresh cookie (7g, rotasyon, logout-all)`  
**Test:** `Jest + Supertest (backend), Jest + Angular Testing Library (frontend), Playwright (e2e)`  
**Hosting:** `Vercel (frontend) · Railway (backend)`  

> Teknoloji seçimlerinin detaylı gerekçesi: [PROJE-RAPORU.md · Bölüm 7](PROJE-RAPORU.md#7-teknoloji-yığını-tech-stack)

## 🏗 Mimari

```
[Tarayıcı PWA]  ── HTTPS ──>  [NestJS API (Railway)]  ──>  [PostgreSQL 16]
       │                              │                └──>  [Redis 7]
       │                              └── WSS proxy ──>  [Binance WebSocket]
       └── Vercel üzerinde dağıtılır
```

Frontend (Angular SPA) Vercel'de, backend (NestJS API) Railway'de çalışır.
Piyasa anlık görüntüleri Redis'te önbelleklenir; kalıcı veri PostgreSQL'de
Prisma ORM ile tutulur. Diyagram ve ayrıntılar:
`repo/docs/diagrams/architecture.md`.

[Detaylı mimari ve ADR'lar →](PROJE-RAPORU.md#8-sistem-mimarisi)

## 📦 Subprojects

| Klasör | Açıklama | README |
|--------|----------|--------|
| `repo/frontend/` | Angular 17 SPA — UI, RxJS streams, charts | [repo/frontend/README.md](repo/frontend/README.md) |
| `repo/backend/` | NestJS 11 API — Prisma, PostgreSQL, Redis | [repo/backend/README.md](repo/backend/README.md) |
| `repo/tests/` | Tüm e2e testleri — `backend/` (Jest+Supertest), `frontend/` (Playwright) | [repo/README.md](repo/README.md#testing) |

Local development için önce `repo/` içinde Docker servislerini başlatın:

```bash
cd repo
docker compose up -d   # PostgreSQL 16 + Redis 7 + tek seferlik Prisma migrator
```

## 🚀 Kurulum

### Gereksinimler

- Node.js ≥ 20
- Docker + Docker Compose (local DB/Redis)

### Adım Adım

```bash
# 1) Repo'yu klonla
git clone https://github.com/FKAV64/web-based-progrmming-end-of-year-project.git
cd web-based-progrmming-end-of-year-project/repo

# 2) Docker servislerini başlat (PostgreSQL 16 + Redis 7)
#    PostgreSQL sağlıklı olduğunda tek seferlik migrator Prisma
#    şemasını otomatik uygular.
docker compose up -d

# 3) Backend
cd backend
cp .env.example .env          # .env içindeki secret'ları doldurun
npm install
npm run start:dev             # API: http://localhost:3000/api

# 4) Frontend (yeni terminal)
cd ../frontend
npm install
npm start                     # Uygulama: http://localhost:4200
```

Proje: http://localhost:4200 · API: http://localhost:3000/api

## 🧪 Test

Tüm e2e testleri `repo/tests/` altına taşınmıştır (unit `*.spec.ts`
dosyaları Angular/Nest geleneği gereği kaynak yanında kalır).

```bash
# Backend unit + e2e (PostgreSQL + Redis ayakta olmalı)
cd repo/backend && npm test && npm run test:e2e

# Frontend unit
cd repo/frontend && npm run test:ci

# Frontend e2e (backend + frontend çalışır durumda olmalı)
cd repo/frontend && npm run test:e2e
```

## 🔄 CI/CD

GitHub Actions workflows run automatically on every push and pull request:

Workflow dosyaları git deposunun **kök** dizinindeki `.github/workflows/`
içinde durur (GitHub Actions yalnızca burayı okur — bu yüzden `repo/`
içine taşınmaz).

| Workflow | Triggers on | Steps |
|----------|-------------|-------|
| **Backend CI** | `repo/backend/**`, `repo/tests/backend/**` | Prisma migrate → lint → unit tests + coverage → e2e tests → build → OpenAPI generation + drift check |
| **Frontend CI** | `repo/frontend/**`, `repo/tests/frontend/**` | lint → unit tests + coverage → build → Lighthouse CI |

### OpenAPI Spec

The generated API spec lives at `repo/docs/openapi.yaml` (and `repo/docs/openapi.json`).  
**Run `npm run openapi:generate` inside `repo/backend/` after modifying any controller or DTO**, then commit the updated files. CI will fail with `git diff --exit-code` if the committed spec drifts from what the app generates.

Interactive Swagger UI is available at `http://localhost:3000/api/docs` when running in development mode.

### Branch Protection

The `main` branch is protected in GitHub settings (**Settings → Branches → Branch protection rules**):

- Require status checks to pass before merging
- Required checks: **Backend CI / test** and **Frontend CI / test**
- PRs cannot be merged while either workflow is red

### Lighthouse Budgets

The frontend CI enforces Lighthouse score budgets on the production build:

| Category | Minimum Score |
|----------|--------------|
| Performance | 85 |
| Accessibility | 95 |

## 📁 Klasör Yapısı

```
.
├── README.md                   (bu dosya — özet, kurulum, demo)
├── PROJE-RAPORU.md             (uzun form final raporu — markdown)
├── LICENSE
├── .github/workflows/          (CI — git kökünde olmalı: backend-ci, frontend-ci)
└── repo/                       (çalışan kaynak kod)
    ├── README.md               (teknik proje README'si)
    ├── docker-compose.yml      (PostgreSQL 16 + Redis 7 + Prisma migrator)
    ├── DEVELOPMENT-PLAN.md     (faz-faz uygulama planı)
    ├── LICENSE · .env.example
    ├── backend/                (NestJS 11 API — Prisma, PostgreSQL, Redis)
    ├── frontend/               (Angular 17 SPA — RxJS, signals, ApexCharts)
    ├── tests/                  (e2e: backend/ Jest+Supertest · frontend/ Playwright)
    └── docs/                   (ADR, diyagram, screenshot, openapi.yaml)
```

## 🛣 Roadmap

- [x] V1 — MVP (bu teslim)
- [ ] V2 — Gerçek exchange entegrasyonu (order verme, Binance API), tahmin modeli
- [ ] V3 — AI destekli otomatik alım/satım stratejisi (DCA bot)

## 🤝 Katkı

Bu proje **BMU1208 Web Tabanlı Programlama** dersi kapsamında **Bitlis Eren Üniversitesi** — **Bilgisayar Mühendisliği** bölümünde bir final ödevi olarak geliştirilmiştir.

Ders yürütücüsü: **Dr. Öğr. Üyesi Davut ARI**

Kod katkısı beklenmez, ancak fikir / feedback için issue açabilirsiniz.

## 📜 Lisans

MIT © 2026 **ABDOU VALERIO FOMA KENFACK** — Tam metin için [LICENSE](LICENSE).

## 🙋‍♂️ İletişim

- **Öğrenci:** ABDOU VALERIO FOMA KENFACK
- **Öğrenci No:** 24080410152
- **E-posta:** fomavalerio@gmail.com
- **Ders:** BMU1208 · Web Tabanlı Programlama
- **Kurum:** Bitlis Eren Üniversitesi — Mühendislik-Mimarlık Fakültesi

---

<sub>🤖 Bu projede [Claude Code](https://claude.com/claude-code) ve [Cursor](https://cursor.sh) gibi AI asistanları kullanılmıştır. Tüm mimari kararlar ve kullanım tercihleri öğrenci tarafından yapılmıştır.</sub>
