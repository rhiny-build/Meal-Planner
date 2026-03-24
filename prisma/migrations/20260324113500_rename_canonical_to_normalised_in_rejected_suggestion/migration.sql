-- Rename canonicalName → normalisedName in RejectedSuggestion
-- Uses ALTER COLUMN RENAME so data is preserved (no drop/add)

-- Drop old index and unique constraint
DROP INDEX IF EXISTS "RejectedSuggestion_canonicalName_idx";
ALTER TABLE "RejectedSuggestion" DROP CONSTRAINT IF EXISTS "RejectedSuggestion_canonicalName_masterItemId_key";

-- Rename the column
ALTER TABLE "RejectedSuggestion" RENAME COLUMN "canonicalName" TO "normalisedName";

-- Recreate index and unique constraint with new name
CREATE INDEX "RejectedSuggestion_normalisedName_idx" ON "RejectedSuggestion"("normalisedName");
CREATE UNIQUE INDEX "RejectedSuggestion_normalisedName_masterItemId_key" ON "RejectedSuggestion"("normalisedName", "masterItemId");
