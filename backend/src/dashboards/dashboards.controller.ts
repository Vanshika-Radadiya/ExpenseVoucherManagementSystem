import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { DashboardsService } from './dashboards.service.js';

@Controller('dashboards')
@UseGuards(AuthGuard)
export class DashboardsController {
  constructor(private readonly dashboards: DashboardsService) {}

  @Get('me')
  getMyDashboard(@Req() request: AuthenticatedRequest) {
    return this.dashboards.getFor(request.user);
  }
}