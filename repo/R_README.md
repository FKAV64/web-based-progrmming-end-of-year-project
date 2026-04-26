# repo/ — Projenin Kaynak Kodu

Bu klasör, **projenizin tüm kaynak kodunu** barındırır. GitHub'a push edeceğiniz repo'nuzun aynen buraya gelmesi beklenir. Kendi iç yapınıza göre düzenleyin — dayatma yok.

## Önerilen Yapı (Örnek)

Bir full-stack projesi için tipik yerleşim şöyle olabilir (uyarlayın):

```
repo/
├── README.md                # Projenizin kendi README'si (kurulum, tech stack, demo link)
├── LICENSE                  # Ana klasördeki LICENSE'ı buraya da kopyalayabilirsiniz
├── package.json             # Node / pyproject.toml / Cargo.toml / go.mod ...
├── .env.example             # Ortam değişkeni şablonu
├── .gitignore
├── src/                     # Kaynak kod
├── tests/                   # Testler
├── public/ veya static/     # Statik dosyalar
├── docs/                    # (isteğe bağlı) Proje içi teknik doküman
│   ├── screenshots/         # Ekran görüntüleri
│   └── diagrams/            # Mimari / ERD / user flow diyagramları
└── .github/workflows/ci.yml # CI/CD
```

## Önemli

- **PROJE-RAPORU.md** ve **PROJE-RAPORU-SABLON.docx** (bir üst klasörde) — final rapor belgeleridir, bu `repo/` klasöründe değildirler. Onlar sizin ders raporunuz.
- **Ekran görüntüleri ve diyagramlar** için ayrı bir yapı zorunlu tutulmamıştır. Kendi repo'nuzdaki `docs/` veya `screenshots/` gibi alt klasörlerde tutabilirsiniz. Rapor belgesinde onlara referans verirsiniz.
- **Demo video / GIF**: 30-60 saniyelik bir demo kaydı önerilir ([ScreenToGif](https://www.screentogif.com), [Kap](https://getkap.co), [Loom](https://loom.com)).

## Önerilen Ekran Görüntüsü Listesi (Rapora Eklenecek)

Final raporunda şu görüntüleri göstermeniz beklenir:

1. Ana sayfa / landing
2. Kayıt veya giriş ekranı
3. Dashboard — boş hali (empty state)
4. Dashboard — dolu hali (seed data ile)
5. Ana kaynak detay sayfası
6. Mobile (responsive) görünüm
7. Hata durumu (404 veya form validation)
8. (varsa) Koyu mod

**İpuçları:** 1920×1080 veya 1440×900 çözünürlük, PNG formatı (JPG kayıplı), Chrome DevTools Device Mode mobile için.

## Ne Zaman Buraya Push Etmeli?

- Ya `repo/` klasörünü doğrudan kullanın (git init burada yapın).
- Ya da dışarıda ayrı bir repo tutup, teslimat sırasında `repo/` içine **klon** veya **submodule** olarak ekleyin.
- Hangi yöntemi seçerseniz seçin, teslim edilen zip veya GitHub link'inde `repo/` klasöründe çalışan kodun bulunması yeterlidir.
