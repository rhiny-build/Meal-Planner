-- AlterTable
ALTER TABLE "ShoppingList" ADD COLUMN     "stale" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ShoppingListItem" ADD COLUMN     "similarityScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "RejectedSuggestion" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "masterItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RejectedSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RejectedSuggestion_canonicalName_idx" ON "RejectedSuggestion"("canonicalName");

-- CreateIndex
CREATE UNIQUE INDEX "RejectedSuggestion_canonicalName_masterItemId_key" ON "RejectedSuggestion"("canonicalName", "masterItemId");

-- AddForeignKey
ALTER TABLE "RejectedSuggestion" ADD CONSTRAINT "RejectedSuggestion_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
