import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DashboardsController } from './dashboards.controller.js';
import { DashboardsService } from './dashboards.service.js';

@Module({
  imports: [AuthModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
})
export class DashboardsModule {}