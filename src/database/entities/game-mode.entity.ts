import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Field } from './field.entity';

@Entity({ name: 'game_modes' })
export class GameMode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Field, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'field_id' })
  field!: Field;

  @Column({ name: 'field_id', type: 'uuid' })
  fieldId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  rules!: string[] | null;

  @Column({ name: 'max_players', type: 'int', default: 20 })
  maxPlayers!: number;

  @Column({ name: 'team_count', type: 'int', default: 2 })
  teamCount!: number;

  @Column({ name: 'respawn_enabled', type: 'boolean', default: true })
  respawnEnabled!: boolean;

  @Column({ name: 'respawn_delay_seconds', type: 'int', default: 30 })
  respawnDelaySeconds!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
