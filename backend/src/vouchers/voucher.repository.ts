import { Injectable } from '@nestjs/common';
import {
  Prisma,
  VoucherEventType,
  VoucherStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreateVoucherDto, UpdateVoucherDto, VoucherQueryDto } from './voucher.dto.js';

const detailInclude = {
  createdBy: {
    select: { id: true, email: true, fullName: true, employeeId: true },
  },
  events: {
    orderBy: { createdAt: 'desc' as const },
    include: { actor: { select: { id: true, fullName: true, role: true } } },
  },
} satisfies Prisma.VoucherInclude;

export type VoucherDetails = Prisma.VoucherGetPayload<{
  include: typeof detailInclude;
}>;

export interface VoucherListScope {
  ownerId?: string;
  query: VoucherQueryDto;
}

export abstract class VoucherRepository {
  abstract createDraft(ownerId: string, data: CreateVoucherDto): Promise<VoucherDetails>;
  abstract findOne(id: string, ownerId?: string): Promise<VoucherDetails | null>;
  abstract list(scope: VoucherListScope): Promise<{ items: VoucherDetails[]; total: number }>;
  abstract updateDraft(id: string, ownerId: string, data: UpdateVoucherDto): Promise<boolean>;
  abstract deleteDraft(id: string, ownerId: string): Promise<boolean>;
  abstract attachEmployeeSignature(id: string, ownerId: string, path: string): Promise<boolean>;
  abstract submit(id: string, ownerId: string): Promise<boolean>;
  abstract approve(id: string, actorId: string, signaturePath: string): Promise<boolean>;
  abstract reject(id: string, actorId: string, reason: string): Promise<boolean>;
}

@Injectable()
export class PrismaVoucherRepository extends VoucherRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createDraft(ownerId: string, data: CreateVoucherDto): Promise<VoucherDetails> {
    const year = new Date().getUTCFullYear();
    return this.prisma.$transaction(async (transaction) => {
      const counter = await transaction.voucherCounter.upsert({
        where: { year },
        create: { year, nextSequence: 2 },
        update: { nextSequence: { increment: 1 } },
      });
      const sequence = counter.nextSequence - 1;
      const voucherNumber = `EV-${year}-${String(sequence).padStart(6, '0')}`;
      return transaction.voucher.create({
        data: {
          voucherNumber,
          expenseDate: new Date(data.expenseDate),
          department: data.department.trim(),
          title: data.title.trim(),
          category: data.category.trim(),
          description: data.description.trim(),
          amount: new Prisma.Decimal(data.amount),
          employeeName: (await transaction.user.findUniqueOrThrow({
            where: { id: ownerId },
            select: { fullName: true },
          })).fullName,
          employeeIdSnapshot: (await transaction.user.findUniqueOrThrow({
            where: { id: ownerId },
            select: { employeeId: true },
          })).employeeId,
          createdBy: { connect: { id: ownerId } },
          events: { create: { actorId: ownerId, type: VoucherEventType.CREATED } },
        },
        include: detailInclude,
      });
    });
  }

  findOne(id: string, ownerId?: string): Promise<VoucherDetails | null> {
    return this.prisma.voucher.findFirst({
      where: { id, ...(ownerId ? { createdById: ownerId } : {}) },
      include: detailInclude,
    });
  }

  async list({ ownerId, query }: VoucherListScope) {
    const where: Prisma.VoucherWhereInput = {
      ...(ownerId ? { createdById: ownerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.department ? { department: { contains: query.department } } : {}),
      ...(query.category ? { category: { contains: query.category } } : {}),
      ...(query.search
        ? {
            OR: [
              { voucherNumber: { contains: query.search } },
              { employeeName: { contains: query.search } },
              { department: { contains: query.search } },
              { category: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.fromDate || query.toDate
        ? {
            expenseDate: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
      ...(query.minAmount !== undefined || query.maxAmount !== undefined
        ? {
            amount: {
              ...(query.minAmount !== undefined
                ? { gte: new Prisma.Decimal(query.minAmount) }
                : {}),
              ...(query.maxAmount !== undefined
                ? { lte: new Prisma.Decimal(query.maxAmount) }
                : {}),
            },
          }
        : {}),
    };
    const allowedSort = [
      'createdAt',
      'voucherDate',
      'expenseDate',
      'amount',
      'status',
      'voucherNumber',
      'employeeName',
      'department',
      'category',
    ] as const;
    const sortBy = allowedSort.find((field) => field === query.sortBy) ?? 'createdAt';
    const sortDirection = query.sortDirection.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const [items, total] = await this.prisma.$transaction([
      this.prisma.voucher.findMany({
        where,
        include: detailInclude,
        orderBy: { [sortBy]: sortDirection },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.voucher.count({ where }),
    ]);
    return { items, total };
  }

  async updateDraft(id: string, ownerId: string, data: UpdateVoucherDto) {
    const values: Prisma.VoucherUpdateManyMutationInput = {
      ...(data.expenseDate ? { expenseDate: new Date(data.expenseDate) } : {}),
      ...(data.department ? { department: data.department.trim() } : {}),
      ...(data.title ? { title: data.title.trim() } : {}),
      ...(data.category ? { category: data.category.trim() } : {}),
      ...(data.description ? { description: data.description.trim() } : {}),
      ...(data.amount !== undefined ? { amount: new Prisma.Decimal(data.amount) } : {}),
    };
    if (Object.keys(values).length === 0) return true;
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.voucher.updateMany({
        where: { id, createdById: ownerId, status: VoucherStatus.DRAFT },
        data: values,
      });
      if (result.count !== 1) return false;
      await transaction.voucherEvent.create({
        data: { voucherId: id, actorId: ownerId, type: VoucherEventType.UPDATED },
      });
      return true;
    });
  }

  async deleteDraft(id: string, ownerId: string) {
    const result = await this.prisma.voucher.deleteMany({
      where: { id, createdById: ownerId, status: VoucherStatus.DRAFT },
    });
    return result.count === 1;
  }

  async attachEmployeeSignature(id: string, ownerId: string, path: string) {
    const result = await this.prisma.voucher.updateMany({
      where: { id, createdById: ownerId, status: VoucherStatus.DRAFT },
      data: { employeeSignaturePath: path },
    });
    return result.count === 1;
  }

  async submit(id: string, ownerId: string) {
    return this.transition(
      id,
      ownerId,
      VoucherStatus.DRAFT,
      VoucherStatus.PENDING_APPROVAL,
      VoucherEventType.SUBMITTED,
    );
  }

  async approve(id: string, actorId: string, signaturePath: string) {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.voucher.updateMany({
        where: { id, status: VoucherStatus.PENDING_APPROVAL },
        data: {
          status: VoucherStatus.APPROVED,
          directorSignaturePath: signaturePath,
          approvalDate: new Date(),
        },
      });
      if (result.count !== 1) return false;
      await transaction.voucherEvent.create({
        data: {
          voucherId: id,
          actorId,
          type: VoucherEventType.APPROVED,
          fromStatus: VoucherStatus.PENDING_APPROVAL,
          toStatus: VoucherStatus.APPROVED,
        },
      });
      return true;
    });
  }

  async reject(id: string, actorId: string, reason: string) {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.voucher.updateMany({
        where: { id, status: VoucherStatus.PENDING_APPROVAL },
        data: { status: VoucherStatus.REJECTED, rejectionReason: reason.trim() },
      });
      if (result.count !== 1) return false;
      await transaction.voucherEvent.create({
        data: {
          voucherId: id,
          actorId,
          type: VoucherEventType.REJECTED,
          fromStatus: VoucherStatus.PENDING_APPROVAL,
          toStatus: VoucherStatus.REJECTED,
          details: reason.trim(),
        },
      });
      return true;
    });
  }

  private async transition(
    id: string,
    ownerId: string,
    fromStatus: VoucherStatus,
    toStatus: VoucherStatus,
    type: VoucherEventType,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.voucher.updateMany({
        where: { id, createdById: ownerId, status: fromStatus },
        data: { status: toStatus },
      });
      if (result.count !== 1) return false;
      await transaction.voucherEvent.create({
        data: { voucherId: id, actorId: ownerId, type, fromStatus, toStatus },
      });
      return true;
    });
  }
}