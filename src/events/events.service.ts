import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../database/entities/event.entity';
import { Rsvp } from '../database/entities/rsvp.entity';
import { Field } from '../database/entities/field.entity';
import { EventResponseDto } from './dto/event-response.dto';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Rsvp)
    private readonly rsvpRepo: Repository<Rsvp>,
    @InjectRepository(Field)
    private readonly fieldRepo: Repository<Field>,
  ) {}

  async getEvents(userId?: string): Promise<EventResponseDto[]> {
    const events = await this.eventRepo.find({
      relations: ['field', 'organizer'],
      order: { startTime: 'ASC' },
    });
    return Promise.all(events.map((e) => this.toResponse(e, userId)));
  }

  async getEvent(eventId: string, userId?: string): Promise<EventResponseDto> {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['field', 'organizer'],
    });
    if (!event) {
      throw new NotFoundException(`Event not found: ${eventId}`);
    }
    return this.toResponse(event, userId);
  }

  async createEvent(dto: CreateEventDto, organizerId: string): Promise<EventResponseDto> {
    // field_id is NOT NULL in DB — always required
    const field = await this.fieldRepo.findOne({ where: { id: dto.fieldId } });
    if (!field) {
      throw new NotFoundException('Field not found');
    }

    const event = this.eventRepo.create({
      title: dto.name,
      description: dto.description,
      fieldId: dto.fieldId,
      organizerId,
      startTime: new Date(dto.startAt),
      endTime: new Date(dto.endAt),
      maxCapacity: dto.maxCapacity ?? 40,
      status: 'upcoming',
    });

    const saved = await this.eventRepo.save(event);
    // reload with relations
    const loaded = await this.eventRepo.findOne({
      where: { id: saved.id },
      relations: ['field', 'organizer'],
    });
    if (!loaded) {
      throw new NotFoundException('Event not found after creation');
    }
    return this.toResponse(loaded, organizerId);
  }

  async rsvp(eventId: string, userId: string): Promise<void> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event not found: ${eventId}`);
    }
    if (event.status !== 'upcoming') {
      throw new UnprocessableEntityException('Event is not upcoming');
    }

    const alreadyRsvped = await this.rsvpRepo.findOne({
      where: { eventId, userId },
    });
    if (alreadyRsvped) {
      throw new ConflictException('Already RSVPed to this event');
    }

    const rsvpCount = await this.rsvpRepo.count({ where: { eventId } });
    if (event.maxCapacity && rsvpCount >= event.maxCapacity) {
      throw new UnprocessableEntityException('Event is at full capacity');
    }

    const rsvp = this.rsvpRepo.create({ eventId, userId });
    await this.rsvpRepo.save(rsvp);
    this.logger.log(`User ${userId} RSVPed to event ${eventId}`);
  }

  async cancelRsvp(eventId: string, userId: string): Promise<void> {
    const rsvp = await this.rsvpRepo.findOne({ where: { eventId, userId } });
    if (!rsvp) {
      throw new NotFoundException('RSVP not found');
    }
    await this.rsvpRepo.remove(rsvp);
    this.logger.log(`User ${userId} cancelled RSVP for event ${eventId}`);
  }

  private async toResponse(event: Event, userId?: string): Promise<EventResponseDto> {
    const rsvpCount = await this.rsvpRepo.count({ where: { eventId: event.id } });
    const isRsvped = userId
      ? !!(await this.rsvpRepo.findOne({ where: { eventId: event.id, userId } }))
      : false;

    return {
      id: event.id,
      title: event.title,
      description: event.description ?? undefined,
      fieldId: event.field?.id ?? event.fieldId ?? '',
      fieldName: event.field?.name ?? '',
      organizerId: event.organizer?.id ?? event.organizerId ?? '',
      organizerName: event.organizer?.displayName ?? '',
      startTime: event.startTime?.toISOString() ?? '',
      endTime: event.endTime?.toISOString() ?? '',
      maxCapacity: event.maxCapacity ?? undefined,
      rsvpCount,
      status: event.status,
      isRsvped,
    };
  }
}
