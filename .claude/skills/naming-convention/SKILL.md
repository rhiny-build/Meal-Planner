---
name: naming-convention
description: conventions for naming entities in the codebase to ease maintainability.
---

# Naming Conventions

## Core Principle
Name things after **what they do to what**, not **how they do it**.

Good: `normaliseRecipeIngredient` — operation (normalise) + subject (recipe ingredient)
Bad: `normaliseIngredientCached` — implementation detail (cached) tells you nothing about when to use it

---

## Functions

### Pattern: `[verb][Subject][Context?]`

- Verb first, subject second, optional context last
- Use the domain language, not technical language

**Examples:**
```
normaliseRecipeIngredient()       ✓   — not normaliseIngredientCached
normaliseMasterItem()             ✓   — not normaliseIngredients (AI batch version)
matchRecipeIngredientToMaster()   ✓   — not matchIngredientsAgainstMasterList
stripSupermarketNoise()           ✓   — not preProcess / clean / sanitise
generateShoppingList()            ✓   — not buildList / createItems
```

**Verbs to use:**
- `get` — fetch from DB, no computation
- `find` — search with criteria
- `generate` — compute/build something new
- `normalise` — reduce to canonical form
- `match` — find correspondence between two things
- `strip` — remove unwanted content
- `aggregate` — combine multiple items into one

**Verbs to avoid:**
- `process` — too vague
- `handle` — too vague
- `do` — obviously too vague
- `manage` — too vague

---

## Variables

### No single-letter variables except loop indices
```typescript
// Bad
const x = normaliseName(i.name)
const r = await prisma.masterListItem.findMany()

// Good
const normalisedName = normaliseName(ingredient.name)
const masterItems = await prisma.masterListItem.findMany()
```

### Name booleans as questions
```typescript
// Bad
const confident = true
const match = false

// Good
const isConfident = true
const hasMatch = false
```

### Name arrays as plurals of their contents
```typescript
// Bad
const data = ingredients.map(...)
const list = masterItems.filter(...)

// Good
const normalisedIngredients = ingredients.map(...)
const unmatchedItems = masterItems.filter(...)
```

---

## Files

### Pattern: `[subject][Operation].ts` or `[subject].ts`

```
normalise.ts              — core normalisation logic (the rules)
normaliseRecipeIngredient.ts  — the pipeline entry point
normaliseMasterItem.ts    — master list normalisation
matchIngredients.ts       — matching logic
shoppingListHelpers.ts    → shoppingList.ts (helpers suffix is noise)
```

- No `helpers`, `utils`, `misc`, or `common` suffixes — these are where naming goes to die
- If a file needs a vague suffix, it means it's doing too many things

---

## Domain-Specific Terms

Always use these exact terms consistently across code, comments, and variable names:

| Term | Meaning | Not |
|------|---------|-----|
| `recipeIngredient` | Raw ingredient string from a recipe | `ingredient`, `item`, `name` |
| `masterItem` | A row in MasterListItem table | `masterListItem`, `item` |
| `normalisedName` | The normalised matching key e.g. "garlic (fresh)" | `canonical`, `normalisedName` |
| `baseIngredient` | The semantic base e.g. "garlic" — **deprecated, use normalisedName** | |
| `shoppingListItem` | A row in ShoppingListItem table | `item`, `listItem` |
| `purchaseHistory` | Records from receipt imports | `receipts`, `purchases` |
| `rawName` | Exact string from a receipt e.g. "Sainsbury's Garlic x4" | `name`, `productName` |

---

## What to Do When Unsure

Ask: "If someone reads this name without seeing the implementation, will they know exactly what it does and when to call it?"

If no — rename it.