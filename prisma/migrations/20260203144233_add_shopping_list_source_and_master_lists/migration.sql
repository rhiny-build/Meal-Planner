-- Add source column to ShoppingListItem (with default for existing rows)
ALTER TABLE "ShoppingListItem" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'meal';

-- Migrate existing data: isManual=true becomes source='manual'
UPDATE "ShoppingListItem" SET "source" = 'manual' WHERE "isManual" = true;

-- Drop the isManual column
ALTER TABLE "ShoppingListItem" DROP COLUMN "isManual";

-- Create Staple table
CREATE TABLE "Staple" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "unit" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staple_pkey" PRIMARY KEY ("id")
);

-- Create RestockItem table
CREATE TABLE "RestockItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "unit" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestockItem_pkey" PRIMARY KEY ("id")
);
