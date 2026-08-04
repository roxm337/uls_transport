-- Shared rate-limit counters. Replaces the per-process in-memory Map, which on
-- serverless gave every instance its own tally.
CREATE TABLE `RateLimit` (
    `id` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `resetAt` DATETIME(3) NOT NULL,

    INDEX `RateLimit_resetAt_idx`(`resetAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
