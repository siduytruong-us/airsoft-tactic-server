import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Field } from './field.entity';

@Entity({ name: 'maps' })
export class GameMap {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Field, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'field_id' })
  field!: Field | null;

  @Column({ name: 'field_id', type: 'uuid', nullable: true })
  fieldId!: string | null;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'cover_image_url', type: 'text', nullable: true })
  coverImageUrl!: string | null;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
