-- CreateTable
CREATE TABLE "DishType" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DishType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DishType_category_idx" ON "DishType"("category");

-- CreateIndex
CREATE UNIQUE INDEX "DishType_category_value_key" ON "DishType"("category", "value");

-- Seed initial protein types (matching current hardcoded values)
INSERT INTO "DishType" ("id", "value", "label", "category", "order", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'chicken', 'Chicken', 'protein', 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'fish', 'Fish', 'protein', 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'red-meat', 'Red Meat', 'protein', 2, NOW(), NOW()),
  (gen_random_uuid()::text, 'vegetarian', 'Vegetarian', 'protein', 3, NOW(), NOW());

-- Seed initial carb types (matching current hardcoded values)
INSERT INTO "DishType" ("id", "value", "label", "category", "order", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'rice', 'Rice', 'carb', 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'pasta', 'Pasta', 'carb', 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'couscous', 'Couscous', 'carb', 2, NOW(), NOW()),
  (gen_random_uuid()::text, 'fries', 'Fries', 'carb', 3, NOW(), NOW()),
  (gen_random_uuid()::text, 'other', 'Other', 'carb', 4, NOW(), NOW());
