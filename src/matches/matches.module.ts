import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GameMatch } from '../database/entities/game-match.entity';
import { Team } from '../database/entities/team.entity';
import { MatchPlayer } from '../database/entities/match-player.entity';
import { HitEvent } from '../database/entities/hit-event.entity';
import { PingEvent } from '../database/entities/ping-event.entity';
import { Field } from '../database/entities/field.entity';
import { GameMode } from '../database/entities/game-mode.entity';
import { User } from '../database/entities/user.entity';
import { PlayerStats } from '../database/entities/player-stats.entity';

import { WsModule } from '../websocket/ws.module';
import { JwtUtil } from '../common/utils/jwt.util';

import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { AreasService } from './areas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameMatch,
      Team,
      MatchPlayer,
      HitEvent,
      PingEvent,
      Field,
      GameMode,
      User,
      PlayerStats,
    ]),
    forwardRef(() => WsModule),  // circular: WsGateway ↔ MatchesService
  ],
  controllers: [MatchesController],
  providers: [MatchesService, AreasService, JwtUtil],
  exports: [MatchesService],   // WsGateway và AdminModule cần inject
})
export class MatchesModule {}
