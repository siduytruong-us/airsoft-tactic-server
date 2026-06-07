import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger, Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { JwtUtil } from '../common/utils/jwt.util';
import { MatchEventPublisher } from './match-event.publisher';
import {
  WsSession,
  IncomingMessage,
  WsEvent,
  JoinMatchMessage,
  LocationMessage,
  PingMessage,
  SelfReviveMessage,
} from './ws.types';
import { MatchesService } from '../matches/matches.service';

interface JoinRow {
  team_id: string;
  display_name: string;
  is_dead: boolean;
  respawn_at: Date | null;
}

@WebSocketGateway({ path: '/ws' })
@Injectable()
export class WsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WsGateway.name);

  // matchRooms: matchId → Set<WebSocket>
  // teamRooms:  `${matchId}:${teamId}` → Set<WebSocket>
  // sessions:   WebSocket → WsSession (enriched with cached player data)
  // userToWs:   `${matchId}:${userId}` → WebSocket  (for HIT lookup)
  private matchRooms = new Map<string, Set<WebSocket>>();
  private teamRooms  = new Map<string, Set<WebSocket>>();
  private sessions   = new Map<WebSocket, WsSession>();
  private userToWs   = new Map<string, WebSocket>();

  constructor(
    private readonly jwtUtil: JwtUtil,
    private readonly eventPublisher: MatchEventPublisher,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => MatchesService))
    private readonly matchesService: MatchesService,
  ) {}

  afterInit() {
    this.logger.log('WsGateway initialized on /ws');

    this.eventPublisher.registerBroadcastFns(
      (matchId, event) => this.broadcastToMatch(matchId, event),
      (matchId, teamId, event) => this.broadcastToTeam(matchId, teamId, event),
    );

    // Keep in-memory session isAlive in sync when player is hit
    this.eventPublisher.registerHitCallback((matchId, userId, respawnAt) => {
      this.markPlayerHit(matchId, userId, respawnAt);
    });
  }

  handleConnection(client: WebSocket) {
    this.logger.debug('Client connected — awaiting JOIN_MATCH');

    client.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as IncomingMessage;
        void this.handleMessage(client, msg);
      } catch {
        this.send(client, { event: 'ERROR', code: 'INVALID_JSON', message: 'Invalid JSON message' });
      }
    });

    client.on('pong', () => { /* client alive */ });
  }

  handleDisconnect(client: WebSocket) {
    const session = this.sessions.get(client);
    if (!session) return;

    this.logger.debug(`Client disconnected: userId=${session.userId}, match=${session.matchId}`);
    this.removeFromRooms(client, session);
  }

  private async handleMessage(client: WebSocket, msg: IncomingMessage) {
    switch (msg.type) {
      case 'JOIN_MATCH':   return this.handleJoin(client, msg);
      case 'LOCATION':     return this.handleLocation(client, msg);
      case 'PING':         return this.handlePing(client, msg as PingMessage);
      case 'SELF_REVIVE':  return this.handleSelfRevive(client, msg as SelfReviveMessage);
      default:
        this.send(client, { event: 'ERROR', code: 'UNKNOWN_TYPE', message: `Unknown message type` });
    }
  }

  // ── JOIN_MATCH ─────────────────────────────────────────────────────────────
  // One DB query to fetch teamId + displayName + isAlive.
  // All subsequent LOCATION messages use session cache — zero DB queries.

  private async handleJoin(client: WebSocket, msg: JoinMatchMessage) {
    // 1. Validate JWT
    const token = msg.token?.replace(/^Bearer\s+/i, '');
    const payload = this.jwtUtil.verify(token);
    if (!payload) {
      this.send(client, { event: 'ERROR', code: 'UNAUTHORIZED', message: 'Invalid token' });
      client.close();
      return;
    }

    const userId = payload.sub;

    // 2. Single query: join match_players + users + hit_events to populate session cache
    const rows = await this.dataSource.query<JoinRow[]>(
      `SELECT
         mp.team_id,
         u.display_name,
         EXISTS(
           SELECT 1 FROM hit_events he
           WHERE he.match_id = $1 AND he.user_id = $2 AND he.respawn_at > NOW()
         ) AS is_dead,
         (
           SELECT he2.respawn_at FROM hit_events he2
           WHERE he2.match_id = $1 AND he2.user_id = $2 AND he2.respawn_at > NOW()
           ORDER BY he2.respawn_at DESC LIMIT 1
         ) AS respawn_at
       FROM match_players mp
       JOIN users u ON u.id = mp.user_id
       WHERE mp.match_id = $1 AND mp.user_id = $2
       LIMIT 1`,
      [msg.matchId, userId],
    );

    let displayName = 'Unknown';
    let teamId = msg.teamId;  // fallback to client-provided (pre-join lobby)
    let isAlive = true;
    let respawnAt: Date | null = null;

    if (rows.length) {
      const row = rows[0];
      teamId = row.team_id;
      displayName = row.display_name;
      // pg returns 't'/'f' string or boolean
      const isDead = row.is_dead === true || (row.is_dead as unknown as string) === 't';
      isAlive = !isDead;
      respawnAt = row.respawn_at ? new Date(row.respawn_at) : null;
    } else {
      this.logger.debug(`JOIN_MATCH: userId=${userId} not yet in match_players — lobby mode`);
    }

    // 3. Build enriched session
    const session: WsSession = {
      ws: client,
      userId,
      matchId: msg.matchId,
      teamId,
      displayName,
      isAlive,
      respawnAt,
    };
    this.sessions.set(client, session);
    this.userToWs.set(`${msg.matchId}:${userId}`, client);
    this.addToRooms(client, msg.matchId, teamId);

    // 4. Reply
    this.send(client, { event: 'CONNECTED', matchId: msg.matchId, userId });
    this.logger.log(`JOIN_MATCH: userId=${userId} match=${msg.matchId} team=${teamId} displayName=${displayName}`);
  }

  // ── PING ──────────────────────────────────────────────────────────────────
  // Pure in-memory broadcast — zero DB queries, zero persistence.
  // pingId generated server-side; expiresAt = createdAt + 10s.

  private handlePing(client: WebSocket, msg: PingMessage) {
    const session = this.sessions.get(client);
    if (!session) {
      this.send(client, { event: 'ERROR', code: 'NOT_JOINED', message: 'Send JOIN_MATCH first' });
      return;
    }

    const pingId    = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 10_000);

    this.broadcastToMatch(session.matchId, {
      event:       'PING_SENT',
      matchId:     session.matchId,
      pingId,
      userId:      session.userId,
      displayName: session.displayName,
      latitude:    msg.latitude,
      longitude:   msg.longitude,
      pingType:    msg.pingType ?? 'DANGER',
      createdAt:   createdAt.toISOString(),
      expiresAt:   expiresAt.toISOString(),
    });

    this.logger.debug(`PING: userId=${session.userId} type=${msg.pingType} lat=${msg.latitude} lng=${msg.longitude}`);
  }

  // ── LOCATION ───────────────────────────────────────────────────────────────
  // Zero DB queries — all data from in-memory session.

  private handleLocation(client: WebSocket, msg: LocationMessage) {
    const session = this.sessions.get(client);
    if (!session) {
      this.send(client, { event: 'ERROR', code: 'NOT_JOINED', message: 'Send JOIN_MATCH first' });
      return;
    }

    // Auto-recover from hit when respawn timer expires
    if (session.respawnAt && Date.now() > session.respawnAt.getTime()) {
      session.isAlive = true;
      session.respawnAt = null;
    }

    // Broadcast directly from session — no DB
    this.eventPublisher.locationUpdate({
      matchId: session.matchId,
      userId:  session.userId,
      teamId:  session.teamId,
      displayName: session.displayName,
      latitude:  msg.latitude,
      longitude: msg.longitude,
      isAlive:   session.isAlive,
      respawnAt: session.isAlive ? null : (session.respawnAt?.toISOString() ?? null),
    });

    this.logger.debug(`LOCATION: userId=${session.userId} lat=${msg.latitude} lng=${msg.longitude} alive=${session.isAlive}`);
  }

  // ── SELF_REVIVE ────────────────────────────────────────────────────────────
  // Optimistic in-memory update + fire-and-forget DB update. No broadcast.

  private handleSelfRevive(client: WebSocket, msg: SelfReviveMessage) {
    const session = this.sessions.get(client);
    if (!session) return;

    // Optimistic: mark alive in session immediately
    session.isAlive = true;
    session.respawnAt = null;

    // Persist to DB asynchronously — silent on error
    setImmediate(() => {
      this.matchesService.selfRevive(msg.matchId, session.userId).catch(err => {
        this.logger.error(`selfRevive failed: userId=${session.userId} matchId=${msg.matchId}: ${(err as Error).message}`);
      });
    });
  }

  // ── Hit session update ─────────────────────────────────────────────────────
  // Called by MatchEventPublisher.hitReported() via registered callback.

  private markPlayerHit(matchId: string, userId: string, respawnAt: string) {
    const ws = this.userToWs.get(`${matchId}:${userId}`);
    if (!ws) return;
    const session = this.sessions.get(ws);
    if (!session) return;
    session.isAlive = false;
    session.respawnAt = new Date(respawnAt);
    this.logger.debug(`markPlayerHit: userId=${userId} respawnAt=${respawnAt}`);
  }

  // ── Room management ────────────────────────────────────────────────────────

  private addToRooms(client: WebSocket, matchId: string, teamId: string) {
    if (!this.matchRooms.has(matchId)) this.matchRooms.set(matchId, new Set());
    this.matchRooms.get(matchId)!.add(client);

    const teamKey = `${matchId}:${teamId}`;
    if (!this.teamRooms.has(teamKey)) this.teamRooms.set(teamKey, new Set());
    this.teamRooms.get(teamKey)!.add(client);
  }

  private removeFromRooms(client: WebSocket, session: WsSession) {
    this.matchRooms.get(session.matchId)?.delete(client);
    this.teamRooms.get(`${session.matchId}:${session.teamId}`)?.delete(client);
    this.sessions.delete(client);
    this.userToWs.delete(`${session.matchId}:${session.userId}`);

    if (this.matchRooms.get(session.matchId)?.size === 0) {
      this.matchRooms.delete(session.matchId);
    }
  }

  // ── Broadcast ──────────────────────────────────────────────────────────────

  broadcastToMatch(matchId: string, event: WsEvent) {
    const room = this.matchRooms.get(matchId);
    if (!room) return;
    const payload = JSON.stringify(event);
    room.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    });
  }

  broadcastToTeam(matchId: string, teamId: string, event: WsEvent) {
    const room = this.teamRooms.get(`${matchId}:${teamId}`);
    if (!room) return;
    const payload = JSON.stringify(event);
    room.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    });
  }

  private send(client: WebSocket, event: WsEvent) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  }

  pingAllClients() {
    this.sessions.forEach((_, ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    });
  }
}
