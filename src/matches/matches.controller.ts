import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { MatchesService } from './matches.service';
import { AreasService } from './areas.service';

import { JoinTeamDto } from './dto/join-team.dto';
import { EndMatchDto } from './dto/end-match.dto';
import { CreateAreaDto, UpdateAreaDto } from './dto/area-request.dto';
import { CreateMatchDto } from './dto/create-match.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly areasService: AreasService,
  ) {}

  // ─── Player endpoints ─────────────────────────────────────────────────────

  @Get('active')
  async getActive(@CurrentUser('userId') userId: string) {
    return this.matchesService.getActiveMatch(userId);
  }

  @Get(':id')
  async getMatch(
    @Param('id') matchId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.matchesService.getMatch(matchId, userId);
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.CREATED)
  async join(
    @Param('id') matchId: string,
    @Body() dto: JoinTeamDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.matchesService.joinTeam(matchId, dto.teamId, userId);
  }

  @Delete(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(
    @Param('id') matchId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.matchesService.leaveMatch(matchId, userId);
  }

  @Post(':id/hit')
  @HttpCode(HttpStatus.CREATED)
  async hit(
    @Param('id') matchId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.matchesService.reportHit(matchId, userId);
  }

  @Get(':id/my-status')
  async getMyStatus(
    @Param('id') matchId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.matchesService.getMyStatus(matchId, userId);
  }


  @Get(':id/areas')
  async getAreas(@Param('id') matchId: string) {
    return this.areasService.getAreas(matchId);
  }

  @Get(':id/areas/:areaId')
  async getArea(
    @Param('id') matchId: string,
    @Param('areaId') areaId: string,
  ) {
    return this.areasService.getArea(matchId, areaId);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMatch(
    @Body() dto: CreateMatchDto,
    @CurrentUser() user: { userId: string; role: string; email?: string },
  ) {
    return this.matchesService.createMatch(user.userId, user.email ?? user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/start')
  async startMatch(
    @Param('id') matchId: string,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.matchesService.startMatch(matchId, adminId);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/end')
  async endMatch(
    @Param('id') matchId: string,
    @Body() dto: EndMatchDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.matchesService.endMatch(matchId, adminId, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/areas')
  @HttpCode(HttpStatus.CREATED)
  async createArea(
    @Param('id') matchId: string,
    @Body() dto: CreateAreaDto,
  ) {
    return this.areasService.createArea(matchId, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id/areas/:areaId')
  async updateArea(
    @Param('id') matchId: string,
    @Param('areaId') areaId: string,
    @Body() dto: UpdateAreaDto,
  ) {
    return this.areasService.updateArea(matchId, areaId, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id/areas/:areaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteArea(
    @Param('id') matchId: string,
    @Param('areaId') areaId: string,
  ) {
    await this.areasService.deleteArea(matchId, areaId);
  }
}
