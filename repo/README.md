# Angular + RxJS Kripto Dashboard

> **RxJS'in gücü ile gerçek zamanlı kripto varlık izleme paneli**

![Zorluk](https://img.shields.io/badge/Zorluk-Orta-yellow)
![Puan](https://img.shields.io/badge/Puan-45-blue)
![Hafta](https://img.shields.io/badge/Hafta-1-gray)
![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Backend CI](https://github.com/FKAV64/web-based-progrmming-end-of-year-project/actions/workflows/backend-ci.yml/badge.svg)
![Frontend CI](https://github.com/FKAV64/web-based-progrmming-end-of-year-project/actions/workflows/frontend-ci.yml/badge.svg)
[![Demo](https://img.shields.io/website?label=demo&url=https%3A%2F%2Fangular-rxjs-kripto-dashboard.vercel.app)](https://angular-rxjs-kripto-dashboard.vercel.app)

## 🎯 Özet

[*1-2 paragraf: Ürün ne yapıyor, kime, hangi problemi çözüyor? Jargon yok.*]

## 🎥 Demo

🔗 **Canlı Demo:** https://angular-rxjs-kripto-dashboard.vercel.app  
👤 **Demo Hesap:** `demo@example.com` · `demo123`

![Demo GIF](repo/docs/demo.gif)

> _Not: Ekran görüntülerini ve demo GIF'ini kendi `repo/` içinde istediğiniz klasör yapısında tutabilirsiniz. Aşağıdaki görsel yolları örnektir; gerçek dosya konumlarınıza göre güncelleyin._

### Ekran Görüntüleri (Örnek yerleşim)

| Landing | Dashboard | Mobile |
|---------|-----------|--------|
| ![landing](repo/docs/screenshots/01-landing.png) | ![dashboard](repo/docs/screenshots/02-dashboard.png) | ![mobile](repo/docs/screenshots/03-mobile.png) |

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

**Frontend:** `Angular 17+ (standalone components, signals)`, `Angular Material veya PrimeNG`, `Tailwind CSS`  
**Reaktiflik:** `RxJS 7+ (Observable, Subject, operators)`  
**Grafik:** `Chart.js veya ApexCharts (ng2-charts wrapper)`  
**Veri Kaynağı:** `CoinGecko API (free tier)`, `Binance WebSocket`, `Alternative.me Fear & Greed API`  
**State:** `NgRx Signal Store veya service-tabanlı`  
**Test:** `Jest + Angular Testing Library`  
**Hosting:** `Firebase Hosting / Cloudflare Pages`  

> Teknoloji seçimlerinin detaylı gerekçesi: [PROJE-RAPORU.md · Bölüm 7](PROJE-RAPORU.md#7-teknoloji-yığını-tech-stack)

## 🏗 Mimari

[*Mimari diyagramınızı buraya ekleyiniz — örn. `repo/docs/diagrams/container.png`*]

[Detaylı mimari ve ADR'lar →](PROJE-RAPORU.md#8-sistem-mimarisi)

## 📦 Subprojects

| Klasör | Açıklama | README |
|--------|----------|--------|
| `frontend/` | Angular 17 SPA — UI, RxJS streams, charts | [frontend/README.md](frontend/README.md) |
| `backend/` | NestJS 10 API — Prisma, PostgreSQL, Redis | [backend/README.md](backend/README.md) |

Local development için önce Docker servislerini başlatın:

```bash
docker compose up -d   # PostgreSQL 16 + Redis 7 + Prisma migrations
```

## 🚀 Kurulum

### Gereksinimler

- Node.js ≥ 20
- Docker + Docker Compose (local DB/Redis)

### Adım Adım

```bash
# 1) Repo'yu klonla
git clone https://github.com/KULLANICI_ADI/final-p06-angular-rxjs-kr.git
cd final-p06-angular-rxjs-kr

# 2) Environment dosyası
cp .env.example .env
# .env içindekileri doldurun (DATABASE_URL, JWT_SECRET, ...)

# 3) Bağımlılıkları yükle
npm install

# 4) Docker servislerini başlat
docker compose up -d
# PostgreSQL ayağa kalktıktan sonra Prisma migration container'ı
# schema'yı otomatik uygular.

# 5) Çalıştır
npm start
```

Proje: http://localhost:4200

## 🧪 Test

```bash
# Backend unit + e2e
cd backend && npm test && npm run test:e2e

# Frontend unit
cd frontend && npm test
```

## 🔄 CI/CD

GitHub Actions workflows run automatically on every push and pull request:

| Workflow | Triggers on | Steps |
|----------|-------------|-------|
| **Backend CI** | `backend/**` | lint → unit tests + coverage → e2e tests → build → OpenAPI generation + drift check |
| **Frontend CI** | `frontend/**` | lint → unit tests + coverage → build → Lighthouse CI |

### OpenAPI Spec

The generated API spec lives at `docs/openapi.yaml` (and `docs/openapi.json`).  
**Run `npm run openapi:generate` inside `backend/` after modifying any controller or DTO**, then commit the updated files. CI will fail with `git diff --exit-code` if the committed spec drifts from what the app generates.

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
├── PROJE-RAPORU-SABLON.docx    (uzun form final raporu — Word)
├── DEVELOPMENT-PLAN (1).md     (faz-faz uygulama planı)
├── docker-compose.yml          (PostgreSQL 16 + Redis 7 — local dev)
├── LICENSE
├── .env.example
├── frontend/                   (Angular 17 SPA — Phase 7+)
└── backend/                    (NestJS 10 API — Phase 1+)
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

<sub>🤖 Bu projede [Claude Code](https://claude.com/claude-code) ve [codex](https://chatgpt.com/codex/) gibi AI asistanları kullanılmıştır. Tüm mimari kararlar ve kullanım tercihleri öğrenci tarafından yapılmıştır.</sub>
