# Screenshots

This folder contains two separate image sets:

1. Application screenshots taken from the live deployment
2. Competitor screenshots used for `PROJE-RAPORU.md` §6.3

Live URL: https://web-based-progrmming-end-of-year-pr.vercel.app

## Application screens

These files are embedded in the root `README.md` and in `PROJE-RAPORU.md`
§10.5:

1. `01-login.png` — Sign-in page (light mode)
2. `02-register.png` — Registration page
3. `03-dashboard-empty.png` — Dashboard before data is added
4. `04-dashboard-populated.png` — Dashboard seeded with a portfolio + watchlist
5. `05-markets.png` — Markets page with a coin table
6. `06-coin-detail.png` — Coin detail with a candlestick chart (1H range)
7. `07-mobile.png` — 375px responsive view (Chrome DevTools)
8. `08-dark-mode.png` — Dashboard in dark mode
9. `09-error.png` — Error state

## Competitor screens

Competitor-analysis images are kept in the [`competitors/`](competitors/)
folder and embedded in `PROJE-RAPORU.md` §6.3:

1. `competitors/01-coingecko.png` — CoinGecko main view
2. `competitors/02-coinmarketcap.png` — CoinMarketCap main view
3. `competitors/03-delta.png` — Delta portfolio application view

## Capture and naming notes

- Preserve the existing `01-08` filenames for application screens; the root
  `README.md` and `PROJE-RAPORU.md` §10.5 depend on these names.
- Competitor screens use the `competitors/NN-slug.png` naming convention.
- PNG is the preferred format.
- Target 1920×1080 for desktop application screens and 375×812 for mobile.
- Since competitor screens come from external services, their resolution may
  not be standardized exactly; what matters is preserving a legible interface
  comparison.
