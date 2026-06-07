import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { AppleAuthDto } from './dto/apple-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleSignIn(@Body() dto: GoogleAuthDto): Promise<AuthResponseDto> {
    return this.authService.googleSignIn(dto.idToken);
  }

  @Post('apple')
  @HttpCode(HttpStatus.OK)
  async appleSignIn(@Body() dto: AppleAuthDto): Promise<AuthResponseDto> {
    return this.authService.appleSignIn(
      dto.identityToken,
      dto.displayName,
      dto.email,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: LogoutDto): Promise<void> {
    // userId is not required for logout — we match by refreshToken only
    await this.authService.logout('', dto.refreshToken);
  }
}
