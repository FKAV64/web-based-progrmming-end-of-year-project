# Angular + RxJS Kripto Dashboard

> **RxJS'in gücü ile gerçek zamanlı kripto varlık izleme paneli**

![Zorluk](https://img.shields.io/badge/Zorluk-Orta-yellow)
![Puan](https://img.shields.io/badge/Puan-45-blue)
![Hafta](https://img.shields.io/badge/Hafta-1-gray)
![Lisans](https://img.shields.io/badge/License-MIT-green)
![Durum](https://img.shields.io/badge/Durum-Development-yellow)

<!-- Kodunuzu yazdıktan sonra aşağıdaki bölümleri doldurun ve ekleyin:
![CI](https://github.com/KULLANICI_ADI/final-p06-angular-rxjs-kr/actions/workflows/ci.yml/badge.svg)
![Deploy](https://img.shields.io/website?url=https://angular-rxjs-kripto-dashboard.vercel.app)
-->

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
docker compose up -d   # PostgreSQL 16 + Redis 7
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

# 4) Veritabanını hazırla (varsa)
# (Bu projede migration yok)

# 5) Çalıştır
npm start
```

Proje: http://localhost:4200

## 🧪 Test

```bash
npm test
```

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

<sub>🤖 Bu projede [Claude Code](https://claude.com/claude-code) ve [Cursor](https://cursor.sh) gibi AI asistanları kullanılmıştır. Tüm mimari kararlar ve kullanım tercihleri öğrenci tarafından yapılmıştır.</sub>
