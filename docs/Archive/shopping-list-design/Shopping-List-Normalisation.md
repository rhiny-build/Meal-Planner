# Ingredient Normalisation System

## Overview

This document describes the ingredient normalisation system for the meal planning app. Its purpose is to intelligently filter recipe ingredients against the user's staples and restock lists when generating a weekly shopping list. This design should gradually replace the existing solution.

## The Problem

Recipe ingredients are written in cooking language:
- "1/2 tsp sea salt"
- "freshly ground black pepper"
- "1 pound salmon fillet"

Staples and restock items are stored as real supermarket products (or a mixture of those and generic names):
- "Sainsbury's German Salami Slices x17 170g"
- "Frylight Golden Sunflower Oil Cooking Spray 190ml"

These will never match with simple string comparison. The system needs to extract a **base ingredient** from both sides so they can be compared meaningfully.

---

## The Solution: baseIngredient Field

A `baseIngredient` field is added to the `MasterListItem` table. This field stores the normalised base concept of each staple/restock item, pre-computed at save time.

### Examples

| Full name | baseIngredient |
|---|---|
| Sainsbury's Baby Plum Tomatoes 325g | baby plum tomatoes |
| Frylight Golden Sunflower Oil Cooking Spray | oil |
| Sainsbury's German Salami Slices x17 170g | salami |
| Sainsbury's Garlic Granules 58g | garlic granules |
| Garlic | garlic |
| Sainsbury's Red Seedless Grapes 500g | red grapes |
| Sainsbury's White Seedless Grapes 500g | white grapes |

### Normalisation Rules

When extracting base ingredients, the AI should:

**Strip:**
- Brand names ("Sainsbury's", "Warburtons", "Müller")
- Quantities and weights ("325g", "x5", "1kg", "2L")
- Generic quality descriptors ("fresh", "organic", "large", "free range")
- Preparation descriptors that don't change the product ("sliced", "grated", "pre-sliced")

**Keep:**
- Descriptors that distinguish the product type ("baby plum" vs "salad", "red" vs "white", "smoked" vs "unsmoked")
- Specific product types that matter for cooking ("garlic granules" ≠ "garlic")
- Compound names where both words matter ("spring onions", "pine nuts", "soy sauce")

---

## Shopping List Generation Flow

```
Meal plan (7 recipes)
        ↓
Extract all recipe ingredients (raw text, original preserved)
        ↓
Single AI call: normalise each recipe ingredient to base concept
        ↓
Match normalised recipe ingredients against MasterListItem.baseIngredient
        ↓
Match found → SKIP (it's a staple or restock)
No match → ADD to shopping list (using original recipe ingredient text)
        ↓
Output: clean shopping list with only items to buy
```

---

## Planned Evolution

### MVP (current)
Filter staples and restock items from the shopping list using base ingredient matching.

### MVP+1: Quantity Aggregation
- Parse quantities from recipe ingredients ("500g", "1 pound", "2 tbsp")
- Convert to consistent units
- Aggregate totals per base ingredient across all recipes
- Output: "chicken breast - 1.2kg total across 3 recipes"

### MVP+2: Inventory Awareness
- Track current stock levels for restock items
- Compare weekly recipe requirements against what's in the pantry
- Flag: "you need 3 tsp paprika this week but only have 1 tsp"
- Suggest: "add paprika to this week's order"

### Future: Pattern Learning
- Learn usage rates over time ("you use ~20g paprika per week")
- Proactive restocking alerts
- Seasonal patterns

---

## Data Model

### MasterListItem (current + new field)

```typescript
model MasterListItem {
  id             String  @id
  name           String  // full product name, never modified
  type           String  // "staple" | "restock"
  categoryId     String
  order          Int
  baseIngredient String? // NEW: normalised base concept for matching
}
```

---

## Non-Goals

- The `name` field is never modified - it always reflects the real product name
- `baseIngredient` is only used internally for matching, never shown in the shopping UI
- Recipe ingredients are never modified - originals are always preserved for cooking display