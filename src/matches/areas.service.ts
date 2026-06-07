import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

import { AreaResponseDto } from './dto/area-response.dto';
import { CreateAreaDto, UpdateAreaDto } from './dto/area-request.dto';

interface AreaRow {
  id: string;
  match_id: string;
  name: string;
  description: string | null;
  color_hex: string;
  area_type: string;
  geojson: object;
  created_at: Date;
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

/**
 * Extract geometry object from either a GeoJSON Feature or a bare Geometry.
 */
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
export class AreasService {
  private readonly logger = new Logger(AreasService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ─── getAreas ────────────────────────────────────────────────────────────────

  async getAreas(matchId: string): Promise<AreaResponseDto[]> {
    // Validate match exists
    const matchRows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM game_matches WHERE id = $1 LIMIT 1`,
      [matchId],
    );
    if (!matchRows.length) throw new NotFoundException(`Match not found: ${matchId}`);

    const rows = await this.dataSource.query<AreaRow[]>(
      `SELECT id, match_id, name, description, color_hex, area_type,
              ST_AsGeoJSON(polygon)::json AS geojson, created_at
       FROM game_areas
       WHERE match_id = $1
       ORDER BY created_at ASC`,
      [matchId],
    );

    return rows.map(r => this.toResponse(r));
  }

  // ─── getArea ─────────────────────────────────────────────────────────────────

  async getArea(matchId: string, areaId: string): Promise<AreaResponseDto> {
    const rows = await this.dataSource.query<AreaRow[]>(
      `SELECT id, match_id, name, description, color_hex, area_type,
              ST_AsGeoJSON(polygon)::json AS geojson, created_at
       FROM game_areas
       WHERE id = $1`,
      [areaId],
    );
    if (!rows.length) throw new NotFoundException(`Area not found: ${areaId}`);
    if (rows[0].match_id !== matchId) {
      throw new NotFoundException(`Area ${areaId} does not belong to match ${matchId}`);
    }
    return this.toResponse(rows[0]);
  }

  // ─── createArea ──────────────────────────────────────────────────────────────

  async createArea(matchId: string, dto: CreateAreaDto): Promise<AreaResponseDto> {
    // Validate match exists
    const matchRows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM game_matches WHERE id = $1 LIMIT 1`,
      [matchId],
    );
    if (!matchRows.length) throw new NotFoundException(`Match not found: ${matchId}`);

    let geometry: object;
    try {
      geometry = extractGeometry(dto.geometry);
    } catch (e: unknown) {
      throw new UnprocessableEntityException({
        message: `Invalid GeoJSON: ${String(e)}`,
        code: 'INVALID_GEOMETRY',
      });
    }

    const id = randomUUID();
    await this.dataSource.query(
      `INSERT INTO game_areas (id, match_id, name, description, color_hex, area_type, polygon, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_GeomFromGeoJSON($7), 4326), NOW())`,
      [
        id,
        matchId,
        dto.name,
        dto.description ?? null,
        dto.colorHex ?? '#FF5733',
        dto.areaType ?? 'ZONE',
        JSON.stringify(geometry),
      ],
    );

    return this.getArea(matchId, id);
  }

  // ─── updateArea ──────────────────────────────────────────────────────────────

  async updateArea(matchId: string, areaId: string, dto: UpdateAreaDto): Promise<AreaResponseDto> {
    // Validate exists and belongs to match
    await this.getArea(matchId, areaId);

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (dto.name !== undefined) {
      setClauses.push(`name = $${paramIdx++}`);
      params.push(dto.name);
    }
    if (dto.description !== undefined) {
      setClauses.push(`description = $${paramIdx++}`);
      params.push(dto.description);
    }
    if (dto.colorHex !== undefined) {
      setClauses.push(`color_hex = $${paramIdx++}`);
      params.push(dto.colorHex);
    }
    if (dto.areaType !== undefined) {
      setClauses.push(`area_type = $${paramIdx++}`);
      params.push(dto.areaType);
    }
    if (dto.geometry !== undefined) {
      let geometry: object;
      try {
        geometry = extractGeometry(dto.geometry);
      } catch (e: unknown) {
        throw new UnprocessableEntityException({
          message: `Invalid GeoJSON: ${String(e)}`,
          code: 'INVALID_GEOMETRY',
        });
      }
      setClauses.push(`polygon = ST_SetSRID(ST_GeomFromGeoJSON($${paramIdx++}), 4326)`);
      params.push(JSON.stringify(geometry));
    }

    if (setClauses.length > 0) {
      params.push(areaId);
      await this.dataSource.query(
        `UPDATE game_areas SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
        params,
      );
    }

    return this.getArea(matchId, areaId);
  }

  // ─── deleteArea ──────────────────────────────────────────────────────────────

  async deleteArea(matchId: string, areaId: string): Promise<void> {
    // Validate exists and belongs to match
    await this.getArea(matchId, areaId);
    await this.dataSource.query(`DELETE FROM game_areas WHERE id = $1`, [areaId]);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private toResponse(row: AreaRow): AreaResponseDto {
    return {
      id:          row.id,
      matchId:     row.match_id,
      name:        row.name,
      description: row.description,
      colorHex:    row.color_hex,
      areaType:    row.area_type,
      geometry:    row.geojson,
      createdAt:   new Date(row.created_at).toISOString(),
    };
  }
}
