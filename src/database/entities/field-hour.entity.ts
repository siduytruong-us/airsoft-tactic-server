import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Field } from './field.entity';

@Entity({ name: 'field_hours' })
export class FieldHour {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'field_id', type: 'uuid' })
  fieldId!: string;

  @ManyToOne(() => Field, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'field_id' })
  field!: Field;

  // 0=Sunday, 1=Monday, ..., 6=Saturday
  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek!: number;

  @Column({ name: 'open_time', type: 'time', nullable: true })
  openTime!: string | null;

  @Column({ name: 'close_time', type: 'time', nullable: true })
  closeTime!: string | null;

  @Column({ name: 'is_closed', type: 'boolean', default: false })
  isClosed!: boolean;
}
