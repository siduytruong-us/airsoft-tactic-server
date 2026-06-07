import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../database/entities/event.entity';
import { Rsvp } from '../database/entities/rsvp.entity';
import { Field } from '../database/entities/field.entity';
import { User } from '../database/entities/user.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtUtil } from '../common/utils/jwt.util';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Rsvp, Field, User])],
  providers: [EventsService, JwtAuthGuard, AdminGuard, JwtUtil],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
