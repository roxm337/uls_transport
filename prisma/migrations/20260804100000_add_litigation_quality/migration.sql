-- Structured historical volume imported from crm.xlsx. This is aggregate
-- source data and deliberately does not manufacture Expedition records.
ALTER TABLE `Client`
  ADD COLUMN `declaredExpeditionCount` INTEGER NOT NULL DEFAULT 0;

-- Every litigation case belongs to one of the four ULS operational classes.
ALTER TABLE `ClientClaim`
  ADD COLUMN `issueType` VARCHAR(191) NOT NULL DEFAULT 'RETARD';

CREATE INDEX `ClientClaim_issueType_idx` ON `ClientClaim`(`issueType`);

-- Private evidence documents. Binary files are stored outside the public
-- tree and are only served after checking client ownership or staff access.
CREATE TABLE `ClientClaimDocument` (
  `id` VARCHAR(191) NOT NULL,
  `claimId` VARCHAR(191) NOT NULL,
  `originalName` VARCHAR(191) NOT NULL,
  `storedName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `size` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `ClientClaimDocument_storedName_key`(`storedName`),
  INDEX `ClientClaimDocument_claimId_createdAt_idx`(`claimId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ClientClaimDocument`
  ADD CONSTRAINT `ClientClaimDocument_claimId_fkey`
  FOREIGN KEY (`claimId`) REFERENCES `ClientClaim`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
