import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { randomUUID } from 'crypto';

import { GameMatch } from '../database/entities/game-match.entity';
import { Team } from '../database/entities/team.entity';
import { MatchPlayer } from '../database/entities/match-player.entity';
import { User } from '../database/entities/user.entity';
import { Field } from '../database/entities/field.entity';
import { GameMode } from '../database/entities/game-mode.entity';
import { HitEvent } from '../database/entities/hit-event.entity';
import { PlayerStats } from '../database/entities/player-stats.entity';

import { MatchEventPublisher } from '../websocket/match-event.publisher';
import { CreateMatchDto } from './dto/create-match.dto';
import { EndMatchDto } from './dto/end-match.dto';
import {
  MatchResponseDto,
  TeamDetailDto,
  PlayerInTeamDto,
} from './dto/match-response.dto';

const TEAM_NAMES  = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'] as const;
const TEAM_COLORS = ['#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899'] as const;

interface HitEventRow {
  id: string;
  reported_at: Date;
  respawn_at: Date;
}

interface ActiveMatchRow {
  match_id: string;
}

interface IsAliveRow {
  exists: string | boolean;
}

// GameMatch loaded with relations
interface GameMatchFull extends GameMatch {
  field: Field;
  gameMode: GameMode;
}

// MatchPlayer loaded with user relation
interface MatchPlayerFull extends MatchPlayer {
  user: User;
}

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    @InjectRepository(GameMatch)
    private readonly matchRepo: Repository<GameMatch>,

    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,

    @InjectRepository(MatchPlayer)
    private readonly matchPlayerRepo: Repository<MatchPlayer>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Field)
    private readonly fieldRepo: Repository<Field>,

    @InjectRepository(GameMode)
    private readonly gameModeRepo: Repository<GameMode>,

    @InjectRepository(HitEvent)
    private readonly hitEventRepo: Repository<HitEvent>,


    @InjectRepository(PlayerStats)
    private readonly statsRepo: Repository<PlayerStats>,

    private readonly eventPublisher: MatchEventPublisher,
    private readonly dataSource: DataSource,
  ) {}

  // ─── getMatch ────────────────────────────────────────────────────────────────

  async getMatch(matchId: string, userId?: string): Promise<MatchResponseDto> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['field', 'gameMode'],
    }) as GameMatchFull | null;
    if (!match) throw new NotFoundException(`Match not found: ${matchId}`);

    const teams = await this.teamRepo.find({ where: { matchId } });
    const allPlayers = await this.matchPlayerRepo.find({
      where: { matchId },
      relations: ['user'],
    }) as MatchPlayerFull[];

    return this.buildMatchResponse(match, teams, allPlayers, userId);
  }

  // ─── getActiveMatch ──────────────────────────────────────────────────────────

  async getActiveMatch(userId: string): Promise<MatchResponseDto | null> {
    const rows = await this.dataSource.query<ActiveMatchRow[]>(
      `SELECT mp.match_id
       FROM match_players mp
       JOIN game_matches gm ON gm.id = mp.match_id
       WHERE mp.user_id = $1
         AND gm.status IN ('IN_PROGRESS', 'WAITING')
       LIMIT 1`,
      [userId],
    );
    if (!rows.length) return null;
    return this.getMatch(rows[0].match_id, userId);
  }

  // ─── joinTeam ────────────────────────────────────────────────────────────────

  async joinTeam(
    matchId: string,
    teamId: string,
    userId: string,
  ): Promise<{ matchId: string; teamId: string; userId: string; joinedAt: string }> {
    const match = await this.matchRepo.findOneBy({ id: matchId });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status !== 'WAITING') {
      throw new UnprocessableEntityException({
        message: `Cannot join: status is ${match.status}`,
        code: 'MATCH_NOT_JOINABLE',
      });
    }

    // Run all validation checks in parallel — 4 sequential → 1 parallel batch
    const [alreadyJoined, teamExists, playerCount, user] = await Promise.all([
      this.dataSource.query<{ exists: boolean | string }[]>(
        `SELECT EXISTS(SELECT 1 FROM match_players WHERE match_id = $1 AND user_id = $2) AS exists`,
        [matchId, userId],
      ),
      this.dataSource.query<{ exists: boolean | string }[]>(
        `SELECT EXISTS(SELECT 1 FROM teams WHERE id = $1 AND match_id = $2) AS exists`,
        [teamId, matchId],
      ),
      this.dataSource.query<{ count: string }[]>(
        `SELECT COUNT(*) AS count FROM match_players WHERE match_id = $1`,
        [matchId],
      ),
      this.userRepo.findOneBy({ id: userId }),
    ]);

    const isJoined = (v: boolean | string) => v === true || v === 't' || v === 'true';
    if (isJoined(alreadyJoined[0]?.exists)) {
      throw new ConflictException({ message: 'Already in a team', code: 'ALREADY_EXISTS' });
    }
    if (!isJoined(teamExists[0]?.exists)) {
      throw new NotFoundException('Team not found in match');
    }
    if (parseInt(playerCount[0].count, 10) >= match.maxPlayers) {
      throw new UnprocessableEntityException({ message: 'Match full', code: 'CAPACITY_FULL' });
    }
    if (!user) throw new NotFoundException('User not found');

    const mp = this.matchPlayerRepo.create({ matchId, teamId, userId });
    const saved = await this.matchPlayerRepo.save(mp);

    this.eventPublisher.playerJoined(matchId, teamId, {
      userId: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      joinedAt: saved.joinedAt,
    });

    return {
      matchId,
      teamId,
      userId,
      joinedAt: saved.joinedAt.toISOString(),
    };
  }

  // ─── leaveMatch ──────────────────────────────────────────────────────────────

  async leaveMatch(matchId: string, userId: string): Promise<void> {
    const match = await this.matchRepo.findOneBy({ id: matchId });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status === 'IN_PROGRESS') {
      throw new UnprocessableEntityException({
        message: 'Cannot leave in-progress match',
        code: 'MATCH_NOT_JOINABLE',
      });
    }

    const rows = await this.dataSource.query<{ id: string; team_id: string }[]>(
      `SELECT id, team_id FROM match_players WHERE match_id = $1 AND user_id = $2 LIMIT 1`,
      [matchId, userId],
    );
    if (!rows.length) throw new NotFoundException('Not in this match');

    await this.dataSource.query(
      `DELETE FROM match_players WHERE id = $1`,
      [rows[0].id],
    );
    this.eventPublisher.playerLeft(matchId, rows[0].team_id, userId);
  }

  // ─── startMatch ──────────────────────────────────────────────────────────────

  async startMatch(matchId: string, adminId: string): Promise<MatchResponseDto> {
    const match = await this.matchRepo.findOneBy({ id: matchId });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status !== 'WAITING') {
      throw new UnprocessableEntityException({
        message: 'Match is not WAITING',
        code: 'INVALID_STATUS_TRANSITION',
      });
    }

    match.status    = 'IN_PROGRESS';
    match.startedAt = new Date();
    await this.matchRepo.save(match);

    this.eventPublisher.matchStarted(matchId, match.startedAt);
    return this.getMatch(matchId, adminId);
  }

  // ─── endMatch ────────────────────────────────────────────────────────────────

  async endMatch(
    matchId: string,
    adminId: string,
    dto: EndMatchDto,
  ): Promise<MatchResponseDto> {
    const match = await this.matchRepo.findOneBy({ id: matchId });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status !== 'IN_PROGRESS') {
      throw new UnprocessableEntityException({
        message: 'Match not in progress',
        code: 'INVALID_STATUS_TRANSITION',
      });
    }

    match.status        = 'ENDED';
    match.endedAt       = new Date();
    match.winningTeamId = dto.winningTeamId ?? null;
    await this.matchRepo.save(match);

    await this.updatePlayerStats(match);
    this.eventPublisher.matchEnded(matchId, match.endedAt, match.winningTeamId);

    return this.getMatch(matchId, adminId);
  }

  // ─── reportHit ───────────────────────────────────────────────────────────────

  async reportHit(
    matchId: string,
    userId: string,
  ): Promise<{ id: string; matchId: string; userId: string; reportedAt: string; respawnAt: string }> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['gameMode'],
    });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status !== 'IN_PROGRESS') {
      throw new UnprocessableEntityException({
        message: 'Match not in progress',
        code: 'MATCH_NOT_JOINABLE',
      });
    }

    const fullMatch = match as GameMatchFull;
    const delay = fullMatch.gameMode.respawnDelaySeconds;

    // Idempotency check — return existing if within respawn window
    const existing = await this.dataSource.query<HitEventRow[]>(
      `SELECT id, reported_at, respawn_at
       FROM hit_events
       WHERE match_id = $1
         AND user_id = $2
         AND reported_at > NOW() - INTERVAL '${delay} seconds'
       LIMIT 1`,
      [matchId, userId],
    );

    if (existing.length > 0) {
      const e = existing[0];
      return {
        id:         e.id,
        matchId,
        userId,
        reportedAt: new Date(e.reported_at).toISOString(),
        respawnAt:  new Date(e.respawn_at).toISOString(),
      };
    }

    const respawnAt = new Date(Date.now() + delay * 1000);
    const hit = this.hitEventRepo.create({ matchId, userId, respawnAt });
    const saved = await this.hitEventRepo.save(hit);

    this.eventPublisher.hitReported(matchId, userId, saved.respawnAt);

    return {
      id:         saved.id,
      matchId,
      userId,
      reportedAt: saved.reportedAt.toISOString(),
      respawnAt:  saved.respawnAt.toISOString(),
    };
  }


  // ─── updateLocation (called from WsGateway) ──────────────────────────────────

  async updateLocation(
    matchId: string,
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    const match = await this.matchRepo.findOneBy({ id: matchId });
    if (!match || match.status !== 'IN_PROGRESS') return;

    const mpRows = await this.dataSource.query<{ team_id: string }[]>(
      `SELECT team_id FROM match_players WHERE match_id = $1 AND user_id = $2 LIMIT 1`,
      [matchId, userId],
    );
    if (!mpRows.length) return;

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) return;

    // isAlive: no active hit event with respawn_at > NOW()
    const hitRows = await this.dataSource.query<IsAliveRow[]>(
      `SELECT EXISTS(
         SELECT 1 FROM hit_events
         WHERE match_id = $1 AND user_id = $2 AND respawn_at > NOW()
       ) AS exists`,
      [matchId, userId],
    );
    // pg returns 't'/'f' string or boolean depending on driver
    const existsVal = hitRows[0]?.exists;
    const isDead    = existsVal === true || existsVal === 't' || existsVal === 'true';
    const isAlive   = !isDead;

    this.eventPublisher.locationUpdate({
      matchId,
      userId,
      teamId:      mpRows[0].team_id,
      displayName: user.displayName,
      latitude,
      longitude,
      isAlive,
    });
  }

  // ─── selfRevive (called from WsGateway — silent) ─────────────────────────────

  async selfRevive(matchId: string, userId: string): Promise<void> {
    // Set respawn_at = NOW() on the active hit event → isAlive check returns no rows next time
    await this.dataSource.query(
      `UPDATE hit_events
       SET respawn_at = NOW()
       WHERE match_id = $1
         AND user_id  = $2
         AND respawn_at > NOW()`,
      [matchId, userId],
    );
  }

  // ─── getMyStatus (used by REST GET /my-status) ────────────────────────────────

  async getMyStatus(
    matchId: string,
    userId: string,
  ): Promise<{ isAlive: boolean; respawnAt: string | null }> {
    const member = await this.dataSource.query<{ exists: boolean | string }[]>(
      `SELECT EXISTS(SELECT 1 FROM match_players WHERE match_id = $1 AND user_id = $2) AS exists`,
      [matchId, userId],
    );
    const isMember = (v: boolean | string) => v === true || v === 't' || v === 'true';
    if (!isMember(member[0]?.exists)) {
      throw new ForbiddenException('Not a member of this match');
    }

    const rows = await this.dataSource.query<{ respawn_at: Date }[]>(
      `SELECT respawn_at
       FROM hit_events
       WHERE match_id = $1 AND user_id = $2 AND respawn_at > NOW()
       ORDER BY respawn_at DESC
       LIMIT 1`,
      [matchId, userId],
    );

    if (!rows.length) {
      return { isAlive: true, respawnAt: null };
    }
    return {
      isAlive:   false,
      respawnAt: new Date(rows[0].respawn_at).toISOString(),
    };
  }

  // ─── isPlayerInMatch (used by WsGateway) ─────────────────────────────────────

  async isPlayerInMatch(matchId: string, userId: string): Promise<boolean> {
    const rows = await this.dataSource.query<{ exists: boolean | string }[]>(
      `SELECT EXISTS(SELECT 1 FROM match_players WHERE match_id = $1 AND user_id = $2) AS exists`,
      [matchId, userId],
    );
    const v = rows[0]?.exists;
    return v === true || v === 't' || v === 'true';
  }

  // ─── createMatch (admin) ─────────────────────────────────────────────────────

  async createMatch(
    adminId: string,
    adminDisplayName: string,
    dto: CreateMatchDto,
  ): Promise<MatchResponseDto> {
    const field = await this.fieldRepo.findOneBy({ id: dto.fieldId });
    if (!field) throw new NotFoundException('Field not found');

    const gameMode = await this.gameModeRepo.findOneBy({ id: dto.gameModeId });
    if (!gameMode) throw new NotFoundException('GameMode not found');

    const match = this.matchRepo.create({
      fieldId:              dto.fieldId,
      gameModeId:           dto.gameModeId,
      createdById:          adminId,
      createdByDisplayName: adminDisplayName,
      maxPlayers:           gameMode.maxPlayers,
      status:               'WAITING',
    });
    const savedMatch = await this.matchRepo.save(match);

    // Auto-create N teams — bulk insert instead of sequential saves
    const teamsToCreate = Array.from({ length: gameMode.teamCount }, (_, i) => {
      const teamName = TEAM_NAMES[i % TEAM_NAMES.length];
      return this.teamRepo.create({
        matchId:     savedMatch.id,
        name:        teamName,
        colorHex:    TEAM_COLORS[i % TEAM_COLORS.length],
        respawnBase: `${teamName} Base`,
      });
    });
    await this.teamRepo.save(teamsToCreate);

    return this.getMatch(savedMatch.id, adminId);
  }

  // ─── getMatchesByField (used by AdminModule) ─────────────────────────────────

  async getMatchesByField(fieldId: string): Promise<MatchResponseDto[]> {
    const matches = await this.matchRepo.find({
      where: { fieldId },
      select: ['id'],
      order: { createdAt: 'DESC' },
    });
    if (!matches.length) return [];
    return this.batchLoadMatches(matches.map(m => m.id));
  }

  // ─── getMyMatches (used by UsersModule) ──────────────────────────────────────

  async getMyMatches(userId: string, page = 0, size = 20): Promise<MatchResponseDto[]> {
    const rows = await this.dataSource.query<{ match_id: string }[]>(
      `SELECT mp.match_id
       FROM match_players mp
       JOIN game_matches gm ON gm.id = mp.match_id
       WHERE mp.user_id = $1 AND gm.status = 'ENDED'
       ORDER BY gm.ended_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, size, page * size],
    );
    if (!rows.length) return [];
    return this.batchLoadMatches(rows.map(r => r.match_id), userId);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  // Load N matches in 3 queries (matches + teams + players) instead of N×3 queries.
  private async batchLoadMatches(matchIds: string[], userId?: string): Promise<MatchResponseDto[]> {
    const [matches, teams, players] = await Promise.all([
      this.matchRepo.find({
        where: { id: In(matchIds) },
        relations: ['field', 'gameMode'],
      }) as Promise<GameMatchFull[]>,
      this.teamRepo.find({ where: { matchId: In(matchIds) } }),
      this.matchPlayerRepo.find({
        where: { matchId: In(matchIds) },
        relations: ['user'],
      }) as Promise<MatchPlayerFull[]>,
    ]);

    const matchMap    = new Map(matches.map(m => [m.id, m]));
    const teamsByMatch   = new Map<string, Team[]>();
    const playersByMatch = new Map<string, MatchPlayerFull[]>();

    for (const t of teams) {
      const list = teamsByMatch.get(t.matchId) ?? [];
      list.push(t);
      teamsByMatch.set(t.matchId, list);
    }
    for (const p of players) {
      const list = playersByMatch.get(p.matchId) ?? [];
      list.push(p);
      playersByMatch.set(p.matchId, list);
    }

    return matchIds
      .filter(id => matchMap.has(id))
      .map(id => this.buildMatchResponse(
        matchMap.get(id)!,
        teamsByMatch.get(id) ?? [],
        playersByMatch.get(id) ?? [],
        userId,
      ));
  }

  private buildMatchResponse(
    match: GameMatchFull,
    teams: Team[],
    allPlayers: MatchPlayerFull[],
    userId?: string,
  ): MatchResponseDto {
    const playersByTeam = new Map<string, MatchPlayerFull[]>();
    for (const mp of allPlayers) {
      const list = playersByTeam.get(mp.teamId) ?? [];
      list.push(mp);
      playersByTeam.set(mp.teamId, list);
    }

    const myMp = userId ? allPlayers.find(p => p.userId === userId) : undefined;

    const teamDetails: TeamDetailDto[] = teams.map(t => {
      const players: PlayerInTeamDto[] = (playersByTeam.get(t.id) ?? []).map(mp => ({
        userId:      mp.userId,
        displayName: mp.user?.displayName ?? '',
        avatarUrl:   mp.user?.avatarUrl,
        joinedAt:    mp.joinedAt?.toISOString(),
        killCount:   null,
        deathCount:  null,
      }));

      return {
        id:          t.id,
        name:        t.name,
        colorHex:    t.colorHex,
        objectives:  t.objectives,
        respawnBase: t.respawnBase,
        isWinner:    t.id === match.winningTeamId,
        players,
      };
    });

    const durationSeconds =
      match.startedAt && match.endedAt
        ? Math.floor((match.endedAt.getTime() - match.startedAt.getTime()) / 1000)
        : null;

    const winningTeam = match.winningTeamId
      ? teams.find(t => t.id === match.winningTeamId)
      : undefined;

    return {
      id:              match.id,
      fieldId:         match.fieldId,
      fieldName:       match.field?.name ?? '',
      gameModeId:      match.gameModeId,
      gameModeName:    match.gameMode?.name ?? '',
      status:          match.status,
      maxPlayers:      match.maxPlayers,
      playerCount:     allPlayers.length,
      startedAt:       match.startedAt?.toISOString() ?? null,
      endedAt:         match.endedAt?.toISOString() ?? null,
      winningTeamId:   match.winningTeamId,
      winningTeamName: winningTeam?.name ?? null,
      durationSeconds,
      myTeamId:        myMp?.teamId ?? null,
      canJoin:         match.status === 'WAITING',
      teams:           teamDetails,
      result:          null,
    };
  }

  private async updatePlayerStats(match: GameMatch): Promise<void> {
    const players = await this.dataSource.query<{ user_id: string; team_id: string }[]>(
      `SELECT user_id, team_id FROM match_players WHERE match_id = $1`,
      [match.id],
    );
    if (!players.length) return;

    // Single bulk upsert using UNNEST — N sequential queries → 1 query
    const userIds  = players.map(p => p.user_id);
    const wins     = players.map(p => match.winningTeamId === null ? 0 : (match.winningTeamId === p.team_id ? 1 : 0));
    const losses   = players.map(p => match.winningTeamId !== null && match.winningTeamId !== p.team_id ? 1 : 0);
    const draws    = players.map(p => match.winningTeamId === null ? 1 : 0);

    await this.dataSource.query(
      `INSERT INTO player_stats (user_id, total_matches, wins, losses, draws, total_kills, total_deaths, updated_at)
       SELECT unnest($1::uuid[]), 1, unnest($2::int[]), unnest($3::int[]), unnest($4::int[]), 0, 0, NOW()
       ON CONFLICT (user_id) DO UPDATE SET
         total_matches = player_stats.total_matches + 1,
         wins    = player_stats.wins    + EXCLUDED.wins,
         losses  = player_stats.losses  + EXCLUDED.losses,
         draws   = player_stats.draws   + EXCLUDED.draws,
         updated_at = NOW()`,
      [userIds, wins, losses, draws],
    );
  }
}
