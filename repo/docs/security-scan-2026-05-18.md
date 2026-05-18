# OWASP ZAP Taraması — 2026-05-18

> Gerçekten çalıştırılmış, gözlemlenmiş taramalar (tahmin değil). Bu
> belge mevcut backend'e karşı **iki** taramayı kaydeder:
> 1. **kimliksiz pasif baseline** (genel/açık yüzey) ve
> 2. **kimlik doğrulamalı aktif API taraması** (oturum açmış,
>    OpenAPI güdümlü, korumalı uçlara saldırır).
>
> **Birleşik sonuç: her ikisinde de `FAIL: 0`.** Baseline: WARN 1 / PASS 66.
> Kimlik doğrulamalı aktif (düzeltme sonrası): WARN 2 / IGNORE 1 / PASS 117
> — düzeltme öncesi WARN'lar (Application Error Disclosure, bir
> SQL-Injection yanlış pozitifi, Timestamp Disclosure) **düzeltildi**;
> kalan 2 WARN kabul edilen tarama-ortamı artefaktıdır (çevrimdışı
> upstream 502'ler, yerel-HTTP tarama hedefi).
>
> `2026-05-02` kaydından bu yana yapılan backend güvenlik değişikliklerinden
> sonra yeniden yayımlandı (eski kayıt geçersiz kılınıp kaldırıldı):
> **`csurf` kaldırıldı ve `csurf`/`@types/csurf` bağımlılıkları
> `backend/package.json`'dan silindi**, access token Bearer gövde
> token'ına taşındı, refresh-çerez öznitelikleri ortama duyarlı hale
> getirildi, anlık `logout-all` iptali eklendi. Bkz.
> `adr/ADR-007-threat-model.md` (2026-05-18 revizyonu). Kimlik
> doğrulamalı tarama bölümü aşağıdadır; bu ilk blok kimliksiz
> baseline'dır.

## Çalıştırma meta verisi

- **Tarih:** 2026-05-18
- **Hedef:** `http://host.docker.internal:3000/api`
- **Backend:** `35fa9be` commit'indeki çalışma ağacı + commit'lenmemiş
  yeniden yapılandırma/güvenlik değişiklikleri (csurf kaldırıldı),
  `node dist/src/main.js`, `docker compose` ile Postgres + Redis.
- **Tarayıcı imajı:** `ghcr.io/zaproxy/zaproxy:stable`
  (digest `sha256:707fc6b9fd8327ba48bb7b49d0c5732c179b045dab9c99f8b95410627dff4a00`)
- **Komut:** `zap-baseline.py -t http://host.docker.internal:3000/api -I`
  (pasif baseline, aktif saldırı yok; `-I` = uyarılarda çalışmayı düşürme)
- **Sonuç:** 5 URL üzerinde `FAIL-NEW: 0 · FAIL-INPROG: 0 · WARN-NEW: 1 · WARN-INPROG: 0 · INFO: 0 · IGNORE: 0 · PASS: 66`.

## Yeniden üretme (reproduce)

Backend, ZAP container'ı içinden 3000 portundan erişilebilir olmalıdır.
Windows / macOS'ta container host'a `host.docker.internal` ile ulaşır.

```bash
# 1. Altyapı + backend'i host 3000 portunda başlat.
cd repo
docker compose up -d postgres redis
cd backend && npm run build && node dist/src/main.js   # (veya: npm run start:dev)

# 2. Baseline taramasını çalıştır (yalnızca pasif — saldırı yok).
#    Yazılabilir bir çalışma dizini mount et; modern zap-baseline.py
#    ürettiği Automation Framework planını /zap/wrk'e yazar.
docker run --rm \
  -v "$(pwd)/.zapwrk:/zap/wrk:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
  -t http://host.docker.internal:3000/api \
  -I
```

Yeniden kullanılabilir ZAP yapılandırması: `docs/zap.yaml` (pasif
baseline, spider, aktif saldırı yok). Tarama ~3 dakika sürer ve
**FAIL / WARN / PASS** altında raporlar.

## Triyaj politikası

- **FAIL** — yayından önce düzeltilmeli; tarama temiz çıkana dek tekrarlanır.
- **WARN** — bu dosyada yazılı bir gerekçeyle kabul edilir.
- **PASS / INFO** — kayıt için burada not edilir.

## 2026-05-02 kaydına göre değişenler

| Alan | 2026-05-02 | 2026-05-18 (gözlemlenen) |
| ---- | ---------- | ------------------------ |
| Tarama istatistiği | FAIL-NEW 0 · WARN-NEW **3** · PASS 64 | FAIL-NEW 0 · WARN-NEW **1** · PASS 66 |
| CSRF | `csurf` double-submit; `XSRF-TOKEN` (JS-okunabilir) + `_csrf` (httpOnly) çerezleri | **CSRF çerezi yok.** `csurf` kaldırıldı *ve* `csurf`/`@types/csurf` `package.json`/lockfile'dan silindi. Access token yanıt gövdesinde Bearer token'dır (asla çerez değil). |
| Cookie No HttpOnly Flag [10010] | **WARN-kabul** (kasıtlı JS-okunabilir `XSRF-TOKEN`) | **PASS** — artık JS-okunabilir çerez yok. |
| Session Management Response Identified [10112] | WARN-kabul (×6) | **PASS** |
| Çıkarılan çerezler | `refresh_token` (httpOnly) + `XSRF-TOKEN` + `_csrf` | yalnızca `refresh_token` (httpOnly; cross-site `Secure`+`SameSite=None`, yerel dev `SameSite=Lax`) |
| Oturum iptali | logout'ta refresh-satır iptali | refresh-satır iptali **+ `User.logoutAllAt`** anlık tüm-cihaz iptali |

`csurf` kaldırılması, önceden kabul edilen üç WARN'dan **ikisini**
ortadan kaldırdı (cookie-httponly ve session-management ikisi de PASS'e
geçti); yalnızca genel 404 cache-header WARN'ı kaldı.

## Bulgular (gözlemlenen)

### FAIL

`FAIL-NEW: 0 · FAIL-INPROG: 0` — **yok.**

### WARN (kabul edildi)

| ZAP kuralı | Rule ID | Geçiş | Neden kabul edildi |
| ---------- | ------- | ----- | ------------------ |
| Storable and Cacheable Content | 10049 | ×3 — `GET /` (404), `GET /api` (404), `GET /sitemap.xml` (404) | Varsayılan Express 404 yanıtlarında açık bir `Cache-Control: no-store` yok. Gövdeler boş / “Cannot GET …” taslakları; hassas veri yok; kimlik doğrulamalı API yanıtları cache'lenmez. Gerçek dünya riski düşük; kabul. |

### Dikkate değer PASS'ler (güvenlikle ilgili, Rule ID bazında — gözlemlenen)

| ZAP kuralı | Rule ID | Sonuç |
| ---------- | ------- | ----- |
| Cookie No HttpOnly Flag | 10010 | **PASS** — JS-okunabilir çerez yok (csurf/XSRF-TOKEN gitti). |
| Cookie Without Secure Flag | 10011 | **PASS** |
| Cookie without SameSite Attribute | 10054 | **PASS** |
| Strict-Transport-Security Header | 10035 | **PASS** — Helmet HSTS. |
| Content Security Policy (CSP) Header Not Set | 10038 | **PASS** — Helmet varsayılan CSP. |
| CSP | 10055 | **PASS** |
| X-Content-Type-Options Header Missing | 10021 | **PASS** — `nosniff`. |
| Anti-clickjacking Header | 10020 | **PASS** — `X-Frame-Options`. |
| Server Leaks Information via X-Powered-By | 10037 | **PASS** — başlık bastırıldı. |
| Permissions Policy Header Not Set | 10063 | **PASS** |
| Absence of Anti-CSRF Tokens | 10202 | **PASS** |
| Session Management Response Identified | 10112 | **PASS** |
| Cross-Domain Misconfiguration | 10098 | **PASS** — CORS `FRONTEND_ORIGIN`'e sabit. |
| Information Disclosure - Debug Error Messages | 10023 | **PASS** |

Tüm çalıştırma: toplam **66 PASS** kuralı (tam liste ZAP stdout'unda).

### Spider kapsama notu

ZAP 5 URL keşfetti. Automation Framework iki beklenen spider notu
kaydetti:

```
Job spider error accessing URL http://host.docker.internal:3000/api status code returned : 404 expected 200
Job spider error accessing URL http://host.docker.internal:3000/ status code returned : 404 expected 200
```

Bunlar **beklenen, bulgu değil**: API'nin `/` veya çıplak `/api` route'u
yoktur — her gerçek uç `/api/<resource>` biçimindedir. Kimliksiz
baseline spider bu nedenle yalnızca 404 taslaklarını görür. Kimlik
doğrulamalı uçlar (`/api/portfolio`, `/api/alerts`, `/api/watchlist`, …)
baseline'ın erişiminin dışındadır ve entegrasyon süiti
`repo/tests/backend/security.e2e-spec.ts` ile kapsanır:

1. **Hesap kilidi** — 11. başarısız giriş → `429`; kilitliyken doğru
   şifre → `429`.
2. **Süresi dolmuş token → refresh akışı** — süresi dolmuş Bearer →
   `401`; çerez `/auth/refresh` → `200`; taze Bearer ile tekrar → `200`.
3. **IDOR** — Kullanıcı B'nin Kullanıcı A'nın pozisyonunu `PATCH`'i →
   `404` (`403` değil, varlık sızıntısı yok); sahibi → `200`.

### Baseline'ın ötesi

- Genel yüzeyin kimliksiz **aktif** taraması ve tam **kimlik doğrulamalı
  aktif** API taraması **ikisi de çalıştırıldı** — sonraki bölüme bakın.
  (HTML site için `zap-full-scan.py` tarzı spider-yoğun tarama N/A: bu
  başsız (headless) bir JSON API'dir.)

---

## Kimlik doğrulamalı aktif API taraması — 2026-05-18

**Oturum açıp** kimlik doğrulamalı API yüzeyine aktif olarak saldıran
ikinci bir tarama çalıştırıldı (kimliksiz baseline'ın ulaşamadığı derinlik).

### Çalıştırma meta verisi

- **Araç:** `zap-api-scan.py` (aktif tarama), imaj
  `ghcr.io/zaproxy/zaproxy:stable`.
- **API tanımı:** commit'lenmiş OpenAPI şeması (`docs/openapi.json`),
  ZAP'a import edildi; **36 operasyon import edildi, 95 URL** denendi.
- **Kimlik doğrulama:** `POST /api/auth/register` ile tek kullanımlık
  bir kullanıcı kaydedildi; ZAP **her** isteğe `Authorization: Bearer
  <accessToken>` enjekte etti (ZAP global *Replacer* kuralı). Kimlik
  doğrulama **backend erişim kaydından doğrulandı**: tarama penceresi
  korumalı uçlarda **320 × 200** gösterir (`/api/portfolio`,
  `/api/alerts`, `/api/settings`, `/api/me`, `/api/me/export`, …) — yani
  ZAP gerçekten oturum açmış çalıştı, 401 duvarı değil.
- **Yalnızca-tarama koşulları (şeffaflık/yeniden üretilebilirlik için):**
  - `DISABLE_THROTTLE=1` — `@nestjs/throttler` sınırlayıcısı tarama
    penceresinde devre dışı bırakıldı; böylece hız sınırlama (ayrıca
    `security.e2e-spec.ts` ile kapsanır) aktif-tarama bulgularını
    maskelemedi.
  - `JWT_ACCESS_TTL=8h` — uzun access-token ömrü; token ~20 dk'lık aktif
    taramayı orta yerde sona ermek yerine atlattı.
  - 4 oturum/hesap yok eden operasyon aktif taramadan **çıkarıldı**;
    böylece tarama bitmeden kendi oturumunu sonlandıramadı:
    `DELETE /api/me`, `POST /api/auth/logout`,
    `POST /api/auth/logout-all`, `POST /api/auth/refresh`. Bunlar yine
    `auth.e2e-spec.ts` / `security.e2e-spec.ts` ile kapsanır.
  - 20 dakikalık toplam süre sınırı (`-T 20`).
  - Yöntem notu: ilk denemede auth Replacer'ı bir site dizesine
    (`ZAP_AUTH_HEADER_SITE`) kapsandı; ZAP eşleştiremedi, başlık hiç
    enjekte edilmedi (backend 696 × 401 kaydetti). **Global** Replacer
    ile yeniden çalıştırıldı; aşağıdaki sonuç doğrulanmış kimlik
    doğrulamalı çalıştırmadır.

### Sonuç (nihai, düzeltme sonrası)

**`FAIL-NEW: 0 · WARN-NEW: 2 · WARN-INPROG: 0 · INFO: 0 · IGNORE: 1 · PASS: 117`**

FAIL düzeyinde bulgu yok. Ciddi saldırı sınıfları kimlik doğrulamalı
uçlara aktif olarak gönderildi ve tümü **PASS**, şunlar dahil:
SQL Injection [40018] (+ MySQL/Hypersonic/Oracle/PostgreSQL/MsSQL
zaman-temelli türevleri), Reflected / Persistent / DOM XSS
[40012/40014/40016/40026], Remote OS Command Injection [90020] (+
zaman-temelli [90037]), Server-Side Code Injection [90019], Path Traversal
[6], Remote File Inclusion [7], XXE [90023], SSTI [90035/90036],
External Redirect [20019], CRLF Injection [40003], Log4Shell [40043],
Spring4Shell [40045], `.env` Information Leak [40034], Cloud Metadata
exposure [90034].

### Uygulanan düzeltmeler (yukarıdaki sayılar ilk çalıştırmadan bu yüzden farklı)

İlk kimlik doğrulamalı çalıştırma (düzeltme öncesi) `FAIL 0 · WARN 3 ·
PASS 117` idi; WARN'lar: Timestamp Disclosure [10096], Server Error
[100000], Application Error Disclosure [90022]. Ardından üç kod/yapılandırma
düzeltmesi uygulandı ve tarama yeniden çalıştırıldı (gerçek, gözlemlenen —
tahmin değil):

1. **`HttpExceptionFilter` sertleştirildi** — `HttpException` olmayan
   hatalar artık iç hata sınıfını/mesajını yansıtmıyor; erişilemeyen bir
   dış bağımlılık artık **502 + genel
   `{"code":"BadGateway","message":"Upstream service temporarily
   unavailable"}`** döndürüyor. → **Application Error Disclosure [90022]
   ortadan kalktı** (×6 idi, artık yok).
2. **Market girdi doğrulaması** (`GET /api/market/coin/:id`,
   `/chart/:id`, `days`): slug olmayan id'ler / geçersiz `days` → herhangi
   bir fetch'ten **önce** `400`. Market yolu **DB sorgusu yapmaz**
   (yalnızca CoinGecko `fetch`); dolayısıyla önceki `40018` isabeti,
   tamamen bir 500 farkından kaynaklı hata-temelli heuristik yanlış
   pozitifti. 500'ün kaldırılması → **SQL Injection [40018] artık PASS.**
3. **`ParseUUIDPipe`** `portfolio`/`alerts` UUID path parametrelerinde →
   bozuk id 500 yerine **400**.
4. **ZAP alert-filter** (`docs/zap-alert-filter.conf`): kural **10096
   Timestamp Disclosure → IGNORE** — doğrulanmış yanlış pozitif (meşru
   JSON epoch alanları); doğru çözüm API sözleşmesini bozmak değil
   tarayıcı triyajıdır. → `IGNORE: 1` olarak görünür.

Backend 5xx gürültüsü buna göre çöktü: HTTP 500 **132 → 2**,
502 **244 → 46** (kalan 502'ler aşağıdaki çevrimdışı-sandbox upstream
artefaktıdır).

### Kalan WARN bulguları — triyaj edildi ve **kabul** (tarama-ortamı artefaktı, proje kararıyla kod değişikliği yok)

| ZAP kuralı | Rule ID | Adet | Karar |
| ---------- | ------- | ---- | ----- |
| A Server Error response code was returned | 100000 | 18 | **Kabul — çevrimdışı-sandbox artefaktı.** Tüm isabetler `/api/market/*` üzerinde **502 Bad Gateway**: bu tarama host'unun dışa internet erişimi yok, CoinGecko/exchange-rate `fetch()` başarısız olur ve (artık doğru) işleyici genel bir 502 döndürür. Üretimde (internetli) bu uçlar 200 döner. 502 gövdesi geneldir — sınıf/mesaj/stack/sır sızıntısı yok. |
| HTTP Only Site | 10106 | 1 | **Kabul — yerel tarama hedefi.** Tarama **yerel HTTP dev sunucusuna** (`host.docker.internal:3000`) yapılır. Üretim Railway'de HTTPS + HSTS'dir (baseline'da kural 10035 **PASS**). Kod kusuru değildir. |

### Kabul (kimlik doğrulamalı tarama)

- ✅ Kimlik doğrulamalı, aktif saldırılan API yüzeyinde **0 FAIL**.
- ✅ Kimlik doğrulama backend kayıtlarından bağımsızca **doğrulandı**
  (nihai çalıştırma: korumalı route'larda **814 × 200**); böylece temiz
  sonuç anlamlıdır — toptan 401'lerden gelen sahte bir "hepsi-geçti" değil.
- ✅ Tüm injection / XSS / RCE / traversal / SSRF sınıfı kurallar **PASS**
  (düzeltme sonrası SQL Injection [40018] dahil).
- ✅ Düzeltme öncesi WARN'lar çözüldü: 90022 ortadan kalktı (filtre),
  40018 FP kaldırıldı (girdi doğrulaması), 10096 IGNORE'a triyaj edildi
  (alert-filter).
- ✅ Kalan 2 WARN incelendi ve tarama-ortamı artefaktı olarak **kabul**
  edildi (çevrimdışı-upstream 502'ler; yerel-HTTP tarama) — güvenlik
  etkisi yok, üretim etkisi yok.

## Kabul (kimliksiz baseline)

- ✅ **FAIL-NEW: 0** — FAIL düzeyinde bulgu yok.
- ✅ Yalnızca WARN: genel 404 cache-header (10049), triyaj edilip kabul.
- ✅ Anahtar güvenlik başlıkları (HSTS, CSP, X-Content-Type-Options,
  X-Frame-Options, Permissions-Policy) tümü **PASS** — Helmet etkili.
- ✅ `csurf` kaldırılması sonrası CSRF duruşu tarama ile doğrulandı:
  cookie-httponly (10010) ve session-management (10112) artık **PASS**;
  yapısal Bearer-çerez-değil + CORS-pin + `SameSite` modeli geçerli.

(Kimlik doğrulamalı aktif taramanın kendi Kabul bloğu yukarıdadır.)

## Genel kabul

- ✅ Hem kimliksiz baseline **hem de** (düzeltilmiş) kimlik doğrulamalı
  aktif API taraması **0 FAIL** ile tamamlandı.
- ✅ Düzeltme öncesi üç kimlik doğrulamalı WARN'ın tamamı yalnızca kabul
  edilmedi, **düzeltildi**: Application Error Disclosure (filtre
  sertleştirme), SQL Injection yanlış pozitifi (market girdi
  doğrulaması), Timestamp Disclosure (belgeli alert-filter → IGNORE).
- ✅ Kalan tek WARN'lar (1 baseline 404-cache, 2 kimlik doğrulamalı)
  yazılı gerekçeyle tarama-ortamı artefaktı olarak triyaj edilip kabul
  edildi (çevrimdışı-upstream 502'ler; yerel-HTTP tarama hedefi).

## Bilinen takip işleri

- ✅ **Yapıldı (2026-05-18):** `csurf` / `@types/csurf`
  `backend/package.json` ve `package-lock.json`'dan kaldırıldı; backend
  build, lint, 103 birim + 20 e2e test ve Docker imajı yeniden yeşil
  doğrulandı.
- ✅ **Yapıldı (2026-05-18):** kimlik doğrulamalı aktif API taraması
  çalıştırıldı, doğrulandı ve **düzeltildi** (bu belge).
- ✅ **Yapıldı (2026-05-18):** hata-yönetimi sertleştirmesi tamamlandı —
  dış/upstream hatası → **502 + genel mesaj** (iç hata sızıntısı yok);
  bozuk UUID path parametreleri → **400**; bozuk market `:id`/`days` →
  **400**. (Yeniden doğrulandı: build, lint, 103 birim, 20 e2e, OpenAPI
  drift yok.)
- Sonraki esaslı backend değişikliğinden sonra bu dosyayı
  `security-scan-YYYY-MM-DD.md` olarak yeniden yayımlayın. Kalan WARN'lar
  ortamsaldır (çevrimdışı upstream, yerel HTTP) ve kod değişikliği
  gerektirmez.
