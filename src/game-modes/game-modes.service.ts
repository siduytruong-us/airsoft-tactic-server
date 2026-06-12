import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameMode } from '../database/entities/game-mode.entity';

export interface GameModeDto {
  id: string;
  name: string;
  description?: string;
  rules?: string[];
}

@Injectable()
export class GameModesService {
  private readonly logger = new Logger(GameModesService.name);

  constructor(
    @InjectRepository(GameMode)
    private readonly gameModeRepo: Repository<GameMode>,
  ) {}

  async getAll(): Promise<GameModeDto[]> {
    const modes = await this.gameModeRepo.find();
    return modes.map(this.toDto);
  }

  async getByField(fieldId: string): Promise<GameModeDto[]> {
    const modes = await this.gameModeRepo.find({ where: { fieldId } });
    return modes.map(this.toDto);
  }

  private toDto(gm: GameMode): GameModeDto {
    return {
      id: gm.id,
      name: gm.name,
      description: gm.description ?? undefined,
      rules: gm.rules ?? undefined,
    };
  }
}
