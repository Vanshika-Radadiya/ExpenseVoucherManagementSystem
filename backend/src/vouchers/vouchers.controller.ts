import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import {
  CreateVoucherDto,
  RejectVoucherDto,
  UpdateVoucherDto,
  VoucherQueryDto,
} from './voucher.dto.js';
import { VouchersService } from './vouchers.service.js';
import type { UploadedSignatureFile } from './vouchers.service.js';
import type { Response } from 'express';

const signatureUpload = FileInterceptor('signature', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

@Controller('vouchers')
@UseGuards(AuthGuard, RolesGuard)
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Post()
  @Roles(UserRole.EMPLOYEE)
  create(@Body() body: CreateVoucherDto, @Req() request: AuthenticatedRequest) {
    return this.vouchers.create(request.user, body);
  }

  @Get()
  list(@Query() query: VoucherQueryDto, @Req() request: AuthenticatedRequest) {
    return this.vouchers.list(request.user, query);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.vouchers.get(request.user, id);
  }

  @Patch(':id')
  @Roles(UserRole.EMPLOYEE)
  update(
    @Param('id') id: string,
    @Body() body: UpdateVoucherDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.vouchers.update(request.user, id, body);
  }

  @Delete(':id')
  @Roles(UserRole.EMPLOYEE)
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.vouchers.delete(request.user, id);
  }

  @Post(':id/signatures/employee')
  @Roles(UserRole.EMPLOYEE)
  @UseInterceptors(signatureUpload)
  uploadEmployeeSignature(
    @Param('id') id: string,
    @UploadedFile() file: UploadedSignatureFile | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.vouchers.uploadEmployeeSignature(request.user, id, file);
  }

  @Post(':id/submit')
  @Roles(UserRole.EMPLOYEE)
  submit(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.vouchers.submit(request.user, id);
  }

  @Post(':id/approve')
  @Roles(UserRole.DIRECTOR)
  @UseInterceptors(signatureUpload)
  approve(
    @Param('id') id: string,
    @UploadedFile() file: UploadedSignatureFile | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.vouchers.approve(request.user, id, file);
  }

  @Post(':id/reject')
  @Roles(UserRole.DIRECTOR)
  reject(
    @Param('id') id: string,
    @Body() body: RejectVoucherDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.vouchers.reject(request.user, id, body);
  }

  @Get(':id/signatures/:kind')
  async signature(
    @Param('id') id: string,
    @Param('kind') kind: string,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const result = await this.vouchers.signature(request.user, id, kind);
    return response.type(result.contentType).sendFile(result.path);
  }
}