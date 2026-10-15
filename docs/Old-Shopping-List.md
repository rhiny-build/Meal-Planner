# Old shopping list

The first shopping list: built from the meal plan, a master list of staples and restock items, and ingredient matching. It still works exactly as before but is **hidden by default**. Settings > Preferences > "Show old shopping list" (stored as the `showOldShoppingList` row in `SystemSetting`) brings back the Meals, Staples, Restock and List tabs on the Shopping page, and the Master Lists and Categories tabs in Settings. The newer [Next week](../ARCHITECTURE.md#4-receipts-to-next-week) view is always shown. Removing the old list is a later decision.

Read this together with the data-model diagram in [ARCHITECTURE.md](../ARCHITECTURE.md#2-data-model). The code is the source of truth.

## What it does

- **Master list** (`MasterListItem`, grouped in `Category`): real supermarket products, each a `staple` (bought every week) or `restock` (as needed). Each has a `normalisedName` (e.g. "garlic (granules)") and an OpenAI embedding computed when it is saved.
- **Generate** ("Generate Shopping List" on the Meals tab) runs the sync pipeline in `app/(modules)/shopping-list/syncPipeline.ts` for one week:
  1. Collect and aggregate the week's recipe ingredients (`lib/shopping-list/aggregateRecipeIngredients.ts`).
  2. Normalise each ingredient: local rules first, Claude Haiku for the rest (`normaliseRecipeIngredient*.ts`; answers cached in the `NormalisationCache` table).
  3. Look each one up in `IngredientMapping` (confirmed "recipe name means this master item"); known ones are skipped because they are already on the staples list.
  4. For the rest, find likely master-list matches by embedding similarity (`matchRecipeToMaster.ts`): at 0.90 or above the match is automatic and a mapping is written; between 0.65 and 0.90 it is shown for confirmation (the review modal). Thresholds live in `lib/ai/config.ts`.
  5. Write what is left as `ShoppingListItem` rows with `source = 'recipe'`. Staple, restock and manual items are never replaced.
- **Confirm, reassign or reject** a suggestion (`suggestionActions.ts`): confirm and reassign write an `IngredientMapping`; reject writes a `RejectedSuggestion` so it is not suggested again.
- **Stale flag:** changing the meal plan (or accepting a draft week) marks that week's `ShoppingList` stale; the page offers to regenerate.
- **Export** copies the list as text.

## Who depends on what

| Part | Uses |
|---|---|
| Embeddings | OpenAI `text-embedding-3-small` (`lib/ai/openaiEmbeddings.ts`); this is the only place OpenAI is called |
| Normalising | Claude Haiku (`AI_CONFIG.normaliseIngredients`, `normaliseIngredientSingle`) |
| Tables | `ShoppingList`, `ShoppingListItem`, `Category`, `MasterListItem`, `IngredientMapping`, `RejectedSuggestion`, `NormalisationCache`; `PurchaseHistory.masterItemId` is an optional link that nothing uses now |
| Screens | `app/(modules)/shopping-list/*`, `app/(modules)/settings/components/MasterListsTab.tsx` and `CategoriesTab.tsx` |

Known quirks are in [BACKLOG.md](../BACKLOG.md) under "Old shopping list".
