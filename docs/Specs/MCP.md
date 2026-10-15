# Meal Planner MCP — Specification

**Version:** 0.3  
**Status:** Implemented (tools 4.1 to 4.7); authentication still open (OQ-5)  
**Scope:** Read queries, recipe write operations (create, edit) and meal-plan tools via Claude chat

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

## 3. Out of Scope

- Modifying an existing meal plan
- Deleting recipes (editing an existing recipe is in scope since v0.2: `update_recipe`)
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

Returns the recipe catalogue, optionally filtered. Used for ingredient-matching (UC-3), as context when suggesting new recipes (UC-4), to avoid duplicates, and to find a `recipe_id`. Does not return the method; use `get_recipe` for that.

**Input**
```ts
{
  query?: string            // Case-insensitive substring match on recipe name
}
```

**Output**
```ts
{
  recipes: Array<{
    recipe_id: string,
    name: string,
    kind: "full" | "quick",
    has_method: boolean,    // true if the recipe has at least one step
    servings: number | null,
    ingredients: Array<{
      name: string,
      quantity?: string     // quantity and unit as text
    }>,
    metadata: {
      carbs?: string,
      protein?: string,
      veg?: string,
      source?: string       // recipe URL or name, if captured
    }
  }>
}
```

**Notes**
- No pagination. Assumption: the catalogue is small enough to return in full.
- Read-only. Claude does the matching logic.

---

### 4.4 `create_recipe`

Persists a new recipe to the app. Only called after explicit user confirmation in conversation. The tool description instructs Claude to check `get_recipes` first and use `update_recipe` if the recipe exists, and never to invent a method. There is no server-side duplicate-name guard.

**Input**
```ts
{
  name: string,
  kind?: "full" | "quick",          // default "full"
  servings?: number,                // people the ingredient amounts serve
  description?: string,
  totalTimeMinutes?: number,
  notes?: string,
  ingredients: Array<{
    name: string,                   // name only, no amount or preparation
    amount?: number,                // numeric, used to scale servings
    unit?: string,
    quantity?: string,              // legacy free text, e.g. "2 cups"; optional when amount is given
    notes?: string
  }>,
  steps?: Array<{                   // the method; omit if there is no real method
    text: string,                   // may contain {ing:N}, see "Step references" below
    timerSeconds?: number
  }>,
  metadata?: {
    carbs?: string,
    protein?: string,
    veg?: string,
    source?: string                 // maps to the recipe URL field (can hold a URL or a name)
  }
}
```

**Output**
```ts
{
  success: boolean,
  recipe_id: string,        // assigned by the app
  name: string
  // plus ingredient and step counts
}
```

**Notes**
- The old shape (`name`, `ingredients[{name, quantity}]`, `metadata`) still works unchanged. `tags` was never implemented.
- If `amount` is given and `quantity` is not, `quantity` is filled with the formatted number. If only `quantity` is given, the numeric `amount` is parsed from it (null when unsure).
- Tier is always `new` for recipes created through MCP.
- Everything is saved in one transaction: a bad step reference saves nothing.
- On failure, return `success: false` with an `error` string and MCP `isError: true`; do not throw.
- The MCP server must never call this tool speculatively. The Claude client confirms with the user in natural language first.

**Step references (`{ing:N}`)**
Claude cannot know database ids before the recipe exists, so steps point into the submitted ingredient list: `"Whisk {ing:1} and {ing:2}"`, N being the 1-based position. The server rewrites each into the real `{ing:<id>}` token, which the app renders as amount + unit + name, scaled by servings. Out-of-range positions (0, or beyond the list) are rejected with a message naming the step. Real ingredient ids of the same recipe are also accepted, so `get_recipe` output can be sent back unchanged.

---

### 4.5 `get_recipe`

Returns one recipe in full. Always called before `update_recipe`.

**Input**
```ts
{ id: string }              // recipe_id from get_recipes or create_recipe
```

**Output**
```ts
{
  recipe_id: string, name: string, kind: "full" | "quick",
  servings: number | null, description: string | null,
  total_time_minutes: number | null, notes: string | null,
  has_method: boolean,
  ingredients: Array<{ position: number, ingredient_id: string, name: string,
                       amount: number | null, unit: string | null,
                       quantity: string | null, notes: string | null }>,
  steps: Array<{ position: number,
                 text: string,                  // rendered with amounts, for showing the user
                 text_with_references: string,  // raw {ing:<id>} tokens, to send back to update_recipe
                 timer_seconds: number | null }>,
  metadata: { carbs?, protein?, veg?, source? }
}
```

**Notes**
- Read-only. An unknown id returns `success: false` with `isError: true`. A recipe with no steps is normal, not an error.

---

### 4.6 `update_recipe`

Changes an existing recipe. Only called after Claude has told the user exactly what will change and they agreed.

**Input**
```ts
{
  id: string,
  name?: string,
  kind?: "full" | "quick",
  servings?: number | null,
  description?: string | null,
  totalTimeMinutes?: number | null,
  notes?: string | null,
  metadata?: { carbs?: string | null, protein?: string | null, veg?: string | null, source?: string | null },
  ingredients?: Array<...>,   // same shape as create_recipe; REPLACES the whole list
  steps?: Array<...>          // same shape as create_recipe; REPLACES the whole method ([] removes it)
}
```

**Output**
```ts
{ success: boolean, changed: string[], ingredient_count: number, step_count: number }
```

**Notes**
- It is a patch: omitted means unchanged, `null` clears (servings, description, totalTimeMinutes, notes, metadata fields).
- `{ing:N}` in `steps` refers to the position in the final ingredient list. When ingredients are replaced and no new steps are sent, existing step references are re-pointed to the new ingredient with the same name (case-insensitive); if that ingredient was dropped, the reference becomes its plain name.
- Runs in one transaction: a bad reference changes nothing. Errors return `success: false` with `isError: true`.

### 4.7 Meal-plan tools (`lib/mcp/tools/planTools.ts`)

Five tools let Claude.ai read and adjust the week. There is no agent code in the app for this: Claude.ai is the agent, the server only exposes tools. These writes are not recorded as agent runs.

| Tool | What it does |
|------|--------------|
| `get_plan_days` | Read the saved plan for a date range (at most 60 days): lunch, protein, carb and vegetable recipes per day (id and name; empty slots null). Read-only. |
| `get_day_notes` | Read the notes written on days (e.g. "football till 7") for a date range. Read-only. |
| `set_day_note` | Write, or with an empty note clear, the note on one day. Applies straight away. |
| `search_recipes` | Find plan candidates by slot, kind, tier and name words, ordered longest-since-planned first (`daysSinceOnPlan`; `notOnPlanInLastDays` avoids repeats). Read-only. |
| `set_meal_slot` | Set (or clear with `recipe_id: null`) one slot of one day in the saved plan. No draft step. If the week has a draft waiting in the app, the result carries a warning that accepting that draft will replace the change. |

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
| OQ-4 | Should `create_recipe` also optionally add the recipe to the current week's plan? | Parked. |
| OQ-5 | **Authentication.** `/api/mcp` has no authentication: anyone with the URL can read recipes, meal plans and shopping history, create recipes, and overwrite or wipe any recipe's method and ingredients via `update_recipe`. | Open. Options: a long random token in the path or a header check from an env var, or OAuth (claude.ai custom connectors support both). Tracked in BACKLOG. |

---

## 8. Acceptance Criteria

| UC | Criterion |
|----|-----------|
| UC-1 | Claude can correctly answer "what's for dinner tonight" using live app data |
| UC-2 | Claude can answer "when did I last order maple syrup?" and similar history queries across all shopping lists |
| UC-3 | Claude can identify which existing recipes are makeable from a given set of ingredients |
| UC-4 | Claude can suggest a new recipe, wait for confirmation, and persist it — with the recipe visible in the app afterwards |