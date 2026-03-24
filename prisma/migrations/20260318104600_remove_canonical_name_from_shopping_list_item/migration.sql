-- Remove canonicalName from ShoppingListItem (transient, not persisted)
ALTER TABLE "ShoppingListItem" DROP COLUMN "canonicalName";
