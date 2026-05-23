# Wireframes (Low-Fi)

Bu doküman, `PROJE-RAPORU.md` §10.4 için hazırlanan düşük sadakatli
wireframe setini içerir. Çizimler uygulamanın bilgi mimarisini, bileşen
yerleşimini ve boş/dolu durumlarını hızlıca iletişim kurmak için Markdown
eskizleri olarak tutulmuştur.

<a id="landing"></a>
## Landing

Not: Mevcut Angular uygulamasında bağımsız bir landing route'u yoktur; bu
wireframe, ürünün gelecekte pazarlama veya demo giriş ekranı eklenirse nasıl
konumlanacağını göstermek için kavramsaldır.

```text
+----------------------------------------------------------------------------------+
| LOGO                                  Özellikler | Demo | Giriş | Kayıt          |
|----------------------------------------------------------------------------------|
| "Kripto varlıklarını tek ekrandan takip et"                                      |
| Kısa değer önerisi + açıklama                                                    |
| [Dashboard'u keşfet]   [Demo hesabı ile dene]                                    |
|----------------------------------------------------------------------------------|
| Özellik kartları: Canlı fiyat | Alarm | Portföy | PWA | TR/EN                    |
|----------------------------------------------------------------------------------|
| Sosyal kanıt / teknik güven / ekran önizlemeleri                                 |
|----------------------------------------------------------------------------------|
| Footer: Lisans | GitHub | İletişim                                               |
+----------------------------------------------------------------------------------+
```

<a id="kayit-giris"></a>
## Kayıt / Giriş

```text
+----------------------------------------------------------------------------+
| Sol panel: ürün vaadi, demo hesap, güven mesajları                         |
|----------------------------------------------------------------------------|
| Sağ panel                                                                  |
|   [Sekmeler: Giriş | Kayıt]                                                |
|   E-posta                                                                  |
|   Şifre                                                                    |
|   Şifre göster/gizle                                                       |
|   Hata/başarı mesaj alanı                                                  |
|   [Devam Et]                                                               |
|   Alt link: "Hesabın yok mu?" / "Zaten hesabın var mı?"                    |
+----------------------------------------------------------------------------+
```

<a id="dashboard-bos"></a>
## Dashboard Boş

```text
+----------------------------------------------------------------------------------+
| Sidebar | Dashboard                                                              |
|----------------------------------------------------------------------------------|
| Üst özet kartları: Portföy Değeri | Watchlist | Alarm | Sentiment                |
|----------------------------------------------------------------------------------|
| Empty state hero                                                                 |
| "Henüz veri yok"                                                                 |
| [İlk coin'i ekle] [İlk pozisyonu oluştur]                                        |
|----------------------------------------------------------------------------------|
| Alt bölüm: hızlı başlangıç adımları + son haberler                               |
+----------------------------------------------------------------------------------+
```

<a id="dashboard-dolu"></a>
## Dashboard Dolu

```text
+----------------------------------------------------------------------------------+
| Sidebar | Dashboard                                                              |
|----------------------------------------------------------------------------------|
| KPI kartları: Toplam Değer | Günlük P&L | Açık Alarmlar | Fear & Greed           |
|----------------------------------------------------------------------------------|
| Sol: Watchlist tablosu      | Sağ: Mini portföy dağılımı                         |
|----------------------------------------------------------------------------------|
| Sol alt: Haber akışı         | Sağ alt: Son tetiklenen alarmlar / bağlantı durumu|
+----------------------------------------------------------------------------------+
```

<a id="ana-crud-ekrani"></a>
## Ana CRUD Ekranı

Bu projede ana CRUD yüzeyi `Portfolio` ekranıdır; kullanıcı burada pozisyon
ekler, düzenler ve kapatır.

```text
+----------------------------------------------------------------------------------+
| Sidebar | Portfolio                                                              |
|----------------------------------------------------------------------------------|
| Özet kartları: Toplam Değer | Toplam Maliyet | P&L | P&L %                       |
|----------------------------------------------------------------------------------|
| [Pozisyon Ekle] [Filtrele] [Sıralama]                                            |
|----------------------------------------------------------------------------------|
| Açık Pozisyonlar Tablosu                                                         |
| Coin | Adet | Ortalama Alış | Güncel Fiyat | P&L | İşlemler [Düzenle] [Kapat]    |
|----------------------------------------------------------------------------------|
| Kapatılmış Pozisyonlar / geçmiş                                                  |
+----------------------------------------------------------------------------------+
```

<a id="detay-sayfasi"></a>
## Detay Sayfası

```text
+----------------------------------------------------------------------------------+
| Geri | Coin adı / sembol / rank                                                  |
|----------------------------------------------------------------------------------|
| Fiyat özeti: anlık fiyat | 24s değişim | market cap                              |
|----------------------------------------------------------------------------------|
| Grafik alanı                                                                     |
| [1H] [1D] [1W] [1M] [YTD]   [Candlestick | Line | Area]                          |
|----------------------------------------------------------------------------------|
| Sağ panel: istatistikler | hızlı aksiyonlar [Watchlist] [Alarm kur]              |
+----------------------------------------------------------------------------------+
```

<a id="ayarlar"></a>
## Ayarlar

```text
+----------------------------------------------------------------------------------+
| Sidebar | Ayarlar                                                                |
|----------------------------------------------------------------------------------|
| Görünüm: Tema [Light/Dark/System]                                                |
| Dil: [TR/EN]                                                                     |
| Para birimi: [USD/EUR/TRY]                                                       |
|----------------------------------------------------------------------------------|
| Veri ve gizlilik                                                                 |
| [Verilerimi dışa aktar]                                                          |
| [Tüm oturumlardan çıkış yap]                                                     |
| [Hesabı sil]                                                                     |
+----------------------------------------------------------------------------------+
```

<a id="hata-404-500"></a>
## Hata (404 + 500)

`404` ekranı mevcut route fallback'ini, `500` ekranı ise ileride ihtiyaç
olduğunda kullanılacak tam sayfa hata durumunu temsil eder.

```text
404
+------------------------------------------------------------------------+
| 404                                                                    |
| "Aradığınız sayfa bulunamadı."                                         |
| [Dashboard'a dön] [Piyasalara git]                                     |
+------------------------------------------------------------------------+

500
+------------------------------------------------------------------------+
| 500                                                                    |
| "Bir şeyler ters gitti."                                               |
| Kısa açıklama + tekrar dene / ana ekrana dön                           |
| [Tekrar dene] [Dashboard'a dön]                                        |
+------------------------------------------------------------------------+
```
