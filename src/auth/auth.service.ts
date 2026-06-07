import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { User } from '../database/entities/user.entity';
import { RefreshToken } from '../database/entities/refresh-token.entity';
import { PlayerStats } from '../database/entities/player-stats.entity';
import { JwtUtil } from '../common/utils/jwt.util';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';

interface GoogleTokenInfo {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(PlayerStats)
    private readonly playerStatsRepo: Repository<PlayerStats>,
    private readonly jwtUtil: JwtUtil,
  ) {}

  async googleSignIn(idToken: string): Promise<AuthResponseDto> {
    const payload = await this.verifyGoogleToken(idToken);
    const { sub: googleId, email, name, picture } = payload;

    let isNew = false;
    let user = await this.userRepo.findOne({ where: { googleId } });

    if (!user) {
      isNew = true;
      const displayName =
        (name?.trim() ? name : null) ??
        (email ? email.split('@')[0] : null) ??
        'Player';

      user = this.userRepo.create({
        googleId,
        email: email ?? null,
        displayName,
        avatarUrl: picture ?? null,
        role: 'player',
      });
      user = await this.userRepo.save(user);
    }

    if (isNew) {
      await this.createPlayerStats(user.id);
    }

    user.lastSeenAt = new Date();
    await this.userRepo.save(user);

    return this.buildAuthResponse(user, isNew);
  }

  async appleSignIn(
    identityToken: string,
    displayName?: string,
    email?: string,
  ): Promise<AuthResponseDto> {
    const appleId = this.extractAppleId(identityToken);

    let isNew = false;
    let user = await this.userRepo.findOne({ where: { appleId } });

    if (!user) {
      isNew = true;
      const name =
        (displayName?.trim() ? displayName : null) ??
        (email ? email.split('@')[0] : null) ??
        'Player';

      user = this.userRepo.create({
        appleId,
        email: email ?? null,
        displayName: name,
        role: 'player',
      });
      user = await this.userRepo.save(user);
    }

    if (isNew) {
      await this.createPlayerStats(user.id);
    }

    user.lastSeenAt = new Date();
    await this.userRepo.save(user);

    return this.buildAuthResponse(user, isNew);
  }

  async refresh(rawRefreshToken: string): Promise<AuthResponseDto> {
    const rt = await this.refreshTokenRepo.findOne({
      where: { token: rawRefreshToken },
      relations: ['user'],
    });

    if (!rt) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (rt.expiresAt < new Date()) {
      await this.refreshTokenRepo.delete({ id: rt.id });
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = rt.user;
    await this.refreshTokenRepo.delete({ id: rt.id });

    return this.buildAuthResponse(user, false);
  }

  async logout(_userId: string, rawRefreshToken: string): Promise<void> {
    const rt = await this.refreshTokenRepo.findOne({
      where: { token: rawRefreshToken },
    });
    if (rt) {
      await this.refreshTokenRepo.delete({ id: rt.id });
    }
  }

  async buildAuthResponse(user: User, isNew: boolean): Promise<AuthResponseDto> {
    const accessToken = this.jwtUtil.sign({
      sub: user.id,
      email: user.email ?? undefined,
      role: user.role,
    });

    const refreshToken = await this.generateAndSaveRefreshToken(user);

    const userDto: UserResponseDto = {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isNewUser: isNew,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
    };

    return {
      accessToken,
      refreshToken,
      expiresIn: this.jwtUtil.accessTokenExpiresIn,
      tokenType: 'Bearer',
      user: userDto,
    };
  }

  private async generateAndSaveRefreshToken(user: User): Promise<string> {
    const token = `${randomUUID()}-${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    const rt = this.refreshTokenRepo.create({
      token,
      userId: user.id,
      user,
      expiresAt,
    });
    await this.refreshTokenRepo.save(rt);

    return token;
  }

  private async createPlayerStats(userId: string): Promise<void> {
    const existing = await this.playerStatsRepo.findOne({ where: { userId } });
    if (!existing) {
      const stats = this.playerStatsRepo.create({
        userId,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        totalKills: 0,
        totalDeaths: 0,
      });
      await this.playerStatsRepo.save(stats);
    }
  }

  private async verifyGoogleToken(idToken: string): Promise<GoogleTokenInfo> {
    try {
      const response = await axios.get<GoogleTokenInfo>(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${idToken}`,
      );
      return response.data;
    } catch (err) {
      this.logger.warn('Google token verification failed');
      throw new UnauthorizedException('Invalid Google ID token');
    }
  }

  private extractAppleId(identityToken: string): string {
    try {
      const parts = identityToken.split('.');
      if (parts.length < 2) throw new Error('Invalid JWT format');
      const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
      const parsed = JSON.parse(payload) as { sub?: string };
      if (!parsed.sub) throw new Error('Missing sub');
      return parsed.sub;
    } catch (err) {
      this.logger.warn('Apple identity token decode failed');
      throw new UnauthorizedException('Invalid Apple identity token');
    }
  }
}
