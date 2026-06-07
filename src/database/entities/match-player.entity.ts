import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GameMatch } from './game-match.entity';
import { Team } from './team.entity';
import { User } from './user.entity';

@Entity({ name: 'match_players' })
export class MatchPlayer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => GameMatch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match!: GameMatch;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId!: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt!: Date;
}
