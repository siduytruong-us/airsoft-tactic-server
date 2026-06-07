import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Field } from '../database/entities/field.entity';
import { GameMode } from '../database/entities/game-mode.entity';
import { GameMatch } from '../database/entities/game-match.entity';
import { Team } from '../database/entities/team.entity';
import { User } from '../database/entities/user.entity';
import { MatchPlayer } from '../database/entities/match-player.entity';
import { PlayerStats } from '../database/entities/player-stats.entity';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { CreateGameModeDto } from './dto/create-game-mode.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AdminStatsDto } from './dto/admin-stats.dto';

const TEAM_NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'];
const TEAM_COLORS = ['#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899'];

export interface FieldResponseDto {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  coverImageUrl: string | null;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  createdAt: Date;
}

export interface GameModeResponseDto {
  id: string;
  fieldId: string;
  name: string;
  description: string | null;
  rules: string[] | null;
  maxPlayers: number;
  teamCount: number;
  respawnEnabled: boolean;
  respawnDelaySeconds: number;
  createdAt: Date;
}

export interface MatchResponseDto {
  id: string;
  fieldId: string;
  gameModeId: string;
  createdById: string;
  createdByDisplayName: string;
  status: string;
  maxPlayers: number;
  startedAt: Date | null;
  endedAt: Date | null;
  winningTeamId: string | null;
  createdAt: Date;
}

export interface UserSummaryDto {
  id: string;
  displayName: string;
  email: string | null;
  role: string;
  createdAt: Date;
}

export interface PageResponseDto<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface CreateMatchDto {
  fieldId: string;
  gameModeId: string;
  maxPlayers?: number;
}

export interface EndMatchDto {
  winningTeamId?: string;
}

@Injectable()
export class AdminManagementService {
  private readonly logger = new Logger(AdminManagementService.name);

  constructor(
    @InjectRepository(Field)
    private readonly fieldRepo: Repository<Field>,
    @InjectRepository(GameMode)
    private readonly gameModeRepo: Repository<GameMode>,
    @InjectRepository(GameMatch)
    private readonly matchRepo: Repository<GameMatch>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayerRepo: Repository<MatchPlayer>,
    @InjectRepository(PlayerStats)
    private readonly playerStatsRepo: Repository<PlayerStats>,
  ) {}

  // ── Fields ──────────────────────────────────────────────────────────

  async getFields(): Promise<FieldResponseDto[]> {
    const fields = await this.fieldRepo.find({ order: { createdAt: 'DESC' } });
    return fields.map((f) => this.toFieldDto(f));
  }

  async createField(dto: CreateFieldDto): Promise<FieldResponseDto> {
    const field = this.fieldRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      location: dto.location,
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      coverImageUrl: dto.coverImageUrl ?? null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.fieldRepo.save(field);
    return this.toFieldDto(saved);
  }

  async getField(fieldId: string): Promise<FieldResponseDto> {
    const field = await this.fieldRepo.findOne({ where: { id: fieldId } });
    if (!field) throw new NotFoundException(`Field not found: ${fieldId}`);
    return this.toFieldDto(field);
  }

  async updateField(fieldId: string, dto: UpdateFieldDto): Promise<FieldResponseDto> {
    const field = await this.fieldRepo.findOne({ where: { id: fieldId } });
    if (!field) throw new NotFoundException(`Field not found: ${fieldId}`);

    if (dto.name !== undefined) field.name = dto.name;
    if (dto.description !== undefined) field.description = dto.description ?? null;
    if (dto.location !== undefined) field.location = dto.location ?? null;
    if (dto.lat !== undefined) field.lat = dto.lat ?? null;
    if (dto.lng !== undefined) field.lng = dto.lng ?? null;
    if (dto.coverImageUrl !== undefined) field.coverImageUrl = dto.coverImageUrl ?? null;
    if (dto.isActive !== undefined) field.isActive = dto.isActive;

    const saved = await this.fieldRepo.save(field);
    return this.toFieldDto(saved);
  }

  async deleteField(fieldId: string): Promise<void> {
    const field = await this.fieldRepo.findOne({ where: { id: fieldId } });
    if (!field) throw new NotFoundException(`Field not found: ${fieldId}`);
    field.isActive = false;
    await this.fieldRepo.save(field);
  }

  // ── Game Modes ───────────────────────────────────────────────────────

  async createGameMode(fieldId: string, dto: CreateGameModeDto): Promise<GameModeResponseDto> {
    const field = await this.fieldRepo.findOne({ where: { id: fieldId } });
    if (!field) throw new NotFoundException(`Field not found: ${fieldId}`);

    const gm = this.gameModeRepo.create({
      fieldId,
      field,
      name: dto.name,
      description: dto.description ?? null,
      rules: dto.rules ?? null,
      maxPlayers: dto.maxPlayers,
      teamCount: dto.teamCount,
      respawnEnabled: dto.respawnEnabled ?? true,
      respawnDelaySeconds: dto.respawnDelaySeconds ?? 30,
    });
    const saved = await this.gameModeRepo.save(gm);
    return this.toGameModeDto(saved);
  }

  async deleteGameMode(gameModeId: string): Promise<void> {
    const gm = await this.gameModeRepo.findOne({ where: { id: gameModeId } });
    if (!gm) throw new NotFoundException(`GameMode not found: ${gameModeId}`);
    await this.gameModeRepo.delete({ id: gameModeId });
  }

  async getMatchesByField(fieldId: string): Promise<MatchResponseDto[]> {
    const matches = await this.matchRepo.find({ where: { fieldId } });
    return matches.map((m) => this.toMatchDto(m));
  }

  // ── Matches ──────────────────────────────────────────────────────────

  async createMatch(
    adminId: string,
    adminDisplayName: string,
    dto: CreateMatchDto,
  ): Promise<MatchResponseDto> {
    const field = await this.fieldRepo.findOne({ where: { id: dto.fieldId } });
    if (!field) throw new NotFoundException(`Field not found: ${dto.fieldId}`);

    const gameMode = await this.gameModeRepo.findOne({ where: { id: dto.gameModeId } });
    if (!gameMode) throw new NotFoundException(`GameMode not found: ${dto.gameModeId}`);

    const match = this.matchRepo.create({
      fieldId: dto.fieldId,
      field,
      gameModeId: dto.gameModeId,
      gameMode,
      createdById: adminId,
      createdByDisplayName: adminDisplayName,
      status: 'WAITING',
      maxPlayers: dto.maxPlayers ?? gameMode.maxPlayers,
    });
    const savedMatch = await this.matchRepo.save(match);

    // Auto-create N teams
    const teamCount = Math.min(gameMode.teamCount, TEAM_NAMES.length);
    const teams = Array.from({ length: teamCount }, (_, i) =>
      this.teamRepo.create({
        matchId: savedMatch.id,
        match: savedMatch,
        name: TEAM_NAMES[i],
        colorHex: TEAM_COLORS[i],
      }),
    );
    await this.teamRepo.save(teams);

    return this.toMatchDto(savedMatch);
  }

  async startMatch(matchId: string): Promise<MatchResponseDto> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException(`Match not found: ${matchId}`);

    if (match.status !== 'WAITING') {
      throw new UnprocessableEntityException('Match is not in WAITING status');
    }

    match.status = 'IN_PROGRESS';
    match.startedAt = new Date();
    const saved = await this.matchRepo.save(match);
    return this.toMatchDto(saved);
  }

  async endMatch(matchId: string, winningTeamId?: string): Promise<MatchResponseDto> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException(`Match not found: ${matchId}`);

    if (match.status !== 'IN_PROGRESS') {
      throw new UnprocessableEntityException('Match is not IN_PROGRESS');
    }

    match.status = 'ENDED';
    match.endedAt = new Date();
    match.winningTeamId = winningTeamId ?? null;
    const saved = await this.matchRepo.save(match);

    // Async stats update — do not block response
    setImmediate(() => {
      this.updatePlayerStats(matchId).catch((err: unknown) =>
        this.logger.error(`updatePlayerStats failed for match ${matchId}: ${String(err)}`),
      );
    });

    return this.toMatchDto(saved);
  }

  // ── Users ─────────────────────────────────────────────────────────────

  async getUsers(page: number, size: number): Promise<PageResponseDto<UserSummaryDto>> {
    const [users, total] = await this.userRepo.findAndCount({
      skip: page * size,
      take: size,
      order: { createdAt: 'DESC' },
    });

    return {
      content: users.map((u) => this.toUserSummaryDto(u)),
      totalElements: total,
      totalPages: Math.ceil(total / size),
      page,
      size,
    };
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto): Promise<UserSummaryDto> {
    const validRoles = new Set(['player', 'admin']);
    if (!validRoles.has(dto.role)) {
      throw new UnprocessableEntityException(`Invalid role: ${dto.role}`);
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User not found: ${userId}`);

    user.role = dto.role;
    const saved = await this.userRepo.save(user);
    return this.toUserSummaryDto(saved);
  }

  // ── Stats ─────────────────────────────────────────────────────────────

  async getAdminStats(): Promise<AdminStatsDto> {
    const [totalUsers, totalFields, totalMatches, activeFields] = await Promise.all([
      this.userRepo.count(),
      this.fieldRepo.count(),
      this.matchRepo.count(),
      this.fieldRepo.count({ where: { isActive: true } }),
    ]);

    return { totalUsers, totalFields, activeFields, totalMatches };
  }

  // ── Player Stats Update ───────────────────────────────────────────────

  async updatePlayerStats(matchId: string): Promise<void> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) return;

    const players = await this.matchPlayerRepo.find({
      where: { matchId },
    });

    for (const mp of players) {
      const stats = await this.playerStatsRepo.findOne({
        where: { userId: mp.userId },
      });

      const record = stats ??
        this.playerStatsRepo.create({
          userId: mp.userId,
          totalMatches: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          totalKills: 0,
          totalDeaths: 0,
        });

      record.totalMatches += 1;

      if (match.winningTeamId === null) {
        record.draws += 1;
      } else if (match.winningTeamId === mp.teamId) {
        record.wins += 1;
      } else {
        record.losses += 1;
      }

      await this.playerStatsRepo.save(record);
    }

    this.logger.log(`Player stats updated for match ${matchId}`);
  }

  // ── Mappers ──────────────────────────────────────────────────────────

  private toFieldDto(f: Field): FieldResponseDto {
    return {
      id: f.id,
      name: f.name,
      description: f.description,
      location: f.location,
      coverImageUrl: f.coverImageUrl,
      lat: f.lat,
      lng: f.lng,
      isActive: f.isActive,
      createdAt: f.createdAt,
    };
  }

  private toGameModeDto(gm: GameMode): GameModeResponseDto {
    return {
      id: gm.id,
      fieldId: gm.fieldId,
      name: gm.name,
      description: gm.description,
      rules: gm.rules,
      maxPlayers: gm.maxPlayers,
      teamCount: gm.teamCount,
      respawnEnabled: gm.respawnEnabled,
      respawnDelaySeconds: gm.respawnDelaySeconds,
      createdAt: gm.createdAt,
    };
  }

  private toMatchDto(m: GameMatch): MatchResponseDto {
    return {
      id: m.id,
      fieldId: m.fieldId,
      gameModeId: m.gameModeId,
      createdById: m.createdById,
      createdByDisplayName: m.createdByDisplayName,
      status: m.status,
      maxPlayers: m.maxPlayers,
      startedAt: m.startedAt,
      endedAt: m.endedAt,
      winningTeamId: m.winningTeamId,
      createdAt: m.createdAt,
    };
  }

  private toUserSummaryDto(u: User): UserSummaryDto {
    return {
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    };
  }
}
