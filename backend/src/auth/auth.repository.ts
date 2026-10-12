import { Injectable } from '@nestjs/common';
import { Prisma, RefreshSession, User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

export type AuthUser = Pick<
  User,
  'id' | 'email' | 'fullName' | 'employeeId' | 'role' | 'passwordHash' | 'active'
>;

export type ActiveRefreshSession = RefreshSession & { user: User };

export abstract class AuthRepository {
  abstract findUserByEmail(email: string): Promise<AuthUser | null>;
  abstract findUserById(id: string): Promise<User | null>;
  abstract createRefreshSession(data: Prisma.RefreshSessionCreateInput): Promise<RefreshSession>;
  abstract findRefreshSession(tokenHash: string): Promise<ActiveRefreshSession | null>;
  abstract revokeRefreshSession(id: string): Promise<boolean>;
}

@Injectable()
export class PrismaAuthRepository extends AuthRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findUserByEmail(email: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        employeeId: true,
        role: true,
        passwordHash: true,
        active: true,
      },
    });
  }

  findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createRefreshSession(data: Prisma.RefreshSessionCreateInput) {
    return this.prisma.refreshSession.create({ data });
  }

  findRefreshSession(tokenHash: string): Promise<ActiveRefreshSession | null> {
    return this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async revokeRefreshSession(id: string): Promise<boolean> {
    const result = await this.prisma.refreshSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count === 1;
  }
}