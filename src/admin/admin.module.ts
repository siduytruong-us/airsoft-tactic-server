import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuthController } from './admin-auth.controller';
import { AdminFieldController } from './admin-field.controller';
import { AdminUserController } from './admin-user.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminManagementService } from './admin-management.service';
import { MapsController } from './maps/maps.controller';
import { MapsService } from './maps/maps.service';
import { AdminAccount } from '../database/entities/admin-account.entity';
import { GameMatch } from '../database/entities/game-match.entity';
import { Team } from '../database/entities/team.entity';
import { Field } from '../database/entities/field.entity';
import { GameMode } from '../database/entities/game-mode.entity';
import { User } from '../database/entities/user.entity';
import { MatchPlayer } from '../database/entities/match-player.entity';
import { PlayerStats } from '../database/entities/player-stats.entity';
import { GameMap } from '../database/entities/map.entity';
import { MapArea } from '../database/entities/map-area.entity';
import { FieldHour } from '../database/entities/field-hour.entity';
import { JwtUtil } from '../common/utils/jwt.util';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminAccount,
      GameMatch,
      Team,
      Field,
      GameMode,
      User,
      MatchPlayer,
      PlayerStats,
      GameMap,
      MapArea,
      FieldHour,
    ]),
  ],
  controllers: [AdminAuthController, AdminFieldController, AdminUserController, MapsController],
  providers: [AdminAuthService, AdminManagementService, MapsService, JwtUtil],
  exports: [AdminManagementService],
})
export class AdminModule {}
