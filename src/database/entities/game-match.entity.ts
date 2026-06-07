import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Field } from './field.entity';
import { GameMode } from './game-mode.entity';

@Entity({ name: 'game_matches' })
export class GameMatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Field, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'field_id' })
  field!: Field;

  @Column({ name: 'field_id', type: 'uuid' })
  fieldId!: string;

  @ManyToOne(() => GameMode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_mode_id' })
  gameMode!: GameMode;

  @Column({ name: 'game_mode_id', type: 'uuid' })
  gameModeId!: string;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  @Column({ name: 'created_by_display_name', type: 'varchar' })
  createdByDisplayName!: string;

  @Column({ type: 'varchar', default: 'WAITING' })
  status!: string;

  @Column({ name: 'max_players', type: 'int', default: 20 })
  maxPlayers!: number;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ name: 'winning_team_id', type: 'uuid', nullable: true })
  winningTeamId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
