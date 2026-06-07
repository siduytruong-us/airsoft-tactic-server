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

/**
 * ping_events — PostGIS point stored as geometry(POINT, 4326).
 * Geometry column is NOT mapped here — use raw SQL via DataSource.query() for spatial queries.
 */
@Entity({ name: 'ping_events' })
export class PingEvent {
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

  @Column({ name: 'latitude', type: 'float8' })
  latitude!: number;

  @Column({ name: 'longitude', type: 'float8' })
  longitude!: number;

  @Column({ name: 'ping_type', type: 'varchar' })
  pingType!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
