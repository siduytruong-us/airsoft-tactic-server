import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import {
  AdminManagementService,
  PageResponseDto,
  UserSummaryDto,
} from './admin-management.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('v1/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUserController {
  constructor(private readonly adminService: AdminManagementService) {}

  @Get('users')
  async listUsers(
    @Query('page') page = 0,
    @Query('size') size = 20,
  ): Promise<PageResponseDto<UserSummaryDto>> {
    return this.adminService.getUsers(Number(page), Number(size));
  }

  @Patch('users/:id/role')
  async updateRole(
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserSummaryDto> {
    return this.adminService.updateUserRole(userId, dto);
  }
}
