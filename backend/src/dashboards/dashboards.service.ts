import { Injectable } from '@nestjs/common';
import { UserRole, VoucherEventType, VoucherStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { AuthenticatedUser } from '../auth/auth.guard.js';

@Injectable()
export class DashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  getFor(user: AuthenticatedUser) {
    switch (user.role) {
      case UserRole.EMPLOYEE:
        return this.employee(user.id);
      case UserRole.DIRECTOR:
        return this.director();
      case UserRole.ACCOUNTS:
        return this.accounts();
    }
  }

  private async employee(ownerId: string) {
    const groups = await this.prisma.voucher.groupBy({
      by: ['status'],
      where: { createdById: ownerId },
      _count: { _all: true },
      _sum: { amount: true },
    });
    const totals = new Map(groups.map((group) => [group.status, group]));
    const total = groups.reduce((sum, group) => sum + group._count._all, 0);
    const claimed = groups.reduce(
      (sum, group) => sum + (group._sum.amount?.toNumber() ?? 0),
      0,
    );
    return {
      totalVouchers: total,
      draftVouchers: totals.get(VoucherStatus.DRAFT)?._count._all ?? 0,
      pendingApproval: totals.get(VoucherStatus.PENDING_APPROVAL)?._count._all ?? 0,
      approvedVouchers: totals.get(VoucherStatus.APPROVED)?._count._all ?? 0,
      rejectedVouchers: totals.get(VoucherStatus.REJECTED)?._count._all ?? 0,
      totalAmountClaimed: Number(claimed.toFixed(2)),
    };
  }

  private async director() {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const [pendingApprovalCount, pendingAmount, approvedToday, rejectedToday, recentActivity] =
      await Promise.all([
        this.prisma.voucher.count({ where: { status: VoucherStatus.PENDING_APPROVAL } }),
        this.prisma.voucher.aggregate({
          where: { status: VoucherStatus.PENDING_APPROVAL },
          _sum: { amount: true },
        }),
        this.prisma.voucher.count({
          where: { status: VoucherStatus.APPROVED, approvalDate: { gte: startOfDay } },
        }),
        this.prisma.voucher.count({
          where: {
            status: VoucherStatus.REJECTED,
            events: { some: { type: VoucherEventType.REJECTED, createdAt: { gte: startOfDay } } },
          },
        }),
        this.prisma.voucherEvent.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            actor: { select: { id: true, fullName: true, role: true } },
            voucher: { select: { id: true, voucherNumber: true, title: true, amount: true, status: true } },
          },
        }),
      ]);
    return {
      pendingApprovalCount,
      approvedToday,
      rejectedToday,
      totalPendingAmount: pendingAmount._sum.amount?.toNumber() ?? 0,
      recentVoucherActivity: recentActivity.map((event) => ({
        id: event.id,
        type: event.type,
        createdAt: event.createdAt,
        actor: event.actor,
        voucher: { ...event.voucher, amount: event.voucher.amount.toNumber() },
      })),
    };
  }

  private async accounts() {
    const groups = await this.prisma.voucher.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amount: true },
    });
    const values = new Map(groups.map((group) => [group.status, group]));
    const [totalVouchers, approvedAmount, recentApprovedVouchers] = await Promise.all([
      this.prisma.voucher.count(),
      this.prisma.voucher.aggregate({
        where: { status: VoucherStatus.APPROVED },
        _sum: { amount: true },
      }),
      this.prisma.voucher.findMany({
        where: { status: VoucherStatus.APPROVED },
        orderBy: { approvalDate: 'desc' },
        take: 10,
        select: {
          id: true,
          voucherNumber: true,
          employeeName: true,
          department: true,
          title: true,
          amount: true,
          approvalDate: true,
        },
      }),
    ]);
    return {
      totalVouchers,
      pendingApproval: values.get(VoucherStatus.PENDING_APPROVAL)?._count._all ?? 0,
      approvedVouchers: values.get(VoucherStatus.APPROVED)?._count._all ?? 0,
      rejectedVouchers: values.get(VoucherStatus.REJECTED)?._count._all ?? 0,
      totalApprovedExpenseAmount: approvedAmount._sum.amount?.toNumber() ?? 0,
      recentApprovedVouchers: recentApprovedVouchers.map((voucher) => ({
        ...voucher,
        amount: voucher.amount.toNumber(),
      })),
    };
  }
}