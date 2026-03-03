-- DataMigration: rename source 'meal' → 'recipe' (idempotent — safe to run multiple times)
UPDATE "ShoppingListItem" SET source = 'recipe' WHERE source = 'meal';

-- AlterTable
ALTER TABLE "MasterListItem" ADD COLUMN     "canonicalName" TEXT;

-- AlterTable
ALTER TABLE "ShoppingListItem" ADD COLUMN     "canonicalName" TEXT,
ADD COLUMN     "masterItemId" TEXT,
ADD COLUMN     "matchConfidence" TEXT,
ALTER COLUMN "source" SET DEFAULT 'recipe';

-- CreateTable
CREATE TABLE "IngredientMapping" (
    "id" TEXT NOT NULL,
    "recipeName" TEXT NOT NULL,
    "masterItemId" TEXT NOT NULL,
    "confirmedCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngredientMapping_recipeName_idx" ON "IngredientMapping"("recipeName");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientMapping_recipeName_masterItemId_key" ON "IngredientMapping"("recipeName", "masterItemId");

-- CreateIndex
CREATE INDEX "ShoppingListItem_masterItemId_idx" ON "ShoppingListItem"("masterItemId");

-- AddForeignKey
ALTER TABLE "ShoppingListItem" ADD CONSTRAINT "ShoppingListItem_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientMapping" ADD CONSTRAINT "IngredientMapping_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
