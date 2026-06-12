import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'fields' })
export class Field {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  location!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'cover_image_url', type: 'varchar', nullable: true })
  coverImageUrl!: string | null;

  @Column({ type: 'float8', nullable: true })
  lat!: number | null;

  @Column({ type: 'float8', nullable: true })
  lng!: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website!: string | null;

  @Column({ name: 'min_age', type: 'smallint', nullable: true })
  minAge!: number | null;

  @Column({ name: 'entry_fee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  entryFee!: number | null;

  @Column({ name: 'entry_fee_currency', type: 'varchar', length: 3, default: 'USD' })
  entryFeeCurrency!: string;

  @Column({ name: 'rental_available', type: 'varchar', length: 10, default: 'unknown' })
  rentalAvailable!: string;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
