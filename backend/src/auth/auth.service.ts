import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { compare } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from './auth.repository.js';

const refreshLifetimeMs = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    if (!user || !user.active || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    const session = await this.repository.findRefreshSession(this.hash(refreshToken));
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.active
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
    if (!(await this.repository.revokeRefreshSession(session.id))) {
      throw new UnauthorizedException('Refresh token has already been used');
    }
    return this.issueTokens(session.user);
  }

  async logout(refreshToken: string) {
    const session = await this.repository.findRefreshSession(this.hash(refreshToken));
    if (session && !session.revokedAt) {
      await this.repository.revokeRefreshSession(session.id);
    }
    return { success: true };
  }

  private async issueTokens(user: Pick<User, 'id' | 'email' | 'role' | 'fullName' | 'employeeId'>) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + refreshLifetimeMs);
    await this.repository.createRefreshSession({
      tokenHash: this.hash(refreshToken),
      expiresAt,
      user: { connect: { id: user.id } },
    });
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: Number(this.config.get('JWT_ACCESS_TTL_SECONDS') ?? 900),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        employeeId: user.employeeId,
        role: user.role,
      },
    };
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}