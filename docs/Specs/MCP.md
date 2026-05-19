# Meal Planner MCP — Specification

**Version:** 0.1 (draft)  
**Status:** For review  
**Scope:** Read queries + recipe write operations via Claude chat

---

## 1. Purpose

Expose the Meal Planner app as an MCP server so that a connected Claude client can answer natural language questions about meal plans and shopping lists, and assist with recipe discovery and creation — persisting confirmed recipes back to the app.

This is a learning exercise in MCP server construction. The spec intentionally keeps scope narrow and explicit.

---

## 2. Use Cases

| ID | Description | Type |
|----|-------------|------|
| UC-1 | Ask what the meal plan is for today, a specific day, or the current week | Read |
| UC-2 | Ask questions about the latest shopping list (contents, patterns) | Read |
| UC-3 | Given a list of ingredients, find matching existing recipes | Read |
| UC-4 | Discover or generate new recipes; confirm and persist to the app | Write |

---

## 3. Out of Scope (v0.1)

- Modifying an existing meal plan
- Editing or deleting existing recipes
- Generating or modifying shopping lists
- Managing staples / restock items
- AI meal plan generation (previously paused in-app feature)
- Authentication / multi-user support

---

## 4. MCP Tools

### 4.1 `get_meal_plan`

Returns the meal plan for a given week, defaulting to the current week.

**Input**
```ts
{
  week_start_date?: string  // ISO 8601 date (e.g. "2026-05-19")
                            // Defaults to the current configured week start
}
```

**Output**
```ts
{
  week_start_date: string,
  days: Array<{
    date: string,           // ISO 8601
    day_name: string,       // "Monday" etc.
    lunch: Meal | null,
    dinner: Meal | null
  }>
}

type Meal = {
  recipe_id: string,
  recipe_name: string,
  carbs: string,            // e.g. "rice"
  protein: string,          // e.g. "chicken"
  veg: string               // e.g. "broccoli"
}
```

**Notes**
- No explicit "week" entity exists in the DB. The server derives the week from meal plan dates, using `week_start_date` on shopping lists as the reference anchor where needed.
- If no plan exists for the requested week, return an empty days array with a `plan_exists: false` flag rather than an error.
- Claude uses this to answer UC-1 queries. Coarse granularity is intentional — Claude reasons over the full week rather than requiring separate per-day tool calls.

---

### 4.2 `get_shopping_history`

Returns all shopping lists with their items, enabling Claude to reason across history.

**Input**
```ts
{
  limit?: number            // Max number of lists to return, most recent first.
                            // Defaults to all. Provided as an escape valve if 
                            // history grows large.
}
```

**Output**
```ts
{
  lists: Array<{
    list_id: string,
    generated_at: string,   // ISO 8601 datetime
    week_start_date: string,
    items: Array<{
      name: string,         // normalised item name
      category?: string,    // e.g. "produce", "dairy" — if available
      source: "recipe" | "restock" | "staple"
    }>
  }>
}
```

**Notes**
- Intentionally returns full history so Claude can reason across lists (e.g. "when did I last order maple syrup?", "have I ever bought X?").
- Items reflect what was generated for that week, not what was actually purchased.
- Category is optional since it may not yet be consistently populated in the app.

---

### 4.3 `get_recipes`

Returns the full recipe catalogue, optionally filtered. Used both for ingredient-matching (UC-3) and as context when suggesting new recipes (UC-4).

**Input**
```ts
{
  query?: string            // Free-text filter on recipe name/tags — server does a 
                            // simple case-insensitive match, Claude does the reasoning
}
```

**Output**
```ts
{
  recipes: Array<{
    recipe_id: string,
    name: string,
    ingredients: Array<{
      name: string,         // normalised ingredient name
      quantity?: string
    }>,
    metadata: {
      carbs?: string,
      protein?: string,
      veg?: string,
      tags?: string[],
      source?: string       // e.g. "Ottolenghi", "improvised" — if captured
    }
  }>
}
```

**Notes**
- No pagination in v0.1. Assumption: recipe catalogue is small enough to return in full.
- This tool serves UC-3 (ingredient matching) with no write side-effect. Claude does the matching logic.

---

### 4.4 `create_recipe`

Persists a new recipe to the app. Only called after explicit user confirmation in conversation.

**Input**
```ts
{
  name: string,
  ingredients: Array<{
    name: string,           // will be normalised server-side
    quantity?: string
  }>,
  metadata: {
    carbs?: string,
    protein?: string,
    veg?: string,
    tags?: string[],
    source?: string         // e.g. "Claude suggestion", "BBC Good Food"
  }
}
```

**Output**
```ts
{
  success: boolean,
  recipe_id: string,        // assigned by the app
  name: string
}
```

**Notes**
- Ingredient normalisation (mapping to `normalisedName`) is the app's responsibility, not the MCP layer's.
- The MCP server must never call this tool speculatively. The Claude client confirms with the user in natural language first; `create_recipe` is only invoked on explicit user approval.
- On failure, return `success: false` with an `error` string — do not throw.

---

## 5. Interaction Patterns

### Recipe discovery and creation (UC-4)

```
User:    "Find me a new pasta recipe — something with courgette"
Claude:  [calls get_recipes to check existing catalogue]
         [reasons / generates a new recipe suggestion]
         "Here's one: Courgette & lemon ricotta pasta. Ingredients: ...
          Want me to save this to your app?"
User:    "Yes go ahead"
Claude:  [calls create_recipe]
         "Done — saved as 'Courgette & Lemon Ricotta Pasta' (ID: rec_xyz)"
```

### Ingredient matching (UC-3)

```
User:    "I've got courgette, feta, and cherry tomatoes — what can I make?"
Claude:  [calls get_recipes]
         [reasons over returned catalogue]
         "You could make your Baked Feta with Tomatoes — you have all the 
          main ingredients. Or your Mediterranean roast, missing only aubergine."
```

---

## 6. Transport & Hosting

- **Protocol:** MCP Streamable HTTP (single endpoint, handles both request/response and streaming)
- **Endpoint:** `POST /api/mcp` within the existing Next.js app
- **Hosting:** Co-deployed with the existing app (Vercel or equivalent) — no separate service or infrastructure required
- **Data access:** Direct Prisma access via the existing app's DB setup
- **Registration:** Added as a remote connector in claude.ai settings via the deployed URL

---

## 7. Open Questions

| # | Question | Notes |
|---|----------|-------|
| OQ-1 | ~~Does the app have a concept of shopping list history?~~ | **Resolved:** History exists. Tool redesigned as `get_shopping_history`. |
| OQ-2 | ~~What is the actual data shape for a recipe in the DB?~~ | **Dropped:** Output contract defined in spec; DB shape is an implementation detail. |
| OQ-3 | ~~Is there a "week" entity in the DB?~~ | **Resolved:** No week entity. Week is derived from dates; `week_start_date` on shopping lists is the closest anchor. |
| OQ-4 | Should `create_recipe` also optionally add the recipe to the current week's plan? | Parked for v0.2. |

---

## 8. Acceptance Criteria

| UC | Criterion |
|----|-----------|
| UC-1 | Claude can correctly answer "what's for dinner tonight" using live app data |
| UC-2 | Claude can answer "when did I last order maple syrup?" and similar history queries across all shopping lists |
| UC-3 | Claude can identify which existing recipes are makeable from a given set of ingredients |
| UC-4 | Claude can suggest a new recipe, wait for confirmation, and persist it — with the recipe visible in the app afterwards |