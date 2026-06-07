import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { PlayerStats } from '../database/entities/player-stats.entity';
import { DeviceToken } from '../database/entities/device-token.entity';
import { MatchPlayer } from '../database/entities/match-player.entity';
import { Team } from '../database/entities/team.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { JwtUtil } from '../common/utils/jwt.util';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      PlayerStats,
      DeviceToken,
      MatchPlayer,
      Team,
    ]),
  ],
  providers: [UsersService, JwtAuthGuard, JwtUtil],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
