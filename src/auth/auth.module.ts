import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../database/entities/user.entity';
import { RefreshToken } from '../database/entities/refresh-token.entity';
import { PlayerStats } from '../database/entities/player-stats.entity';
import { JwtUtil } from '../common/utils/jwt.util';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken, PlayerStats])],
  controllers: [AuthController],
  providers: [AuthService, JwtUtil],
  exports: [AuthService],
})
export class AuthModule {}
