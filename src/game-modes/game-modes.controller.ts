import { Controller, Get, Query } from '@nestjs/common';
import { GameModesService } from './game-modes.service';

@Controller('api/game-modes')
export class GameModesController {
  constructor(private readonly gameModesService: GameModesService) {}

  @Get()
  async getGameModes(@Query('fieldId') fieldId?: string) {
    if (fieldId) {
      return this.gameModesService.getByField(fieldId);
    }
    return this.gameModesService.getAll();
  }
}
