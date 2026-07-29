-- AlterTable
ALTER TABLE `AdminSettings` MODIFY `value` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `Lead` ADD COLUMN `data` JSON NULL,
    ADD COLUMN `emailError` TEXT NULL,
    ADD COLUMN `emailSent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `emailSentAt` DATETIME(3) NULL,
    ADD COLUMN `whatsappError` TEXT NULL,
    ADD COLUMN `whatsappSent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `whatsappSentAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `logo` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE `LandingPage` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NULL,
    `campaignId` VARCHAR(191) NULL,
    `html` LONGTEXT NOT NULL,
    `css` LONGTEXT NOT NULL,
    `js` LONGTEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'legacy',
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LandingPage_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActionLog` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActionLog_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `referrer` TEXT NULL,
    `landingPage` TEXT NULL,
    `utmSource` VARCHAR(191) NULL,
    `utmMedium` VARCHAR(191) NULL,
    `utmCampaign` VARCHAR(191) NULL,
    `utmContent` VARCHAR(191) NULL,
    `utmTerm` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Session_sessionId_key`(`sessionId`),
    INDEX `Session_sessionId_idx`(`sessionId`),
    INDEX `Session_startedAt_idx`(`startedAt`),
    INDEX `Session_lastSeenAt_idx`(`lastSeenAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageView` (
    `id` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `referrer` TEXT NULL,
    `duration` INTEGER NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PageView_sessionId_idx`(`sessionId`),
    INDEX `PageView_path_idx`(`path`),
    INDEX `PageView_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WhatsAppTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MessagingConfig` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NULL DEFAULT 'client',
    `config` JSON NULL,
    `clientId` VARCHAR(191) NULL,
    `landingPageId` VARCHAR(191) NULL,
    `smtpEnabled` BOOLEAN NOT NULL DEFAULT false,
    `smtpHost` VARCHAR(191) NULL,
    `smtpPort` INTEGER NULL,
    `smtpUsername` VARCHAR(191) NULL,
    `smtpPassword` TEXT NULL,
    `smtpEncryption` VARCHAR(191) NULL,
    `smtpFromName` VARCHAR(191) NULL,
    `smtpFromEmail` VARCHAR(191) NULL,
    `whatsappEnabled` BOOLEAN NOT NULL DEFAULT false,
    `whatsappProvider` VARCHAR(191) NULL,
    `whatsappApiKey` TEXT NULL,
    `whatsappApiUrl` VARCHAR(191) NULL,
    `whatsappAutoSend` BOOLEAN NOT NULL DEFAULT false,
    `whatsappTimeout` INTEGER NOT NULL DEFAULT 0,
    `whatsappTemplate` TEXT NULL,
    `smtpAutoSend` BOOLEAN NOT NULL DEFAULT false,
    `smtpTimeout` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MessagingConfig_clientId_key`(`clientId`),
    UNIQUE INDEX `MessagingConfig_landingPageId_key`(`landingPageId`),
    INDEX `MessagingConfig_clientId_idx`(`clientId`),
    INDEX `MessagingConfig_landingPageId_idx`(`landingPageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MessageTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL DEFAULT 'global',
    `clientId` VARCHAR(191) NULL,
    `landingPageId` VARCHAR(191) NULL,
    `subject` VARCHAR(255) NULL,
    `content` TEXT NOT NULL,
    `category` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,

    INDEX `MessageTemplate_type_idx`(`type`),
    INDEX `MessageTemplate_scope_idx`(`scope`),
    INDEX `MessageTemplate_status_idx`(`status`),
    INDEX `MessageTemplate_clientId_idx`(`clientId`),
    INDEX `MessageTemplate_landingPageId_idx`(`landingPageId`),
    INDEX `MessageTemplate_isDefault_idx`(`isDefault`),
    INDEX `MessageTemplate_name_type_idx`(`name`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MessageLog` (
    `id` VARCHAR(191) NOT NULL,
    `configId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `channel` VARCHAR(191) NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `error` TEXT NULL,
    `metadata` JSON NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MessageLog_configId_idx`(`configId`),
    INDEX `MessageLog_channel_idx`(`channel`),
    INDEX `MessageLog_status_idx`(`status`),
    INDEX `MessageLog_createdAt_idx`(`createdAt`),
    INDEX `MessageLog_templateId_idx`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ActionLog` ADD CONSTRAINT `ActionLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PageView` ADD CONSTRAINT `PageView_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageLog` ADD CONSTRAINT `MessageLog_configId_fkey` FOREIGN KEY (`configId`) REFERENCES `MessagingConfig`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageLog` ADD CONSTRAINT `MessageLog_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `MessageTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
