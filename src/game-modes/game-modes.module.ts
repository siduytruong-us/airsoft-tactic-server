import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameMode } from '../database/entities/game-mode.entity';
import { GameModesService } from './game-modes.service';
import { GameModesController } from './game-modes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GameMode])],
  providers: [GameModesService],
  controllers: [GameModesController],
  exports: [GameModesService],
})
export class GameModesModule {}
