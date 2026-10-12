import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VoucherStatus } from '@prisma/client';

export class CreateVoucherDto {
  @IsDateString()
  expenseDate!: string;

  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(120)
  department!: string;

  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(191)
  title!: string;

  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(120)
  category!: string;

  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(5000)
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999.99)
  amount!: number;
}

export class UpdateVoucherDto {
  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(191)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999.99)
  amount?: number;
}

export class RejectVoucherDto {
  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(2000)
  reason!: string;
}

export class VoucherQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000000)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsString()
  sortBy = 'createdAt';

  @IsOptional()
  @IsString()
  sortDirection = 'desc';
}