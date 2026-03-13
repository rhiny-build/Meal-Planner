-- CreateTable
CREATE TABLE "PurchaseHistory" (
    "id" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "masterItemId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'batch_import',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseHistory_purchaseDate_idx" ON "PurchaseHistory"("purchaseDate");

-- AddForeignKey
ALTER TABLE "PurchaseHistory" ADD CONSTRAINT "PurchaseHistory_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
