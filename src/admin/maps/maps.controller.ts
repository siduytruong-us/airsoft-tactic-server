import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { MapsService, MapDto, MapAreaDto } from './maps.service';
import { CreateMapDto, UpdateMapDto } from './dto/create-map.dto';
import { CreateMapAreaDto, UpdateMapAreaDto } from './dto/create-map-area.dto';
import { UploadsService } from '../../uploads/uploads.service';
import { CoverImageResponseDto } from '../../uploads/dto/cover-image-response.dto';

@Controller('v1/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class MapsController {
  constructor(
    private readonly mapsService: MapsService,
    private readonly uploadsService: UploadsService,
  ) {}

  // ─── Maps under a field ──────────────────────────────────────────────────────

  @Get('fields/:id/maps')
  async getMapsByField(@Param('id') fieldId: string): Promise<MapDto[]> {
    return this.mapsService.getMapsByField(fieldId);
  }

  @Post('fields/:id/maps')
  @HttpCode(HttpStatus.CREATED)
  async createMap(
    @Param('id') fieldId: string,
    @Body() dto: CreateMapDto,
  ): Promise<MapDto> {
    return this.mapsService.createMap(fieldId, dto);
  }

  // ─── Map CRUD ────────────────────────────────────────────────────────────────

  @Get('maps/:id')
  async getMap(@Param('id') mapId: string): Promise<MapDto> {
    return this.mapsService.getMap(mapId);
  }

  @Put('maps/:id')
  async updateMap(
    @Param('id') mapId: string,
    @Body() dto: UpdateMapDto,
  ): Promise<MapDto> {
    return this.mapsService.updateMap(mapId, dto);
  }

  @Delete('maps/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMap(@Param('id') mapId: string): Promise<void> {
    return this.mapsService.deleteMap(mapId);
  }

  @Post('maps/:id/cover-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMapCoverImage(
    @Param('id') mapId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<CoverImageResponseDto> {
    // Validate map exists first — avoid uploading to storage for a non-existent map
    await this.mapsService.getMap(mapId);

    const ext = this.uploadsService.validateCoverImage(file);
    const objectKey = `map-${mapId}.${ext}`;

    const coverImageUrl = await this.uploadsService.uploadCoverImage(
      'map-covers',
      objectKey,
      file as Express.Multer.File,
    );

    await this.mapsService.updateMapCoverImage(mapId, coverImageUrl);

    return { coverImageUrl };
  }

  // ─── Map areas ───────────────────────────────────────────────────────────────

  @Get('maps/:mapId/areas')
  async getAreas(@Param('mapId') mapId: string): Promise<MapAreaDto[]> {
    return this.mapsService.getAreas(mapId);
  }

  @Post('maps/:mapId/areas')
  @HttpCode(HttpStatus.CREATED)
  async createArea(
    @Param('mapId') mapId: string,
    @Body() dto: CreateMapAreaDto,
  ): Promise<MapAreaDto> {
    return this.mapsService.createArea(mapId, dto);
  }

  @Put('maps/:mapId/areas/:areaId')
  async updateArea(
    @Param('mapId') mapId: string,
    @Param('areaId') areaId: string,
    @Body() dto: UpdateMapAreaDto,
  ): Promise<MapAreaDto> {
    return this.mapsService.updateArea(mapId, areaId, dto);
  }

  @Delete('maps/:mapId/areas/:areaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteArea(
    @Param('mapId') mapId: string,
    @Param('areaId') areaId: string,
  ): Promise<void> {
    return this.mapsService.deleteArea(mapId, areaId);
  }
}
