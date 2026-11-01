-- CreateTable
CREATE TABLE "IngredientMatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "itemName" TEXT,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "itemsVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngredientMatch_name_key" ON "IngredientMatch"("name");

-- CreateIndex
CREATE INDEX "IngredientMatch_status_source_idx" ON "IngredientMatch"("status", "source");
