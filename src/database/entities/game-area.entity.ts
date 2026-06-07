import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GameMatch } from './game-match.entity';

/**
 * game_areas — PostGIS polygon stored as geometry(POLYGON, 4326).
 * Geometry column is NOT mapped here — use raw SQL via DataSource.query() for reads/writes.
 */
@Entity({ name: 'game_areas' })
export class GameArea {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => GameMatch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match!: GameMatch;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'color_hex', type: 'varchar', default: '#FF5733' })
  colorHex!: string;

  @Column({ name: 'area_type', type: 'varchar', default: 'ZONE' })
  areaType!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
