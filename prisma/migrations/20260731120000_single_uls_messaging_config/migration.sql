-- Collapse the per-client messaging configuration into a single ULS one.
--
-- The table used to hold one row per client, each with its own SMTP host,
-- password and WhatsApp key. ULS Transport is the sender, so those
-- credentials are the company's, not the client's. What genuinely belongs
-- to a client is whether it wants to be notified at all — that moves to
-- Client.notificationsEnabled.
--
-- Written to preserve data: the surviving configuration is the most
-- complete one, message logs are repointed to it before the others are
-- removed (their FK cascades, so deleting first would destroy the history),
-- and each client's opt-in carries over.

-- 1. Per-client opt-in moves onto the client itself.
ALTER TABLE `Client` ADD COLUMN `notificationsEnabled` BOOLEAN NOT NULL DEFAULT false;

UPDATE `Client` c
JOIN `MessagingConfig` m ON m.`clientId` = c.`id`
SET c.`notificationsEnabled` = m.`clientMessagingEnabled`;

-- 2. Singleton key. Nullable for now: the value is assigned in step 3, and
--    the unique index cannot be added while several rows share a NULL-free
--    default.
ALTER TABLE `MessagingConfig` ADD COLUMN `key` VARCHAR(191) NULL;

-- 3. Elect the survivor: the most configured row, then the most recent.
--    Wrapped in a variable because MySQL cannot select from the table it is
--    updating in the same statement.
SET @survivor := (
    SELECT `id` FROM `MessagingConfig`
    ORDER BY
        (`smtpEnabled` AND `smtpHost` IS NOT NULL AND `smtpPassword` IS NOT NULL) DESC,
        (`whatsappEnabled` AND `whatsappApiKey` IS NOT NULL) DESC,
        `updatedAt` DESC
    LIMIT 1
);

UPDATE `MessagingConfig` SET `key` = 'uls' WHERE `id` = @survivor;

-- 4. Keep every message log by repointing it at the survivor. MessageLog
--    cascades on delete, so this must happen before step 5.
UPDATE `MessageLog` SET `configId` = @survivor WHERE @survivor IS NOT NULL;

-- 5. Remove the now-redundant per-client rows.
DELETE FROM `MessagingConfig` WHERE @survivor IS NOT NULL AND `id` <> @survivor;

-- 6. Seed an empty configuration when there was none at all, so the screen
--    always has a row to edit.
INSERT INTO `MessagingConfig` (`id`, `key`, `createdAt`, `updatedAt`)
SELECT CONCAT('cfg', REPLACE(UUID(), '-', '')), 'uls', NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `MessagingConfig`);

-- 7. Enforce the singleton and drop the per-client columns.
ALTER TABLE `MessagingConfig` MODIFY COLUMN `key` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `MessagingConfig_key_key` ON `MessagingConfig`(`key`);

DROP INDEX `MessagingConfig_clientId_key` ON `MessagingConfig`;
DROP INDEX `MessagingConfig_clientId_idx` ON `MessagingConfig`;

ALTER TABLE `MessagingConfig`
    DROP COLUMN `clientId`,
    DROP COLUMN `clientMessagingEnabled`,
    DROP COLUMN `type`,
    DROP COLUMN `config`;
