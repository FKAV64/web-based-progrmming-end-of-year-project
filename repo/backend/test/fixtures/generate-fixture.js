// Generate 20-coin fixture with realistic sparkline data (168 points each)
const coins = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', price: 78000, mcap: 1536e9, rank: 1, vol: 28e9, supply: 19.7e6, maxSupply: 21e6, ath: 108786 },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', price: 2368, mcap: 285e9, rank: 2, vol: 12e9, supply: 120.3e6, maxSupply: null, ath: 4878 },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB', price: 605, mcap: 88e9, rank: 3, vol: 1.2e9, supply: 145.5e6, maxSupply: 200e6, ath: 788 },
  { id: 'solana', symbol: 'sol', name: 'Solana', price: 155, mcap: 75e9, rank: 4, vol: 3.5e9, supply: 484e6, maxSupply: null, ath: 293 },
  { id: 'ripple', symbol: 'xrp', name: 'XRP', price: 0.55, mcap: 31e9, rank: 5, vol: 1.8e9, supply: 56.4e9, maxSupply: 100e9, ath: 3.84 },
  { id: 'cardano', symbol: 'ada', name: 'Cardano', price: 0.45, mcap: 16e9, rank: 6, vol: 800e6, supply: 35.5e9, maxSupply: 45e9, ath: 3.09 },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', price: 0.082, mcap: 12e9, rank: 7, vol: 600e6, supply: 144e9, maxSupply: null, ath: 0.7376 },
  { id: 'matic-network', symbol: 'matic', name: 'Polygon', price: 0.52, mcap: 5.2e9, rank: 8, vol: 350e6, supply: 10e9, maxSupply: 10e9, ath: 2.92 },
  { id: 'polkadot', symbol: 'dot', name: 'Polkadot', price: 4.2, mcap: 6e9, rank: 9, vol: 200e6, supply: 1.43e9, maxSupply: null, ath: 54.98 },
  { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', price: 22.5, mcap: 9e9, rank: 10, vol: 450e6, supply: 400e6, maxSupply: 720e6, ath: 144.96 },
  { id: 'shiba-inu', symbol: 'shib', name: 'Shiba Inu', price: 0.0000125, mcap: 7.4e9, rank: 11, vol: 300e6, supply: 589e12, maxSupply: null, ath: 0.0000886 },
  { id: 'litecoin', symbol: 'ltc', name: 'Litecoin', price: 68, mcap: 5.1e9, rank: 12, vol: 400e6, supply: 74.8e6, maxSupply: 84e6, ath: 410.26 },
  { id: 'uniswap', symbol: 'uni', name: 'Uniswap', price: 6.8, mcap: 4.1e9, rank: 13, vol: 180e6, supply: 600e6, maxSupply: 1e9, ath: 44.92 },
  { id: 'chainlink', symbol: 'link', name: 'Chainlink', price: 14.5, mcap: 8.7e9, rank: 14, vol: 500e6, supply: 600e6, maxSupply: 1e9, ath: 52.7 },
  { id: 'cosmos', symbol: 'atom', name: 'Cosmos', price: 5.8, mcap: 2.3e9, rank: 15, vol: 150e6, supply: 390e6, maxSupply: null, ath: 44.45 },
  { id: 'stellar', symbol: 'xlm', name: 'Stellar', price: 0.11, mcap: 3.2e9, rank: 16, vol: 120e6, supply: 29.3e9, maxSupply: 50e9, ath: 0.875563 },
  { id: 'algorand', symbol: 'algo', name: 'Algorand', price: 0.18, mcap: 1.5e9, rank: 17, vol: 80e6, supply: 8.1e9, maxSupply: 10e9, ath: 3.56 },
  { id: 'vechain', symbol: 'vet', name: 'VeChain', price: 0.024, mcap: 1.7e9, rank: 18, vol: 60e6, supply: 72.7e9, maxSupply: 86.7e9, ath: 0.280991 },
  { id: 'internet-computer', symbol: 'icp', name: 'Internet Computer', price: 5.2, mcap: 2.4e9, rank: 19, vol: 90e6, supply: 464e6, maxSupply: null, ath: 700.65 },
  { id: 'filecoin', symbol: 'fil', name: 'Filecoin', price: 3.4, mcap: 1.8e9, rank: 20, vol: 110e6, supply: 530e6, maxSupply: null, ath: 236.84 },
];

function generateSparkline(basePrice, points = 168) {
  const prices = [];
  let p = basePrice * 0.95;
  for (let i = 0; i < points; i++) {
    p += (Math.random() - 0.48) * basePrice * 0.01;
    p = Math.max(p, basePrice * 0.88);
    p = Math.min(p, basePrice * 1.08);
    prices.push(parseFloat(p.toPrecision(basePrice > 1 ? 6 : 4)));
  }
  prices[points - 1] = basePrice;
  return prices;
}

const fixture = coins.map(c => ({
  id: c.id,
  symbol: c.symbol,
  name: c.name,
  image: `https://assets.coingecko.com/coins/images/1/large/${c.symbol}.png`,
  current_price: c.price,
  market_cap: c.mcap,
  market_cap_rank: c.rank,
  fully_diluted_valuation: c.maxSupply ? Math.round(c.price * c.maxSupply) : c.mcap,
  total_volume: c.vol,
  high_24h: parseFloat((c.price * 1.02).toPrecision(c.price > 1 ? 6 : 4)),
  low_24h: parseFloat((c.price * 0.98).toPrecision(c.price > 1 ? 6 : 4)),
  price_change_24h: parseFloat((c.price * 0.015).toPrecision(c.price > 1 ? 5 : 3)),
  price_change_percentage_24h: parseFloat((Math.random() * 6 - 2).toFixed(2)),
  market_cap_change_24h: Math.round(c.mcap * 0.015),
  market_cap_change_percentage_24h: parseFloat((Math.random() * 4 - 1).toFixed(2)),
  circulating_supply: c.supply,
  total_supply: c.maxSupply || c.supply,
  max_supply: c.maxSupply,
  ath: c.ath,
  ath_change_percentage: parseFloat((((c.price - c.ath) / c.ath) * 100).toFixed(1)),
  ath_date: '2025-01-20T09:11:54.494Z',
  atl: parseFloat((c.price * 0.001).toPrecision(3)),
  atl_change_percentage: parseFloat(((c.price / (c.price * 0.001) - 1) * 100).toFixed(0)),
  atl_date: '2015-01-14T00:00:00.000Z',
  last_updated: new Date().toISOString(),
  sparkline_in_7d: { price: generateSparkline(c.price) },
  price_change_percentage_1h_in_currency: parseFloat((Math.random() * 2 - 0.5).toFixed(2)),
  price_change_percentage_24h_in_currency: parseFloat((Math.random() * 6 - 2).toFixed(2)),
  price_change_percentage_7d_in_currency: parseFloat((Math.random() * 10 - 3).toFixed(2)),
}));

const fs = require('fs');
const path = require('path');
fs.writeFileSync(
  path.join(__dirname, 'top-20-coins.json'),
  JSON.stringify(fixture, null, 2)
);
console.log(`Generated ${fixture.length} coins fixture`);
