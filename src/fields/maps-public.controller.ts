import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { GameMap } from '../database/entities/map.entity';

interface PublicMapDto {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
}

/**
 * Public (player JWT) map endpoint.
 * Admin CRUD lives in MapsController under /v1/admin/maps/.
 */
@Controller('v1/maps')
@UseGuards(JwtAuthGuard)
export class MapsPublicController {
  constructor(
    @InjectRepository(GameMap)
    private readonly mapRepo: Repository<GameMap>,
  ) {}

  @Get(':id')
  async getMap(@Param('id') mapId: string): Promise<PublicMapDto> {
    const map = await this.mapRepo.findOne({ where: { id: mapId } });
    if (!map) throw new NotFoundException(`Map not found: ${mapId}`);
    return {
      id:            map.id,
      name:          map.name,
      description:   map.description,
      coverImageUrl: map.coverImageUrl,
    };
  }
}
