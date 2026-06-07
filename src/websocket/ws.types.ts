import { WebSocket } from 'ws';

export interface WsSession {
  ws: WebSocket;
  userId: string;
  matchId: string;
  teamId: string;
  displayName: string;
  isAlive: boolean;
  respawnAt: Date | null;
}

export type MessageType = 'JOIN_MATCH' | 'LOCATION' | 'PING' | 'SELF_REVIVE';

export interface JoinMatchMessage {
  type: 'JOIN_MATCH';
  matchId: string;
  teamId: string;
  token: string;
}

export interface LocationMessage {
  type: 'LOCATION';
  matchId: string;
  latitude: number;
  longitude: number;
}

export interface PingMessage {
  type: 'PING';
  matchId: string;
  latitude: number;
  longitude: number;
  pingType: string;  // 'ENEMY' | 'OBJECTIVE' | 'ASSIST' | 'DANGER' | ...
}

export interface SelfReviveMessage {
  type: 'SELF_REVIVE';
  matchId: string;
}

export type IncomingMessage = JoinMatchMessage | LocationMessage | PingMessage | SelfReviveMessage;

export type WsEvent =
  | { event: 'CONNECTED'; matchId: string; userId: string }
  | { event: 'ERROR'; code: string; message: string }
  | { event: 'PLAYER_JOINED'; matchId: string; teamId: string; player: { userId: string; displayName: string; avatarUrl: string; joinedAt: string } }
  | { event: 'PLAYER_LEFT'; matchId: string; teamId: string; userId: string }
  | { event: 'MATCH_STARTED'; matchId: string; startedAt: string }
  | { event: 'MATCH_ENDED'; matchId: string; endedAt: string; winningTeamId?: string }
  | { event: 'HIT_REPORTED'; matchId: string; userId: string; respawnAt: string }
  | { event: 'PING_SENT'; matchId: string; pingId: string; userId: string; displayName: string; latitude: number; longitude: number; pingType: string; createdAt: string; expiresAt: string }
  | { event: 'LOCATION_UPDATE'; matchId: string; userId: string; teamId: string; displayName: string; latitude: number; longitude: number; isAlive: boolean; respawnAt: string | null; updatedAt: string };
