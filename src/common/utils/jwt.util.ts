import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;    // userId (UUID)
  email?: string;
  role: string;   // 'player' | 'admin'
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtUtil {
  private readonly secret: string;
  readonly accessTokenExpiresIn: number = 3600; // seconds

  constructor(private config: ConfigService) {
    this.secret = config.getOrThrow<string>('JWT_SECRET');
  }

  sign(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, {
      algorithm: 'HS512',           // phải match Spring Boot JwtUtil
      expiresIn: this.accessTokenExpiresIn,
    });
  }

  verify(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, this.secret, {
        algorithms: ['HS512'],      // chỉ chấp nhận HS512
      }) as JwtPayload;
    } catch {
      return null;
    }
  }
}
