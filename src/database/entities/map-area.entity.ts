import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GameMap } from './map.entity';

/**
 * map_areas — PostGIS polygon stored as geometry(POLYGON, 4326).
 * Geometry column (boundary) is NOT mapped here — use raw SQL via DataSource.query() for reads/writes.
 */
@Entity({ name: 'map_areas' })
export class MapArea {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => GameMap, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'map_id' })
  map!: GameMap;

  @Column({ name: 'map_id', type: 'uuid' })
  mapId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'color_hex', type: 'varchar', default: '#FF6B35' })
  colorHex!: string;

  @Column({ name: 'area_type', type: 'varchar', default: 'ZONE' })
  areaType!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
