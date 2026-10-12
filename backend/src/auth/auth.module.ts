import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthRepository, PrismaAuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = Number(config.get('JWT_ACCESS_TTL_SECONDS') ?? 900);
        return {
          secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          signOptions: { expiresIn: `${expiresIn}s` },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    RolesGuard,
    { provide: AuthRepository, useClass: PrismaAuthRepository },
  ],
  exports: [JwtModule, AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}