-- Backfill normalisedName from canonicalName where missing, then drop canonicalName
UPDATE "MasterListItem"
SET "normalisedName" = "canonicalName"
WHERE "normalisedName" IS NULL AND "canonicalName" IS NOT NULL;

ALTER TABLE "MasterListItem" DROP COLUMN "canonicalName";
