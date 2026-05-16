// Prevent BinanceProxyGateway from attempting a real Binance WebSocket
// connection during E2E tests. GitHub Actions runners are geo-blocked (HTTP 451)
// and without this the reconnect loop causes tests to hang indefinitely.
process.env.DISABLE_BINANCE_PROXY = '1';
