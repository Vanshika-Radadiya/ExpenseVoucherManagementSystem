import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SignatureStorage, LocalSignatureStorage } from '../signatures/signature-storage.js';
import { VouchersController } from './vouchers.controller.js';
import { PrismaVoucherRepository, VoucherRepository } from './voucher.repository.js';
import { VouchersService } from './vouchers.service.js';

@Module({
  imports: [AuthModule],
  controllers: [VouchersController],
  providers: [
    VouchersService,
    { provide: VoucherRepository, useClass: PrismaVoucherRepository },
    { provide: SignatureStorage, useClass: LocalSignatureStorage },
  ],
})
export class VouchersModule {}