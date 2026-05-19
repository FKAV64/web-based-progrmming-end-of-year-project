# Kullanıcı Akışları

Ana kullanıcı akışlarının Türkçe diyagramları (PROJE-RAPORU.md §10.2 ile
aynı kaynak). İlgili dokümanlar: [Sistem Mimarisi](architecture.md) ·
[Veri Modeli (ERD)](erd.md). Alarm tetikleme akışının sıralı (sequence)
gösterimi PROJE-RAPORU.md §8.3.2'dedir.

## Akış 1 — İlk Kayıt ve İlk Kullanım

```mermaid
flowchart LR
    A(/register) --> B{Form geçerli?}
    B -->|Hayır| A
    B -->|Evet| C(Hesap oluştur + httpOnly refresh cookie)
    C --> D(/dashboard)
    D --> E(Markets'tan coin ekle → Watchlist)
    E --> F(Alarm kur → push izni)
```

*Not: E-posta doğrulama V1 kapsamında zorunlu değildir; kayıt sonrası
doğrudan dashboard'a geçilir. Access token yanıt gövdesinde döner
(Bearer); yalnızca `refresh_token` httpOnly çerez olarak set edilir.*

## Akış 2 — Alarm Tetikleme

```mermaid
flowchart LR
    A(Alarm oluştur ABOVE/BELOW) --> B(Bellek-içi cache'e eklenir)
    B --> C(Her Binance tick'inde cache'ten değerlendirilir)
    C --> D{Koşul sağlandı?}
    D -->|Hayır| C
    D -->|Evet| E(Atomik CAS: triggered_at = now)
    E --> F{Aktif WS oturumu?}
    F -->|Var| G(WS ile anlık AlarmModal)
    F -->|Yok| H(Web Push bildirimi)
    G --> I(audit_log kaydı)
    H --> I
```

*Not: Aktif alarmlar uygulama açılışında (`onApplicationBootstrap`) bir
kez DB'den okunup bellek-içi cache'e yüklenir; değerlendirme her Binance
tick'inde bu cache üzerinden yapılır. `snapshot.updated` olayı yalnızca
sembol haritası, döviz kuru ve Binance aboneliklerini tazeler — alarm
değerlendirmesi yapmaz. Atomik CAS (`updateMany WHERE id AND
triggered_at IS NULL`) çift bildirimi önler.*
