# Veri Modeli (ERD)

`repo/backend/prisma/schema.prisma` dosyasının birebir yansıması. Bu
diyagram PROJE-RAPORU.md §9.1 ile aynı kaynaktan üretilir (tek doğruluk
kaynağı). İlgili dokümanlar: [Sistem Mimarisi](architecture.md) ·
[Kullanıcı Akışları](user-flow.md).

```mermaid
erDiagram
    User ||--o{ RefreshToken : "sahiptir"
    User ||--o{ WatchlistItem : "sahiptir"
    User ||--o{ PortfolioPosition : "sahiptir"
    User ||--o{ PriceAlert : "sahiptir"
    User ||--o{ PushSubscription : "sahiptir"
    User ||--|| UserSettings : "1:1"
    User |o--o{ AuditLog : "yazar (SetNull)"

    User {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar name
        Role role
        timestamp email_verified_at
        int failed_login_attempts
        timestamp last_failed_login_at
        timestamp locked_until
        timestamp logout_all_at
        timestamp created_at
        timestamp updated_at
    }
    RefreshToken {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        timestamp expires_at
        timestamp revoked_at
        varchar user_agent
        varchar ip
        timestamp created_at
    }
    WatchlistItem {
        uuid id PK
        uuid user_id FK
        varchar coin_id
        timestamp added_at
    }
    PortfolioPosition {
        uuid id PK
        uuid user_id FK
        varchar coin_id
        decimal quantity
        decimal avg_buy_price
        Currency buy_currency
        varchar notes
        timestamp closed_at
        decimal close_price
        timestamp created_at
        timestamp updated_at
    }
    PriceAlert {
        uuid id PK
        uuid user_id FK
        varchar coin_id
        AlertCondition condition
        decimal target_price
        Currency currency
        timestamp triggered_at
        timestamp created_at
        timestamp updated_at
    }
    PushSubscription {
        uuid id PK
        uuid user_id FK
        varchar endpoint UK
        varchar p256dh_key
        varchar auth_key
        varchar user_agent
        timestamp created_at
    }
    UserSettings {
        uuid user_id PK "users.id'e FK (1:1)"
        Theme theme
        Currency currency
        Locale locale
        boolean notifications_enabled
        timestamp updated_at
    }
    AuditLog {
        uuid id PK
        uuid user_id FK "nullable, onDelete SetNull"
        varchar action
        varchar resource_type
        varchar resource_id
        varchar ip
        varchar user_agent
        json meta
        timestamp created_at
    }
```

**Enum'lar:** `Role` = USER · ADMIN | `AlertCondition` = ABOVE · BELOW |
`Currency` = USD · EUR · TRY | `Theme` = LIGHT · DARK · SYSTEM |
`Locale` = TR · EN.

**Index / benzersizlik kısıtları:** `users.email` UNIQUE ·
`refresh_tokens.token_hash` UNIQUE + index `(user_id, revoked_at)` ·
`watchlist_items` UNIQUE `(user_id, coin_id)` ·
`portfolio_positions` index `(user_id, closed_at)` ·
`price_alerts` index `(user_id, triggered_at)` + `(triggered_at)` ·
`push_subscriptions.endpoint` UNIQUE + index `(user_id)` ·
`audit_log` index `(user_id, created_at)` + `(action, created_at)`.
Tüm `user_id` yabancı anahtarları `onDelete: Cascade`'tir
(`audit_log` hariç — `SetNull`, denetim izi kullanıcı silinse de kalır).

*Kaynak: [../../backend/prisma/schema.prisma](../../backend/prisma/schema.prisma)*
