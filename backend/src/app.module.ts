import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { DashboardsModule } from './dashboards/dashboards.module.js';
import { VouchersModule } from './vouchers/vouchers.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (environment: Record<string, unknown>) => {
        if (typeof environment.DATABASE_URL !== 'string') {
          throw new Error('DATABASE_URL is required');
        }
        if (
          typeof environment.JWT_ACCESS_SECRET !== 'string' ||
          environment.JWT_ACCESS_SECRET.length < 32
        ) {
          throw new Error('JWT_ACCESS_SECRET must be at least 32 characters');
        }
        if (
          environment.JWT_ACCESS_TTL_SECONDS !== undefined &&
          (!Number.isSafeInteger(Number(environment.JWT_ACCESS_TTL_SECONDS)) ||
            Number(environment.JWT_ACCESS_TTL_SECONDS) <= 0)
        ) {
          throw new Error('JWT_ACCESS_TTL_SECONDS must be a positive integer');
        }
        return environment;
      },
    }),
    PrismaModule,
    AuthModule,
    VouchersModule,
    DashboardsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
