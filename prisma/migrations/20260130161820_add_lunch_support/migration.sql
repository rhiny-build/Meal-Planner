-- AlterTable
ALTER TABLE "MealPlan" ADD COLUMN     "lunchRecipeId" TEXT;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "isLunchAppropriate" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_lunchRecipeId_fkey" FOREIGN KEY ("lunchRecipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
