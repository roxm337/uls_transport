-- Client after-sales cases cover both operational complaints and requested
-- reimbursements while keeping staff-only notes out of the portal response.
CREATE TABLE `ClientClaim` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `expeditionId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `requestedAmount` DECIMAL(10, 2) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'NOUVELLE',
    `publicResponse` TEXT NULL,
    `internalNote` TEXT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClientClaim_reference_key`(`reference`),
    INDEX `ClientClaim_clientId_createdAt_idx`(`clientId`, `createdAt`),
    INDEX `ClientClaim_expeditionId_idx`(`expeditionId`),
    INDEX `ClientClaim_status_idx`(`status`),
    INDEX `ClientClaim_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ClientClaim`
    ADD CONSTRAINT `ClientClaim_clientId_fkey`
    FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ClientClaim`
    ADD CONSTRAINT `ClientClaim_expeditionId_fkey`
    FOREIGN KEY (`expeditionId`) REFERENCES `Expedition`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
