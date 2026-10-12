import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, VoucherStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.guard.js';
import { SignatureStorage } from '../signatures/signature-storage.js';
import {
  CreateVoucherDto,
  RejectVoucherDto,
  UpdateVoucherDto,
  VoucherQueryDto,
} from './voucher.dto.js';
import { VoucherDetails, VoucherRepository } from './voucher.repository.js';

const maxSignatureBytes = 5 * 1024 * 1024;

export interface UploadedSignatureFile {
  buffer: Buffer;
  size: number;
}

@Injectable()
export class VouchersService {
  constructor(
    private readonly repository: VoucherRepository,
    private readonly signatureStorage: SignatureStorage,
  ) {}

  async create(user: AuthenticatedUser, data: CreateVoucherDto) {
    return this.present(await this.repository.createDraft(user.id, data));
  }

  async list(user: AuthenticatedUser, query: VoucherQueryDto) {
    if (query.fromDate && query.toDate && new Date(query.fromDate) > new Date(query.toDate)) {
      throw new BadRequestException('fromDate must be earlier than or equal to toDate');
    }
    if (query.minAmount !== undefined && query.maxAmount !== undefined && query.minAmount > query.maxAmount) {
      throw new BadRequestException('minAmount must be less than or equal to maxAmount');
    }
    const scope = user.role === UserRole.EMPLOYEE ? { ownerId: user.id } : {};
    const result = await this.repository.list({ ...scope, query });
    return {
      items: result.items.map((voucher) => this.present(voucher)),
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
    };
  }

  async get(user: AuthenticatedUser, id: string) {
    return this.present(await this.requireVoucher(id, this.ownerScope(user)));
  }

  async update(user: AuthenticatedUser, id: string, data: UpdateVoucherDto) {
    const voucher = await this.requireVoucher(id, user.id);
    if (voucher.status !== VoucherStatus.DRAFT) {
      throw new ConflictException('Only draft vouchers can be edited');
    }
    if (!(await this.repository.updateDraft(id, user.id, data))) {
      throw new ConflictException('Voucher changed while it was being edited');
    }
    return this.get(user, id);
  }

  async delete(user: AuthenticatedUser, id: string) {
    const voucher = await this.requireVoucher(id, user.id);
    if (voucher.status !== VoucherStatus.DRAFT) {
      throw new ConflictException('Only draft vouchers can be deleted');
    }
    if (!(await this.repository.deleteDraft(id, user.id))) {
      throw new ConflictException('Voucher changed while it was being deleted');
    }
    if (voucher.employeeSignaturePath) {
      await this.signatureStorage.remove(voucher.employeeSignaturePath);
    }
    return { success: true };
  }

  async uploadEmployeeSignature(user: AuthenticatedUser, id: string, file?: UploadedSignatureFile) {
    const voucher = await this.requireVoucher(id, user.id);
    if (voucher.status !== VoucherStatus.DRAFT) {
      throw new ConflictException('Signatures can only be attached to draft vouchers');
    }
    const image = this.validateImage(file);
    const key = await this.signatureStorage.save(image.buffer, image.extension);
    try {
      if (!(await this.repository.attachEmployeeSignature(id, user.id, key))) {
        throw new ConflictException('Voucher changed while the signature was being uploaded');
      }
    } catch (error) {
      await this.signatureStorage.remove(key);
      throw error;
    }
    if (voucher.employeeSignaturePath && voucher.employeeSignaturePath !== key) {
      await this.signatureStorage.remove(voucher.employeeSignaturePath);
    }
    return { employeeSignatureUrl: `/api/vouchers/${id}/signatures/employee` };
  }

  async submit(user: AuthenticatedUser, id: string) {
    const voucher = await this.requireVoucher(id, user.id);
    if (voucher.status !== VoucherStatus.DRAFT) {
      throw new ConflictException('Only draft vouchers can be submitted');
    }
    if (!voucher.employeeSignaturePath) {
      throw new BadRequestException('An employee signature is required before submission');
    }
    if (!(await this.repository.submit(id, user.id))) {
      throw new ConflictException('Voucher changed while it was being submitted');
    }
    return this.get(user, id);
  }

  async approve(user: AuthenticatedUser, id: string, file?: UploadedSignatureFile) {
    const voucher = await this.requireVoucher(id);
    if (voucher.status !== VoucherStatus.PENDING_APPROVAL) {
      throw new ConflictException('Only pending vouchers can be approved');
    }
    const image = this.validateImage(file);
    const key = await this.signatureStorage.save(image.buffer, image.extension);
    try {
      if (!(await this.repository.approve(id, user.id, key))) {
        throw new ConflictException('Voucher changed while it was being approved');
      }
    } catch (error) {
      await this.signatureStorage.remove(key);
      throw error;
    }
    return this.get(user, id);
  }

  async reject(user: AuthenticatedUser, id: string, body: RejectVoucherDto) {
    const voucher = await this.requireVoucher(id);
    if (voucher.status !== VoucherStatus.PENDING_APPROVAL) {
      throw new ConflictException('Only pending vouchers can be rejected');
    }
    if (!(await this.repository.reject(id, user.id, body.reason))) {
      throw new ConflictException('Voucher changed while it was being rejected');
    }
    return this.get(user, id);
  }

  async signature(user: AuthenticatedUser, id: string, kind: string) {
    if (kind !== 'employee' && kind !== 'director') {
      throw new BadRequestException('Signature kind must be employee or director');
    }
    const voucher = await this.requireVoucher(id, this.ownerScope(user));
    const key = kind === 'employee' ? voucher.employeeSignaturePath : voucher.directorSignaturePath;
    if (!key) throw new NotFoundException('Signature not found');
    return {
      path: this.signatureStorage.getAbsolutePath(key),
      contentType: key.endsWith('.png') ? 'image/png' : key.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
    };
  }

  private ownerScope(user: AuthenticatedUser) {
    return user.role === UserRole.EMPLOYEE ? user.id : undefined;
  }

  private async requireVoucher(id: string, ownerId?: string) {
    const voucher = await this.repository.findOne(id, ownerId);
    if (!voucher) throw new NotFoundException('Voucher not found');
    return voucher;
  }

  private validateImage(file?: UploadedSignatureFile) {
    if (!file?.buffer?.length) throw new BadRequestException('Signature image is required');
    if (file.size > maxSignatureBytes) throw new BadRequestException('Signature image must be 5 MB or smaller');

    const buffer = file.buffer;
    if (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ) {
      return { buffer, extension: 'png' as const };
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { buffer, extension: 'jpg' as const };
    }
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return { buffer, extension: 'webp' as const };
    }
    throw new BadRequestException('Only PNG, JPEG, or WebP signature images are accepted');
  }

  private present(voucher: VoucherDetails) {
    const {
      employeeSignaturePath,
      directorSignaturePath,
      amount,
      ...safeVoucher
    } = voucher;
    return {
      ...safeVoucher,
      amount: amount.toNumber(),
      employeeSignatureUrl: employeeSignaturePath
        ? `/api/vouchers/${voucher.id}/signatures/employee`
        : null,
      directorSignatureUrl: directorSignaturePath
        ? `/api/vouchers/${voucher.id}/signatures/director`
        : null,
    };
  }
}