import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { PlayerStats } from '../database/entities/player-stats.entity';
import { DeviceToken } from '../database/entities/device-token.entity';
import { MatchPlayer } from '../database/entities/match-player.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  UserResponseDto,
  StatsResponseDto,
} from './dto/user-response.dto';
import { PaginatedResponseDto } from './dto/pagination.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PlayerStats)
    private readonly statsRepo: Repository<PlayerStats>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayerRepo: Repository<MatchPlayer>,
  ) {}

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const stats = await this.statsRepo.findOne({ where: { userId } });
    return this.toUserResponse(user, stats ?? null);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }
    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl;
    }
    const saved = await this.userRepo.save(user);
    return this.toUserResponse(saved, null);
  }

  async upsertDeviceToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android',
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete existing token for same user+platform
    await this.deviceTokenRepo.delete({ userId, platform });

    // Insert new token
    const deviceToken = this.deviceTokenRepo.create({
      userId,
      token,
      platform,
    });
    await this.deviceTokenRepo.save(deviceToken);
    this.logger.log(`Upserted device token for user=${userId} platform=${platform}`);
  }

  async getStats(userId: string): Promise<StatsResponseDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const stats = await this.statsRepo.findOne({ where: { userId } });
    return this.buildStats(userId, user.displayName, stats ?? null);
  }

  async getMyMatches(
    userId: string,
    page: number,
    size: number,
  ): Promise<PaginatedResponseDto<unknown>> {
    // Find match_players for this user, join game_matches where status=ENDED
    const [matchPlayers, total] = await this.matchPlayerRepo
      .createQueryBuilder('mp')
      .innerJoinAndSelect('mp.match', 'gm')
      .innerJoinAndSelect('mp.team', 'team')
      .where('mp.userId = :userId', { userId })
      .andWhere('gm.status = :status', { status: 'ENDED' })
      .orderBy('gm.endedAt', 'DESC')
      .skip(page * size)
      .take(size)
      .getManyAndCount();

    const content = matchPlayers.map((mp) => ({
      matchId: mp.match?.id,
      status: mp.match?.status,
      teamId: mp.teamId,
      teamName: mp.team?.name,
      joinedAt: mp.joinedAt?.toISOString(),
    }));

    const totalPages = Math.ceil(total / size);
    return {
      content,
      page,
      size,
      totalElements: total,
      totalPages,
      last: page >= totalPages - 1,
    };
  }

  private toUserResponse(user: User, stats: PlayerStats | null): UserResponseDto {
    const total = stats?.totalMatches ?? 0;
    const wins = stats?.wins ?? 0;
    const winRate = total > 0 ? Math.round((wins / total) * 1000) / 1000 : 0;

    return {
      id: user.id,
      displayName: user.displayName ?? undefined,
      email: user.email ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      role: user.role ?? undefined,
      createdAt: user.createdAt?.toISOString(),
      lastSeenAt: user.lastSeenAt?.toISOString(),
      stats: stats
        ? {
            userId: user.id,
            displayName: user.displayName ?? undefined,
            totalMatches: stats.totalMatches,
            wins: stats.wins,
            losses: stats.losses,
            draws: stats.draws,
            winRate,
            totalKills: stats.totalKills,
            totalDeaths: stats.totalDeaths,
            updatedAt: stats.updatedAt?.toISOString(),
          }
        : undefined,
    };
  }

  private buildStats(
    userId: string,
    displayName: string | null | undefined,
    stats: PlayerStats | null,
  ): StatsResponseDto {
    const total = stats?.totalMatches ?? 0;
    const wins = stats?.wins ?? 0;
    const winRate = total > 0 ? Math.round((wins / total) * 1000) / 1000 : 0;
    return {
      userId,
      displayName: displayName ?? undefined,
      totalMatches: total,
      wins,
      losses: stats?.losses ?? 0,
      draws: stats?.draws ?? 0,
      winRate,
      totalKills: stats?.totalKills ?? 0,
      totalDeaths: stats?.totalDeaths ?? 0,
      updatedAt: stats?.updatedAt?.toISOString(),
    };
  }
}
