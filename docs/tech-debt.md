# Tech Debt

## Backlog

### Week of 2026-03-16: lib/ and scripts/ restructuring
The following folders in `lib/` and `scripts/` predate the domain structure
and should be reorganised to match the purchase-history domain pattern:

- `lib/normalisation/` → `lib/shopping-list/normalisation/`
- `lib/ai/` → evaluate whether this is truly shared or shopping-list specific
- `lib/hooks/` → review and assign to appropriate domain
- Flat files in `lib/` (shoppingListHelpers, ingredientParser, etc.) → `lib/shopping-list/`
- `scripts/backfill-*.ts` → `scripts/shopping-list/`
- `scripts/evalNormaliser.ts` → `scripts/shopping-list/` or `scripts/eval/`

Do not move files without updating all imports. Run tests after each move.
