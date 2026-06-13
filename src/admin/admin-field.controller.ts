import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminManagementService, FieldResponseDto, GameModeResponseDto, MatchResponseDto, UpdateMatchDto } from './admin-management.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { CreateGameModeDto } from './dto/create-game-mode.dto';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { UpdateFieldHoursDto } from './dto/update-field-hours.dto';
import { OpeningHourDto } from '../fields/dto/field-response.dto';
import { UploadsService } from '../uploads/uploads.service';
import { CoverImageResponseDto } from '../uploads/dto/cover-image-response.dto';

@Controller('v1/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminFieldController {
  constructor(
    private readonly adminService: AdminManagementService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Get('stats')
  async getStats(): Promise<AdminStatsDto> {
    return this.adminService.getAdminStats();
  }

  @Get('fields')
  async getFields(): Promise<FieldResponseDto[]> {
    return this.adminService.getFields();
  }

  @Post('fields')
  @HttpCode(HttpStatus.CREATED)
  async createField(@Body() dto: CreateFieldDto): Promise<FieldResponseDto> {
    return this.adminService.createField(dto);
  }

  @Get('fields/:id')
  async getField(@Param('id') id: string): Promise<FieldResponseDto> {
    return this.adminService.getField(id);
  }

  @Put('fields/:id')
  async updateField(
    @Param('id') id: string,
    @Body() dto: UpdateFieldDto,
  ): Promise<FieldResponseDto> {
    return this.adminService.updateField(id, dto);
  }

  @Delete('fields/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteField(@Param('id') id: string): Promise<void> {
    return this.adminService.deleteField(id);
  }

  @Post('fields/:id/cover-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFieldCoverImage(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<CoverImageResponseDto> {
    // Validate field exists first — avoid uploading to storage for a non-existent field
    await this.adminService.getField(id);

    const ext = this.uploadsService.validateCoverImage(file);
    const objectKey = `field-${id}.${ext}`;

    const coverImageUrl = await this.uploadsService.uploadCoverImage(
      'field-covers',
      objectKey,
      file as Express.Multer.File,
    );

    await this.adminService.updateFieldCoverImage(id, coverImageUrl);

    return { coverImageUrl };
  }

  @Put('fields/:id/hours')
  async updateHours(
    @Param('id') id: string,
    @Body() dto: UpdateFieldHoursDto,
  ): Promise<OpeningHourDto[]> {
    return this.adminService.upsertFieldHours(id, dto.hours);
  }

  @Post('fields/:id/game-modes')
  @HttpCode(HttpStatus.CREATED)
  async createGameMode(
    @Param('id') fieldId: string,
    @Body() dto: CreateGameModeDto,
  ): Promise<GameModeResponseDto> {
    return this.adminService.createGameMode(fieldId, dto);
  }

  @Put('fields/:id/game-modes/:gmId')
  async updateGameMode(
    @Param('id') fieldId: string,
    @Param('gmId') gmId: string,
    @Body() dto: CreateGameModeDto,
  ): Promise<GameModeResponseDto> {
    return this.adminService.updateGameMode(fieldId, gmId, dto);
  }

  @Delete('fields/:id/game-modes/:gmId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGameMode(@Param('gmId') gmId: string): Promise<void> {
    return this.adminService.deleteGameMode(gmId);
  }

  @Get('fields/:id/matches')
  async getMatchesForField(@Param('id') fieldId: string): Promise<MatchResponseDto[]> {
    return this.adminService.getMatchesByField(fieldId);
  }

  @Patch('matches/:id')
  async updateMatch(
    @Param('id') matchId: string,
    @Body() dto: UpdateMatchDto,
  ): Promise<MatchResponseDto> {
    return this.adminService.updateMatch(matchId, dto);
  }

  @Delete('matches/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMatch(@Param('id') matchId: string): Promise<void> {
    return this.adminService.deleteMatch(matchId);
  }
}
