import { Injectable, Logger } from '@nestjs/common';
import { WsEvent } from './ws.types';

@Injectable()
export class MatchEventPublisher {
  private readonly logger = new Logger(MatchEventPublisher.name);

  private broadcastToMatchFn?: (matchId: string, event: WsEvent) => void;
  private broadcastToTeamFn?: (matchId: string, teamId: string, event: WsEvent) => void;
  // Called by WsGateway to keep in-memory session isAlive in sync
  private hitCallbackFn?: (matchId: string, userId: string, respawnAt: string) => void;

  registerBroadcastFns(
    toMatch: (matchId: string, event: WsEvent) => void,
    toTeam: (matchId: string, teamId: string, event: WsEvent) => void,
  ) {
    this.broadcastToMatchFn = toMatch;
    this.broadcastToTeamFn = toTeam;
  }

  registerHitCallback(fn: (matchId: string, userId: string, respawnAt: string) => void) {
    this.hitCallbackFn = fn;
  }

  private toMatch(matchId: string, event: WsEvent) {
    this.broadcastToMatchFn?.(matchId, event);
  }

  private toTeam(matchId: string, teamId: string, event: WsEvent) {
    this.broadcastToTeamFn?.(matchId, teamId, event);
  }

  playerJoined(matchId: string, teamId: string, player: { userId: string; displayName: string; avatarUrl?: string | null; joinedAt?: Date | null }) {
    this.toMatch(matchId, {
      event: 'PLAYER_JOINED',
      matchId,
      teamId,
      player: {
        userId: player.userId,
        displayName: player.displayName,
        avatarUrl: player.avatarUrl ?? '',
        joinedAt: player.joinedAt?.toISOString() ?? '',
      },
    });
  }

  playerLeft(matchId: string, teamId: string, userId: string) {
    this.toMatch(matchId, { event: 'PLAYER_LEFT', matchId, teamId, userId });
  }

  matchStarted(matchId: string, startedAt?: Date | null) {
    this.toMatch(matchId, {
      event: 'MATCH_STARTED',
      matchId,
      startedAt: startedAt?.toISOString() ?? new Date().toISOString(),
    });
  }

  matchEnded(matchId: string, endedAt?: Date | null, winningTeamId?: string | null) {
    this.toMatch(matchId, {
      event: 'MATCH_ENDED',
      matchId,
      endedAt: endedAt?.toISOString() ?? new Date().toISOString(),
      ...(winningTeamId ? { winningTeamId } : {}),
    });
  }

  hitReported(matchId: string, userId: string, respawnAt?: Date | null) {
    const respawnAtStr = respawnAt?.toISOString() ?? new Date(Date.now() + 30_000).toISOString();
    // Notify WsGateway to update the player's in-memory session
    this.hitCallbackFn?.(matchId, userId, respawnAtStr);
    this.toMatch(matchId, { event: 'HIT_REPORTED', matchId, userId, respawnAt: respawnAtStr });
  }

  locationUpdate(params: {
    matchId: string;
    userId: string;
    teamId: string;
    displayName: string;
    latitude: number;
    longitude: number;
    isAlive: boolean;
    respawnAt: string | null;
  }) {
    this.toTeam(params.matchId, params.teamId, {
      event: 'LOCATION_UPDATE',
      ...params,
      updatedAt: new Date().toISOString(),
    });
  }

  pingSent(params: {
    matchId: string;
    pingId: string;
    userId: string;
    displayName: string;
    latitude: number;
    longitude: number;
    pingType: string;
    createdAt: Date;
    expiresAt: Date;
  }) {
    this.toMatch(params.matchId, {
      event: 'PING_SENT',
      matchId: params.matchId,
      pingId: params.pingId,
      userId: params.userId,
      displayName: params.displayName,
      latitude: params.latitude,
      longitude: params.longitude,
      pingType: params.pingType,
      createdAt: params.createdAt.toISOString(),
      expiresAt: params.expiresAt.toISOString(),
    });
  }
}
