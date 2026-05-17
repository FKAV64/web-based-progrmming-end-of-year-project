import {
  Injectable,
  Logger,
  OnModuleInit,
  OnApplicationShutdown,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as http from 'http';
import { RawData, WebSocket, WebSocketServer } from 'ws';

const BINANCE_WS_URL = 'wss://stream.binance.com/ws';
const PROXY_PATH = '/ws/binance';
const MAX_RECONNECT_DELAY_MS = 30_000;

@Injectable()
export class BinanceProxyGateway
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(BinanceProxyGateway.name);

  private wss!: WebSocketServer;
  private binanceWs: WebSocket | null = null;
  private readonly clients = new Set<WebSocket>();
  private readonly activeStreams = new Set<string>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit(): void {
    if (process.env.DISABLE_BINANCE_PROXY) return;

    const httpServer: http.Server =
      this.httpAdapterHost.httpAdapter.getHttpServer() as http.Server;

    this.wss = new WebSocketServer({ noServer: true });

    // Only intercept upgrades for our proxy path; leave other paths untouched.
    httpServer.on('upgrade', (req, socket, head) => {
      if (req.url === PROXY_PATH) {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws);
        });
      }
    });

    this.wss.on('connection', (clientWs: WebSocket) => {
      this.onClientConnect(clientWs);
    });

    this.connectToBinance();
    this.logger.log(`Binance WS proxy listening on ${PROXY_PATH}`);
  }

  // ── Client side ────────────────────────────────────────────────────────────

  private onClientConnect(clientWs: WebSocket): void {
    this.clients.add(clientWs);
    this.logger.debug(`Client connected — total: ${this.clients.size}`);

    clientWs.on('message', (raw) => {
      const text = BinanceProxyGateway.rawToText(raw);

      // Track subscribed streams so we can replay them after a Binance reconnect.
      try {
        const msg = JSON.parse(text) as { method?: string; params?: string[] };
        if (msg.method === 'SUBSCRIBE' && Array.isArray(msg.params)) {
          msg.params.forEach((s) => this.activeStreams.add(s));
        }
      } catch {
        // Non-JSON control messages — forward as-is, no tracking needed.
      }

      if (this.binanceWs?.readyState === WebSocket.OPEN) {
        this.binanceWs.send(text);
      }
    });

    clientWs.on('close', () => {
      this.clients.delete(clientWs);
      this.logger.debug(`Client disconnected — total: ${this.clients.size}`);
    });

    clientWs.on('error', (err) => {
      this.logger.warn(`Client socket error: ${err.message}`);
      this.clients.delete(clientWs);
    });
  }

  // ── Binance side ───────────────────────────────────────────────────────────

  private connectToBinance(): void {
    this.logger.log(
      `Connecting to Binance WS (attempt ${this.reconnectAttempt + 1})`,
    );

    this.binanceWs = new WebSocket(BINANCE_WS_URL);

    this.binanceWs.on('open', () => {
      this.logger.log('Binance WS connected');
      this.reconnectAttempt = 0;
      this.resubscribeAll();
    });

    this.binanceWs.on('message', (raw) => {
      const text = BinanceProxyGateway.rawToText(raw);
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(text);
        }
      }
      // Emit a typed event for server-side consumers (e.g. alarm evaluator).
      // Only fire for miniTicker frames that carry a symbol (s) and close price (c).
      try {
        const msg = JSON.parse(text) as { s?: string; c?: string; E?: number };
        if (msg.s && msg.c) {
          this.eventEmitter.emit('binance.tick', {
            symbol: msg.s,
            price: parseFloat(msg.c),
            timestamp: msg.E ?? Date.now(),
          });
        }
      } catch {
        // Non-JSON control frames (ping/pong, subscription confirmations) — ignore.
      }
    });

    // 'close' fires after 'error', so reconnect is only scheduled here.
    this.binanceWs.on('close', () => {
      this.logger.warn('Binance WS closed — scheduling reconnect');
      this.scheduleReconnect();
    });

    this.binanceWs.on('error', (err) => {
      this.logger.error(`Binance WS error: ${err.message}`);
    });
  }

  /**
   * Subscribes to a Binance stream on behalf of a server-side consumer.
   *
   * Idempotent: calling with an already-tracked stream name is a no-op.
   * The stream is added to `activeStreams` so it is replayed automatically
   * on reconnect via `resubscribeAll()`.
   */
  addServerSubscription(stream: string): void {
    if (this.activeStreams.has(stream)) return;
    this.activeStreams.add(stream);
    if (this.binanceWs?.readyState === WebSocket.OPEN) {
      this.binanceWs.send(
        JSON.stringify({ method: 'SUBSCRIBE', params: [stream], id: Date.now() }),
      );
    }
  }

  private resubscribeAll(): void {
    if (this.activeStreams.size === 0 || !this.binanceWs) return;
    const params = Array.from(this.activeStreams);
    this.binanceWs.send(
      JSON.stringify({ method: 'SUBSCRIBE', params, id: Date.now() }),
    );
    this.logger.debug(`Re-subscribed to ${params.length} stream(s)`);
  }

  // Exponential backoff mirroring the frontend service (cap 30 s).
  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return; // already pending
    const delay = Math.min(
      MAX_RECONNECT_DELAY_MS,
      2 ** this.reconnectAttempt * 1_000,
    );
    this.reconnectAttempt++;
    this.logger.log(`Reconnecting in ${delay} ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectToBinance();
    }, delay);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private static rawToText(raw: RawData): string {
    if (Buffer.isBuffer(raw)) return raw.toString();
    if (Array.isArray(raw)) return Buffer.concat(raw).toString();
    return Buffer.from(raw).toString();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  onApplicationShutdown(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.binanceWs?.close();
    this.wss?.close();
    this.logger.log('Binance WS proxy shut down');
  }
}
