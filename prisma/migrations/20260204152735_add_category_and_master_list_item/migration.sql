/*
  Warnings:

  - You are about to drop the `RestockItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Staple` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "RestockItem";

-- DropTable
DROP TABLE "Staple";

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterListItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "MasterListItem_categoryId_idx" ON "MasterListItem"("categoryId");

-- CreateIndex
CREATE INDEX "MasterListItem_type_idx" ON "MasterListItem"("type");

-- AddForeignKey
ALTER TABLE "MasterListItem" ADD CONSTRAINT "MasterListItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
