-- CreateTable
CREATE TABLE `ExpeditionEvent` (
    `id` VARCHAR(191) NOT NULL,
    `expeditionId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'status',
    `status` VARCHAR(191) NULL,
    `previousStatus` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `userId` VARCHAR(191) NULL,
    `userName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExpeditionEvent_expeditionId_createdAt_idx`(`expeditionId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExpeditionEvent` ADD CONSTRAINT `ExpeditionEvent_expeditionId_fkey` FOREIGN KEY (`expeditionId`) REFERENCES `Expedition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed one opening entry per existing expedition, so shipments created before
-- this migration still have a timeline that starts somewhere. The status is
-- the current one — the transitions that led to it were never recorded and
-- cannot be reconstructed.
INSERT INTO `ExpeditionEvent` (`id`, `expeditionId`, `type`, `status`, `createdAt`)
SELECT
    CONCAT('evt', REPLACE(UUID(), '-', '')),
    `id`,
    'created',
    `status`,
    `createdAt`
FROM `Expedition`;
