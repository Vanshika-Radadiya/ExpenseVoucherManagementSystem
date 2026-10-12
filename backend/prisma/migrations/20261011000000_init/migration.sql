-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(64) NULL,
    `role` ENUM('EMPLOYEE', 'DIRECTOR', 'ACCOUNTS') NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_role_active_idx`(`role`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Voucher` (
    `id` VARCHAR(191) NOT NULL,
    `voucherNumber` VARCHAR(32) NOT NULL,
    `voucherDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expenseDate` DATETIME(3) NOT NULL,
    `department` VARCHAR(120) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `category` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `employeeName` VARCHAR(191) NOT NULL,
    `employeeIdSnapshot` VARCHAR(64) NULL,
    `employeeSignaturePath` VARCHAR(512) NULL,
    `directorSignaturePath` VARCHAR(512) NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `rejectionReason` TEXT NULL,
    `approvalDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Voucher_voucherNumber_key`(`voucherNumber`),
    INDEX `Voucher_createdById_status_createdAt_idx`(`createdById`, `status`, `createdAt`),
    INDEX `Voucher_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Voucher_department_category_idx`(`department`, `category`),
    INDEX `Voucher_expenseDate_idx`(`expenseDate`),
    INDEX `Voucher_amount_idx`(`amount`),
    INDEX `Voucher_employeeName_idx`(`employeeName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VoucherCounter` (
    `year` INTEGER NOT NULL,
    `nextSequence` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VoucherEvent` (
    `id` VARCHAR(191) NOT NULL,
    `voucherId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `type` ENUM('CREATED', 'UPDATED', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL,
    `fromStatus` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED') NULL,
    `toStatus` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED') NULL,
    `details` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VoucherEvent_voucherId_createdAt_idx`(`voucherId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshSession` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefreshSession_tokenHash_key`(`tokenHash`),
    INDEX `RefreshSession_userId_expiresAt_revokedAt_idx`(`userId`, `expiresAt`, `revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Voucher` ADD CONSTRAINT `Voucher_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VoucherEvent` ADD CONSTRAINT `VoucherEvent_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `Voucher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VoucherEvent` ADD CONSTRAINT `VoucherEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshSession` ADD CONSTRAINT `RefreshSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

