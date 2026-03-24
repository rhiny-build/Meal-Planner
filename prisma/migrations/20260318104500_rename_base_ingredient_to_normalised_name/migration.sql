-- Rename baseIngredient to normalisedName on MasterListItem (data-preserving)
ALTER TABLE "MasterListItem" RENAME COLUMN "baseIngredient" TO "normalisedName";
