import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WsGateway } from './ws.gateway';
import { MatchEventPublisher } from './match-event.publisher';
import { JwtUtil } from '../common/utils/jwt.util';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),   // grants DataSource injection in this module
    forwardRef(() => MatchesModule),
  ],
  providers: [WsGateway, MatchEventPublisher, JwtUtil],
  exports: [MatchEventPublisher],
})
export class WsModule {}
