import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GameMatch } from './game-match.entity';

@Entity({ name: 'teams' })
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => GameMatch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match!: GameMatch;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ name: 'color_hex', type: 'varchar', default: '#3B82F6' })
  colorHex!: string;

  @Column({ type: 'simple-array', nullable: true })
  objectives!: string[] | null;

  @Column({ name: 'respawn_base', type: 'varchar', nullable: true })
  respawnBase!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
