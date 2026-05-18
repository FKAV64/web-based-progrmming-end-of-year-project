# Backend

Kripto dashboard için NestJS API. Kalıcılık için PostgreSQL ile Prisma,
önbelleklenen piyasa anlık görüntüleri (snapshot) için Redis kullanır.

## Hızlı başlangıç

Önce depo kökünden (`repo/`) yerel servisleri başlatın:

```bash
docker compose up -d
```

Bu komut PostgreSQL + Redis'i başlatır ve PostgreSQL sağlıklı olduğunda
tek seferlik bir `prisma migrate deploy` container'ı çalıştırır; böylece
yeni bir Docker volume şemayı otomatik alır.

Ardından bu `backend/` klasöründe:

```bash
cp .env.example .env
npm install
npm run start:dev
```

API `http://localhost:3000/api` adresinde çalışır.

## Prisma kurulumu

Şu yardımcı script'ler mevcuttur:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:setup
```

`npm run prisma:setup`; yeni bir Docker sıfırlamasından, yeni bir
PostgreSQL volume'ünden sonra veya veritabanı şeması henüz
oluşturulmadığında kullanılacak normal komuttur.

Mevcut `docker-compose.yml` ile yeni bir `docker compose up -d` zaten
migration'ları otomatik uygular. `npm run prisma:setup`, host'tan elle
uygulamak isterseniz yine de kullanışlı bir yedek yöntemdir.

## Geliştirme

```bash
npm run start
npm run start:dev
npm run start:prod
```

## Testler

Birim testleri (`*.spec.ts`) Nest geleneği gereği `src/` içinde
kaynağının yanında durur. Uçtan-uca (e2e) süiti depo kökündeki
`repo/tests/backend/` altına taşınmıştır (yapılandırma:
`repo/tests/backend/jest-e2e.json`); `npm run test:e2e` bunu kullanır
ve çalışan bir PostgreSQL + Redis gerektirir.

```bash
npm run test       # birim testleri (Jest)
npm run test:e2e   # e2e (Jest + Supertest, repo/tests/backend)
npm run test:cov   # kapsam (coverage) raporu
```
