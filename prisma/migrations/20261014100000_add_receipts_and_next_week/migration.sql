-- AlterTable
ALTER TABLE "PurchaseHistory" ADD COLUMN     "lineIndex" INTEGER,
ADD COLUMN     "orderNumber" TEXT;

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "blobPath" TEXT NOT NULL,
    "expectedCount" INTEGER,
    "lineCount" INTEGER NOT NULL,
    "unitCount" INTEGER NOT NULL,
    "countMatches" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMapping" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "aisle" TEXT NOT NULL,
    "cupboard" BOOLEAN NOT NULL DEFAULT false,
    "corrected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NextWeekTick" (
    "id" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "key" TEXT NOT NULL,
    "ticked" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NextWeekTick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_orderNumber_key" ON "Receipt"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMapping_productName_key" ON "ProductMapping"("productName");

-- CreateIndex
CREATE INDEX "ProductMapping_itemName_idx" ON "ProductMapping"("itemName");

-- CreateIndex
CREATE UNIQUE INDEX "NextWeekTick_orderDate_key_key" ON "NextWeekTick"("orderDate", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseHistory_orderNumber_lineIndex_key" ON "PurchaseHistory"("orderNumber", "lineIndex");

