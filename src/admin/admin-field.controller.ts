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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminManagementService, FieldResponseDto, GameModeResponseDto, MatchResponseDto } from './admin-management.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { CreateGameModeDto } from './dto/create-game-mode.dto';
import { AdminStatsDto } from './dto/admin-stats.dto';

@Controller('v1/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminFieldController {
  constructor(private readonly adminService: AdminManagementService) {}

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

  @Post('fields/:id/game-modes')
  @HttpCode(HttpStatus.CREATED)
  async createGameMode(
    @Param('id') fieldId: string,
    @Body() dto: CreateGameModeDto,
  ): Promise<GameModeResponseDto> {
    return this.adminService.createGameMode(fieldId, dto);
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
}
