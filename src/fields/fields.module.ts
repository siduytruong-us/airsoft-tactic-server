import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Field } from '../database/entities/field.entity';
import { GameMode } from '../database/entities/game-mode.entity';
import { GameMatch } from '../database/entities/game-match.entity';
import { Team } from '../database/entities/team.entity';
import { MatchPlayer } from '../database/entities/match-player.entity';
import { GameMap } from '../database/entities/map.entity';
import { FieldHour } from '../database/entities/field-hour.entity';
import { FieldsService } from './fields.service';
import { FieldsController } from './fields.controller';
import { MapsPublicController } from './maps-public.controller';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { JwtUtil } from '../common/utils/jwt.util';

@Module({
  imports: [
    TypeOrmModule.forFeature([Field, GameMode, GameMatch, Team, MatchPlayer, GameMap, FieldHour]),
  ],
  providers: [FieldsService, JwtAuthGuard, JwtUtil],
  controllers: [FieldsController, MapsPublicController],
  exports: [FieldsService],
})
export class FieldsModule {}
