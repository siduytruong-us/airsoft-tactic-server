import {
  ConflictException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminAccount } from '../database/entities/admin-account.entity';
import { JwtUtil } from '../common/utils/jwt.util';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminInfoDto, AdminLoginResponseDto } from './dto/admin-login-response.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdminAuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    @InjectRepository(AdminAccount)
    private readonly adminAccountRepo: Repository<AdminAccount>,
    private readonly jwtUtil: JwtUtil,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Auto-bootstrap on startup is intentionally skipped here.
    // Call POST /v1/admin/auth/bootstrap explicitly instead.
  }

  async login(dto: AdminLoginDto): Promise<AdminLoginResponseDto> {
    const account = await this.adminAccountRepo.findOne({
      where: { username: dto.username },
    });

    if (!account) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!account.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const passwordMatch = await bcrypt.compare(dto.password, account.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid username or password');
    }

    account.lastLoginAt = new Date();
    await this.adminAccountRepo.save(account);

    const accessToken = this.jwtUtil.sign({
      sub: account.id,
      email: account.username,
      role: 'admin',
    });

    const adminInfo: AdminInfoDto = {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
    };

    return {
      accessToken,
      expiresIn: this.jwtUtil.accessTokenExpiresIn,
      admin: adminInfo,
    };
  }

  async bootstrap(): Promise<AdminInfoDto> {
    const defaultPassword = 'Admin123@';
    const existing = await this.adminAccountRepo.findOne({
      where: { username: 'admin' },
    });

    if (existing) {
      // Always reset password to default
      existing.passwordHash = await bcrypt.hash(defaultPassword, BCRYPT_ROUNDS);
      await this.adminAccountRepo.save(existing);
      this.logger.log('Bootstrap: reset admin password to default');
      return { id: existing.id, username: existing.username, displayName: existing.displayName };
    }

    return this.createAdmin({
      username: 'admin',
      password: defaultPassword,
      displayName: 'System Admin',
    });
  }

  async createAdmin(dto: CreateAdminDto): Promise<AdminInfoDto> {
    const existing = await this.adminAccountRepo.findOne({
      where: { username: dto.username },
    });

    if (existing) {
      throw new ConflictException(`Username '${dto.username}' already taken`);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const displayName = dto.displayName.trim() || 'Admin';

    const account = this.adminAccountRepo.create({
      username: dto.username,
      passwordHash,
      displayName,
    });
    const saved = await this.adminAccountRepo.save(account);

    return {
      id: saved.id,
      username: saved.username,
      displayName: saved.displayName,
    };
  }
}
