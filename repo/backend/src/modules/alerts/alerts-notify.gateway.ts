import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import * as http from 'http';
import { WebSocket, WebSocketServer } from 'ws';

const ALERTS_WS_PATH = '/ws/alerts';

/**
 * Real-time WebSocket gateway for alert trigger events.
 *
 * Mounts on /ws/alerts (separate from the Binance proxy on /ws/binance).
 * On connect, verifies the JWT from the ?token= query param and maps the
 * socket to the authenticated userId. This enables:
 *
 *  1. Server → client fan-out: notifyUser() pushes alert.triggered to all
 *     open browser sessions for a given user simultaneously.
 *  2. Client → server relay: when a device dismisses an alarm it sends
 *     { type: 'alarm.dismissed', alertId }; the gateway relays that to
 *     all OTHER sessions of the same user so they close the modal too.
 *
 * @see AlertsEvaluatorService – calls notifyUser() after atomic CAS
 */
@Injectable()
export class AlertsNotifyGateway
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(AlertsNotifyGateway.name);

  private wss!: WebSocketServer;
  private readonly userSockets = new Map<string, Set<WebSocket>>();

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit(): void {
    const httpServer: http.Server =
      this.httpAdapterHost.httpAdapter.getHttpServer() as http.Server;

    this.wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (req, socket, head) => {
      if ((req.url ?? '').startsWith(ALERTS_WS_PATH)) {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req);
        });
      }
    });

    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      this.onClientConnect(ws, req);
    });

    this.logger.log(`Alerts WS gateway listening on ${ALERTS_WS_PATH}`);
  }

  private onClientConnect(ws: WebSocket, req: http.IncomingMessage): void {
    const url = new URL(req.url ?? '', 'http://x');
    const token = url.searchParams.get('token');
    const userId = this.verifyToken(token);

    if (!userId) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(ws);
    this.logger.debug(
      `User ${userId} connected — open sessions: ${this.userSockets.get(userId)!.size}`,
    );

    ws.on('message', (raw) => {
      const text = Buffer.isBuffer(raw)
        ? raw.toString()
        : Array.isArray(raw)
          ? Buffer.concat(raw).toString()
          : Buffer.from(raw).toString();
      this.handleClientMessage(ws, userId, text);
    });

    const cleanup = () => {
      const set = this.userSockets.get(userId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) this.userSockets.delete(userId);
      }
    };

    ws.on('close', () => {
      cleanup();
      this.logger.debug(`User ${userId} disconnected`);
    });

    ws.on('error', (err) => {
      this.logger.warn(`Socket error for user ${userId}: ${err.message}`);
      cleanup();
    });
  }

  /**
   * Returns true if the user has at least one open WebSocket session.
   * Used by AlertsEvaluatorService to skip Web Push when the in-app
   * AlarmModal will already deliver the notification via alert.triggered.
   */
  hasActiveSessions(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return false;
    for (const s of sockets) {
      if (s.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }

  /**
   * Push an alert.triggered event to every open session of the user.
   * Called by AlertsEvaluatorService immediately after the CAS succeeds.
   */
  notifyUser(userId: string, payload: object): void {
    const clients = this.userSockets.get(userId);
    if (!clients || clients.size === 0) return;
    const msg = JSON.stringify({ type: 'alert.triggered', data: payload });
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  }

  /**
   * Relay alarm.dismissed from the originating device to all OTHER sessions
   * of the same user, so they automatically close the modal without any
   * user action on those devices.
   */
  private handleClientMessage(
    sender: WebSocket,
    userId: string,
    raw: string,
  ): void {
    try {
      const msg = JSON.parse(raw) as { type?: string; alertId?: string };
      if (msg.type === 'alarm.dismissed' && msg.alertId) {
        const relay = JSON.stringify({
          type: 'alarm.dismissed',
          alertId: msg.alertId,
        });
        this.userSockets.get(userId)?.forEach((ws) => {
          if (ws !== sender && ws.readyState === WebSocket.OPEN) {
            ws.send(relay);
          }
        });
      }
    } catch {
      // ignore malformed client messages
    }
  }

  private verifyToken(token: string | null): string | null {
    if (!token) return null;
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      return payload?.sub ?? null;
    } catch {
      return null;
    }
  }

  onApplicationShutdown(): void {
    this.wss?.close();
    this.userSockets.clear();
    this.logger.log('Alerts WS gateway shut down');
  }
}
