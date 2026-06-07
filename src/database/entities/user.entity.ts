import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'google_id', unique: true, nullable: true, type: 'varchar' })
  googleId!: string | null;

  @Column({ name: 'apple_id', unique: true, nullable: true, type: 'varchar' })
  appleId!: string | null;

  @Column({ unique: true, nullable: true, type: 'varchar' })
  email!: string | null;

  @Column({ name: 'display_name', type: 'varchar', length: 32 })
  displayName!: string;

  @Column({ name: 'avatar_url', nullable: true, type: 'varchar' })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', default: 'player' })
  role!: string;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt!: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
