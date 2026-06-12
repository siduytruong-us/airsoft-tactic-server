import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Field } from '../database/entities/field.entity';
import { GameMode } from '../database/entities/game-mode.entity';
import { GameMatch } from '../database/entities/game-match.entity';
import { Team } from '../database/entities/team.entity';
import { MatchPlayer } from '../database/entities/match-player.entity';
import { FieldHour } from '../database/entities/field-hour.entity';
import {
  FieldResponseDto,
  GameModeResponseDto,
  MatchSummaryDto,
  OpeningHourDto,
  TeamSummaryDto,
} from './dto/field-response.dto';

@Injectable()
export class FieldsService {
  private readonly logger = new Logger(FieldsService.name);

  constructor(
    @InjectRepository(Field)
    private readonly fieldRepo: Repository<Field>,
    @InjectRepository(GameMode)
    private readonly gameModeRepo: Repository<GameMode>,
    @InjectRepository(GameMatch)
    private readonly gameMatchRepo: Repository<GameMatch>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayerRepo: Repository<MatchPlayer>,
    @InjectRepository(FieldHour)
    private readonly fieldHourRepo: Repository<FieldHour>,
  ) {}

  async getFields(page: number, size: number): Promise<{
    content: FieldResponseDto[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
  }> {
    const [fields, total] = await this.fieldRepo.findAndCount({
      where: { isActive: true },
      order: { name: 'ASC' },
      skip: page * size,
      take: size,
    });
    const content = await Promise.all(fields.map((f) => this.toSummary(f)));
    const totalPages = Math.max(1, Math.ceil(total / size));
    return {
      content,
      page,
      size,
      totalElements: total,
      totalPages,
      last: page >= totalPages - 1,
    };
  }

  async getField(fieldId: string): Promise<FieldResponseDto> {
    const field = await this.fieldRepo.findOne({ where: { id: fieldId } });
    if (!field) {
      throw new NotFoundException(`Field not found: ${fieldId}`);
    }
    return this.toDetail(field);
  }

  async getLiveFields(): Promise<FieldResponseDto[]> {
    // Fields that have a match currently IN_PROGRESS
    const fields = await this.fieldRepo
      .createQueryBuilder('f')
      .innerJoin('game_matches', 'gm', 'gm.field_id = f.id AND gm.status = :status', {
        status: 'IN_PROGRESS',
      })
      .where('f.is_active = true')
      .getMany();

    return Promise.all(fields.map((f) => this.toDetail(f)));
  }

  private async findActiveMatch(fieldId: string): Promise<GameMatch | null> {
    // Prefer IN_PROGRESS, fallback to WAITING
    const inProgress = await this.gameMatchRepo.findOne({
      where: { fieldId, status: 'IN_PROGRESS' },
      order: { createdAt: 'DESC' },
    });
    if (inProgress) return inProgress;
    return this.gameMatchRepo.findOne({
      where: { fieldId, status: 'WAITING' },
      order: { createdAt: 'DESC' },
    });
  }

  private async toSummary(field: Field): Promise<FieldResponseDto> {
    const activeMatch = await this.findActiveMatch(field.id);
    const gameModes = await this.gameModeRepo.find({
      where: { fieldId: field.id },
    });

    return {
      id: field.id,
      name: field.name,
      location: field.location ?? undefined,
      lat: field.lat ?? undefined,
      lng: field.lng ?? undefined,
      coverImageUrl: field.coverImageUrl ?? undefined,
      description: undefined,
      isLive: activeMatch?.status === 'IN_PROGRESS',
      activeMatchId: activeMatch?.id ?? undefined,
      gameModes: gameModes.map(this.toGameModeDto),
      currentGame: undefined,
      phone: field.phone,
      website: field.website,
      minAge: field.minAge,
      entryFee: field.entryFee !== null ? Number(field.entryFee) : null,
      entryFeeCurrency: field.entryFeeCurrency,
      rentalAvailable: field.rentalAvailable,
      isVerified: field.isVerified,
    };
  }

  private async toDetail(field: Field): Promise<FieldResponseDto> {
    const activeMatch = await this.findActiveMatch(field.id);
    const gameModes = await this.gameModeRepo.find({
      where: { fieldId: field.id },
    });

    let currentGame: MatchSummaryDto | undefined;
    if (activeMatch) {
      const gameMode = await this.gameModeRepo.findOne({
        where: { id: activeMatch.gameModeId },
      });
      const teams = await this.teamRepo.find({
        where: { matchId: activeMatch.id },
      });
      const matchPlayers = await this.matchPlayerRepo.find({
        where: { matchId: activeMatch.id },
      });

      const teamSummaries: TeamSummaryDto[] = teams.map((t) => ({
        id: t.id,
        name: t.name,
        colorHex: t.colorHex ?? undefined,
        playerCount: matchPlayers.filter((mp) => mp.teamId === t.id).length,
      }));

      currentGame = {
        id: activeMatch.id,
        status: activeMatch.status,
        gameModeName: gameMode?.name ?? '',
        playerCount: matchPlayers.length,
        maxPlayers: activeMatch.maxPlayers,
        teams: teamSummaries,
      };
    }

    const hours = await this.fieldHourRepo.find({
      where: { fieldId: field.id },
      order: { dayOfWeek: 'ASC' },
    });

    const openingHours: OpeningHourDto[] = hours.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      openTime: h.openTime ? h.openTime.substring(0, 5) : null,
      closeTime: h.closeTime ? h.closeTime.substring(0, 5) : null,
      isClosed: h.isClosed,
    }));

    return {
      id: field.id,
      name: field.name,
      location: field.location ?? undefined,
      lat: field.lat ?? undefined,
      lng: field.lng ?? undefined,
      coverImageUrl: field.coverImageUrl ?? undefined,
      description: field.description ?? undefined,
      isLive: activeMatch?.status === 'IN_PROGRESS',
      activeMatchId: activeMatch?.id ?? undefined,
      gameModes: gameModes.map(this.toGameModeDto),
      currentGame,
      openingHours,
      phone: field.phone,
      website: field.website,
      minAge: field.minAge,
      entryFee: field.entryFee !== null ? Number(field.entryFee) : null,
      entryFeeCurrency: field.entryFeeCurrency,
      rentalAvailable: field.rentalAvailable,
      isVerified: field.isVerified,
    };
  }

  private toGameModeDto(gm: GameMode): GameModeResponseDto {
    return {
      id: gm.id,
      name: gm.name,
      description: gm.description ?? undefined,
      rules: gm.rules ?? undefined,
    };
  }
}
