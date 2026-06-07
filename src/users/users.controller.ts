import {
  Controller,
  Get,
  Patch,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeviceTokenDto } from './dto/device-token.dto';

@Controller('v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: RequestUser) {
    return this.usersService.getMe(user.userId);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Put('me/device-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async upsertDeviceToken(
    @CurrentUser() user: RequestUser,
    @Body() dto: DeviceTokenDto,
  ): Promise<void> {
    await this.usersService.upsertDeviceToken(user.userId, dto.token, dto.platform);
  }

  @Get('me/matches')
  async getMyMatches(
    @CurrentUser() user: RequestUser,
    @Query('page') page = 0,
    @Query('size') size = 10,
  ) {
    return this.usersService.getMyMatches(
      user.userId,
      Number(page),
      Number(size),
    );
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.usersService.getStats(id);
  }
}
