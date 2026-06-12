import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

import { GameMap } from '../../database/entities/map.entity';
import { MapArea } from '../../database/entities/map-area.entity';
import { CreateMapDto, UpdateMapDto } from './dto/create-map.dto';
import { CreateMapAreaDto, UpdateMapAreaDto } from './dto/create-map-area.dto';

export interface MapDto {
  id: string;
  fieldId: string | null;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  areas?: MapAreaDto[];
}

export interface MapAreaDto {
  id: string;
  mapId: string;
  name: string;
  description: string | null;
  colorHex: string;
  areaType: string;
  geojson: object;
}

interface MapAreaRow {
  id: string;
  map_id: string;
  name: string;
  description: string | null;
  color_hex: string;
  area_type: string;
  geojson: object;
}

interface GeoJsonFeature {
  type: 'Feature';
  geometry: object;
  properties?: Record<string, unknown> | null;
}

interface GeoJsonObject {
  type: string;
  [key: string]: unknown;
}

function extractGeometry(input: object): object {
  const geo = input as GeoJsonObject;
  if (geo.type === 'Feature') {
    const feature = input as GeoJsonFeature;
    if (!feature.geometry) {
      throw new Error('Feature has no geometry property');
    }
    return feature.geometry;
  }
  return input;
}

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);

  constructor(
    @InjectRepository(GameMap)
    private readonly mapRepo: Repository<GameMap>,
    @InjectRepository(MapArea)
    private readonly mapAreaRepo: Repository<MapArea>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── getMapsByField ──────────────────────────────────────────────────────────

  async getMapsByField(fieldId: string): Promise<MapDto[]> {
    const maps = await this.mapRepo.find({
      where: { fieldId },
      order: { createdAt: 'DESC' },
    });
    return maps.map(m => this.toMapDto(m));
  }

  // ─── createMap ───────────────────────────────────────────────────────────────

  async createMap(fieldId: string, dto: CreateMapDto): Promise<MapDto> {
    const map = this.mapRepo.create({
      fieldId,
      name: dto.name,
      description: dto.description ?? null,
      isPublic: dto.isPublic ?? false,
    });
    const saved = await this.mapRepo.save(map);
    return this.toMapDto(saved);
  }

  // ─── getMap ──────────────────────────────────────────────────────────────────

  async getMap(mapId: string): Promise<MapDto> {
    const map = await this.mapRepo.findOne({ where: { id: mapId } });
    if (!map) throw new NotFoundException(`Map not found: ${mapId}`);

    const areas = await this.getAreasByMap(mapId);
    return { ...this.toMapDto(map), areas };
  }

  // ─── updateMap ───────────────────────────────────────────────────────────────

  async updateMap(mapId: string, dto: UpdateMapDto): Promise<MapDto> {
    const map = await this.mapRepo.findOne({ where: { id: mapId } });
    if (!map) throw new NotFoundException(`Map not found: ${mapId}`);

    if (dto.name !== undefined) map.name = dto.name;
    if (dto.description !== undefined) map.description = dto.description ?? null;
    if (dto.coverImageUrl !== undefined) map.coverImageUrl = dto.coverImageUrl ?? null;
    if (dto.isPublic !== undefined) map.isPublic = dto.isPublic;

    const saved = await this.mapRepo.save(map);
    return this.toMapDto(saved);
  }

  // ─── deleteMap ───────────────────────────────────────────────────────────────

  async deleteMap(mapId: string): Promise<void> {
    const map = await this.mapRepo.findOne({ where: { id: mapId } });
    if (!map) throw new NotFoundException(`Map not found: ${mapId}`);
    await this.mapRepo.delete({ id: mapId });
  }

  // ─── createArea ──────────────────────────────────────────────────────────────

  async createArea(mapId: string, dto: CreateMapAreaDto): Promise<MapAreaDto> {
    const map = await this.mapRepo.findOne({ where: { id: mapId } });
    if (!map) throw new NotFoundException(`Map not found: ${mapId}`);

    let geometry: object;
    try {
      geometry = extractGeometry(dto.geojson);
    } catch (e: unknown) {
      throw new UnprocessableEntityException({
        message: `Invalid GeoJSON: ${String(e)}`,
        code: 'INVALID_GEOMETRY',
      });
    }

    const id = randomUUID();
    await this.dataSource.query(
      `INSERT INTO map_areas (id, map_id, name, description, color_hex, area_type, boundary, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_GeomFromGeoJSON($7), 4326), NOW())`,
      [
        id,
        mapId,
        dto.name,
        dto.description ?? null,
        dto.colorHex ?? '#FF6B35',
        dto.areaType ?? 'ZONE',
        JSON.stringify(geometry),
      ],
    );

    return this.getAreaById(mapId, id);
  }

  // ─── updateArea ──────────────────────────────────────────────────────────────

  async updateArea(mapId: string, areaId: string, dto: UpdateMapAreaDto): Promise<MapAreaDto> {
    await this.getAreaById(mapId, areaId); // validate exists and belongs to map

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (dto.name !== undefined) {
      setClauses.push(`name = $${paramIdx++}`);
      params.push(dto.name);
    }
    if (dto.description !== undefined) {
      setClauses.push(`description = $${paramIdx++}`);
      params.push(dto.description ?? null);
    }
    if (dto.colorHex !== undefined) {
      setClauses.push(`color_hex = $${paramIdx++}`);
      params.push(dto.colorHex);
    }
    if (dto.areaType !== undefined) {
      setClauses.push(`area_type = $${paramIdx++}`);
      params.push(dto.areaType);
    }
    if (dto.geojson !== undefined) {
      let geometry: object;
      try {
        geometry = extractGeometry(dto.geojson);
      } catch (e: unknown) {
        throw new UnprocessableEntityException({
          message: `Invalid GeoJSON: ${String(e)}`,
          code: 'INVALID_GEOMETRY',
        });
      }
      setClauses.push(`boundary = ST_SetSRID(ST_GeomFromGeoJSON($${paramIdx++}), 4326)`);
      params.push(JSON.stringify(geometry));
    }

    if (setClauses.length > 0) {
      params.push(areaId);
      await this.dataSource.query(
        `UPDATE map_areas SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
        params,
      );
    }

    return this.getAreaById(mapId, areaId);
  }

  // ─── deleteArea ──────────────────────────────────────────────────────────────

  async deleteArea(mapId: string, areaId: string): Promise<void> {
    await this.getAreaById(mapId, areaId); // validate exists and belongs to map
    await this.dataSource.query(`DELETE FROM map_areas WHERE id = $1`, [areaId]);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  async getAreas(mapId: string): Promise<MapAreaDto[]> {
    return this.getAreasByMap(mapId);
  }

  private async getAreasByMap(mapId: string): Promise<MapAreaDto[]> {
    const rows = await this.dataSource.query<MapAreaRow[]>(
      `SELECT id, map_id, name, description, color_hex, area_type,
              ST_AsGeoJSON(boundary)::json AS geojson
       FROM map_areas
       WHERE map_id = $1
       ORDER BY created_at ASC`,
      [mapId],
    );
    return rows.map(r => this.toAreaDto(r));
  }

  private async getAreaById(mapId: string, areaId: string): Promise<MapAreaDto> {
    const rows = await this.dataSource.query<MapAreaRow[]>(
      `SELECT id, map_id, name, description, color_hex, area_type,
              ST_AsGeoJSON(boundary)::json AS geojson
       FROM map_areas
       WHERE id = $1`,
      [areaId],
    );
    if (!rows.length) throw new NotFoundException(`MapArea not found: ${areaId}`);
    if (rows[0].map_id !== mapId) {
      throw new NotFoundException(`Area ${areaId} does not belong to map ${mapId}`);
    }
    return this.toAreaDto(rows[0]);
  }

  private toMapDto(m: GameMap): MapDto {
    return {
      id:            m.id,
      fieldId:       m.fieldId,
      name:          m.name,
      description:   m.description,
      coverImageUrl: m.coverImageUrl,
      isPublic:      m.isPublic,
      createdAt:     m.createdAt.toISOString(),
      updatedAt:     m.updatedAt.toISOString(),
    };
  }

  private toAreaDto(r: MapAreaRow): MapAreaDto {
    return {
      id:          r.id,
      mapId:       r.map_id,
      name:        r.name,
      description: r.description,
      colorHex:    r.color_hex,
      areaType:    r.area_type,
      geojson:     r.geojson,
    };
  }
}
