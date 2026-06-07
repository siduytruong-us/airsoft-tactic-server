import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('v1/events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async getEvents(@CurrentUser() user: RequestUser) {
    return this.eventsService.getEvents(user.userId);
  }

  @Get(':id')
  async getEvent(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.getEvent(id, user.userId);
  }

  @Post()
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  async createEvent(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.createEvent(dto, user.userId);
  }

  @Post(':id/rsvp')
  @HttpCode(HttpStatus.CREATED)
  async rsvp(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<null> {
    await this.eventsService.rsvp(id, user.userId);
    return null;
  }

  @Delete(':id/rsvp')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelRsvp(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.eventsService.cancelRsvp(id, user.userId);
  }
}
