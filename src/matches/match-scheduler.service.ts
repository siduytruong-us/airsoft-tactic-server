import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameMatch } from '../database/entities/game-match.entity';
import { MatchesService } from './matches.service';

@Injectable()
export class MatchSchedulerService {
  private readonly logger = new Logger(MatchSchedulerService.name);

  constructor(
    @InjectRepository(GameMatch)
    private readonly matchRepo: Repository<GameMatch>,
    private readonly matchesService: MatchesService,
  ) {}

  @Cron('0 * * * * *') // every minute
  async autoEndExpiredMatches(): Promise<void> {
    // Use raw SQL to find IN_PROGRESS matches with scheduledEndAt <= NOW() (and not null)
    const expiredMatches = await this.matchRepo.query(
      `SELECT id FROM game_matches
       WHERE status = 'IN_PROGRESS'
         AND scheduled_end_at IS NOT NULL
         AND scheduled_end_at <= NOW()`,
    ) as { id: string }[];

    if (!expiredMatches.length) return;

    this.logger.log(`Auto-ending ${expiredMatches.length} expired match(es)`);

    for (const match of expiredMatches) {
      try {
        await this.matchesService.endMatch(match.id, 'scheduler', { winningTeamId: undefined });
      } catch (err: unknown) {
        this.logger.error(
          `Failed to auto-end match ${match.id}: ${String(err)}`,
        );
      }
    }
  }
}
