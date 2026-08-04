-- A separate credential record keeps authentication material out of the
-- operational Client model and all existing admin API payloads.
CREATE TABLE `ClientPortalAccount` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClientPortalAccount_clientId_key`(`clientId`),
    UNIQUE INDEX `ClientPortalAccount_email_key`(`email`),
    INDEX `ClientPortalAccount_enabled_idx`(`enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ClientPortalAccount`
    ADD CONSTRAINT `ClientPortalAccount_clientId_fkey`
    FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
