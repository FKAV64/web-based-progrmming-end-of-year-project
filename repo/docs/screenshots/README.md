# Ekran Görüntüleri

Bu klasör iki ayrı görsel setini barındırır:

1. Ürünün canlı dağıtımdan alınan uygulama ekran görüntüleri
2. `PROJE-RAPORU.md` §6.3 için kullanılan rakip ekran görüntüleri

Canlı URL: https://web-based-progrmming-end-of-year-pr.vercel.app

## Uygulama ekranları

Bu dosyalar kök `README.md` ile `PROJE-RAPORU.md` §10.5 içinde gömülü olarak
kullanılır:

1. `01-login.png` — Giriş sayfası (açık mod)
2. `02-register.png` — Kayıt sayfası
3. `03-dashboard-empty.png` — Veri eklenmeden önce dashboard
4. `04-dashboard-populated.png` — Portföy + watchlist seed'li dashboard
5. `05-markets.png` — Coin tablosuyla Piyasalar sayfası
6. `06-coin-detail.png` — Mum grafikli coin detayı (1H aralığı)
7. `07-mobile.png` — 375px responsive görünüm (Chrome DevTools)
8. `08-dark-mode.png` — Koyu mod dashboard

## Rakip ekranları

Rakip analizi görselleri [`competitors/`](competitors/) klasöründe tutulur ve
`PROJE-RAPORU.md` §6.3 içinde gömülü kullanılır:

1. `competitors/01-coingecko.png` — CoinGecko ana görünümü
2. `competitors/02-coinmarketcap.png` — CoinMarketCap ana görünümü
3. `competitors/03-delta.png` — Delta portföy uygulaması görünümü

## Yakalama ve adlandırma notları

- Uygulama ekranları için mevcut `01-08` dosya adlarını koruyun; kök
  `README.md` ve `PROJE-RAPORU.md` §10.5 bu adlara bağlıdır.
- Rakip ekranlarında `competitors/NN-slug.png` adlandırması kullanılır.
- Biçim tercihi PNG'dir.
- Uygulama ekranlarında masaüstü için 1920×1080, mobil için 375×812 hedeflenir.
- Rakip ekranları dış servislerden alındığı için çözünürlük birebir standart
  olmayabilir; önemli olan arayüz kıyaslamasını okunur biçimde korumaktır.
