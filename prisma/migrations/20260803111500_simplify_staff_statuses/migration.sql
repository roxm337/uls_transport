-- Staff accounts are created directly by an administrator. The former public
-- registration approval states no longer belong to this workflow.
UPDATE `User`
SET `status` = 'SUSPENDED'
WHERE `status` IN ('PENDING', 'REJECTED');

ALTER TABLE `User`
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';
