import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

import { WsModule } from './websocket/ws.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';
import { FieldsModule } from './fields/fields.module';
import { MatchesModule } from './matches/matches.module';
import { EventsModule } from './events/events.module';
import { GameModesModule } from './game-modes/game-modes.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    WsModule,
    AuthModule,
    AdminModule,
    UsersModule,
    FieldsModule,
    MatchesModule,
    EventsModule,
    GameModesModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global response wrapper
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // Global error handler
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
