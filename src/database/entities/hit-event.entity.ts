import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GameMatch } from './game-match.entity';
import { User } from './user.entity';

@Entity({ name: 'hit_events' })
export class HitEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => GameMatch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match!: GameMatch;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @CreateDateColumn({ name: 'reported_at', type: 'timestamptz' })
  reportedAt!: Date;

  @Column({ name: 'respawn_at', type: 'timestamptz' })
  respawnAt!: Date;
}
