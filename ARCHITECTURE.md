# Architecture Guide

This document explains the technical architecture of the Family Meal Planner app. Perfect for understanding how everything fits together.

## Technology Stack

### Frontend
- **Next.js 14+** - React framework with App Router
- **React 19** - UI library with Server & Client Components
- **TypeScript** - Type safety and better developer experience
- **Tailwind CSS v4** - Utility-first CSS framework

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma 5** - Database ORM with type generation
- **PostgreSQL** - Production-ready relational database (via Vercel Postgres)

### AI Integration
- **Claude (Anthropic API)** - all generative and agentic AI (URL/description import, meal-plan modify, ingredient normalisation, Inspire Me discovery, MCP). Via the official `@anthropic-ai/sdk`; needs `ANTHROPIC_API_KEY` (the key Vercel uses)
- **OpenAI API** - embeddings only (`text-embedding-3-small`, ingredient matching); needs `OPENAI_API_KEY`. OpenAI is not used for chat/generation, and Perplexity is gone
- **Models in one place** - `CLAUDE_MODELS` and `AI_CONFIG` in `lib/ai/config.ts`; never hardcode model names elsewhere

## Project Structure

Accurate as of the docs-sync after S07 (12 Oct 2026). Test files (`*.test.ts`, `tests/integration/`) are omitted; `components/` and `app/**/components/` are summarised.

```
/app                          # Next.js App Router
├── layout.tsx, page.tsx, globals.css
├── /(modules)                # Route group (no URL effect): modules with page.tsx + server actions
│   ├── /shopping-list        # page.tsx, actions.ts and *Actions.ts, syncPipeline.ts (5-step match), components/, hooks/
│   ├── /settings             # page.tsx, actions.ts, preferenceActions.ts, components/ (categories, dish types, master lists, preferences), hooks/
│   └── /purchase-history     # page.tsx
├── /meal-plan                # Weekly plan page (page.tsx, components/, helpers/)
│   └── dayNoteActions.ts     # Server actions: getDayNotesForWeek, saveDayNote (DB-backed day notes)
├── /recipes                  # Recipe book
│   ├── page.tsx              # Server component -> RecipesClient (filters incl. Type, cards, add/edit modal, Import, Inspire Me)
│   ├── components/           # RecipesClient, RecipeFilters, RecipeModal, RecipeImportModal, InspireModal
│   └── /[id]                 # Recipe page: page.tsx (ingredients, method, notes), RecipeMethod.tsx, RecipeActions.tsx (Edit; Cook is a disabled placeholder)
├── /agent-runs               # Agent runs page: page.tsx (list), [id]/page.tsx (step-by-step replay), StatusBadge.tsx
└── /api                      # Route handlers (external integrations and client-fetched data)
    ├── /recipes
    │   ├── route.ts          # GET (includes steps; ?kind=full|quick), POST
    │   ├── /create/route.ts  # POST new recipe
    │   ├── /[id]/route.ts    # GET, PATCH, DELETE
    │   ├── /discover/route.ts # POST Inspire Me (Claude web search)
    │   └── /import/route.ts  # POST run the importer agent; /import/save/route.ts saves a reviewed draft
    ├── /meal-plan            # route.ts, create/, update/, delete/, modify/ (natural-language modify)
    └── /mcp/route.ts         # MCP server (Streamable HTTP) for Claude.ai

/components                   # Shared UI
├── Button, Header, RecipeCard, Select, SearchableSelect, ThemeProvider
└── /recipe                   # RecipeEditor (whole form), IngredientsEditor, StepsEditor

/lib
├── /ai                       # Claude + embeddings layer
│   ├── claude.ts             # getAnthropic() lazy client; callForcedTool() one-shot structured output via a tool
│   ├── config.ts             # CLAUDE_MODELS, AI_CONFIG, embedding thresholds
│   ├── schemas.ts            # Tool input schemas
│   ├── discoverRecipes.ts    # Inspire Me: Claude + server-side web search
│   ├── modifyMealPlan.ts     # Natural-language meal plan changes
│   ├── openaiEmbeddings.ts   # OpenAI embeddings client (the only OpenAI use)
│   ├── prompts.ts, index.ts
├── /agents                   # Agent code (see "Agents" below)
│   ├── loop.ts               # Generic hand-written agent loop (runAgent)
│   ├── runLog.ts, runView.ts # Write AgentRun/AgentStep rows; shape them for /agent-runs
│   ├── /recipeImporter       # prompt.ts, enrichPrompt.ts, tools.ts, safeFetch.ts, pageText.ts, saveDraft.ts, types.ts, index.ts
│   └── /recipeBackfill       # plan.ts, classify.ts, enrich.ts, apply.ts, report.ts, cli.ts, types.ts (one-off, delete after use)
├── /mcp                      # server.ts, recipeInput.ts (shared zod schemas, step resolution), tools/ (getMealPlan, getShoppingHistory, getRecipes, getRecipe, createRecipe, updateRecipe)
├── /shopping-list            # aggregateRecipeIngredients, ingredientEmbeddings, matchRecipeToMaster, normaliseMasterItem, normaliseRecipeIngredient(+LLM)
├── /purchase-history         # frequencyAnalysis, purchaseMapping, suggestions
├── /hooks                    # useMealPlan, useDayNotes, migrateLocalStorageNotes (temporary), useRecipes, useAutoRefresh
├── recipeWrite.ts            # Single write path for recipes (create/update from form data)
├── recipeStepTokens.ts       # {ing:<id>} step token helpers
├── stepEditorText.ts         # Editor text {name} <-> stored {ing:<id>}
├── ingredientAmount.ts       # parseAmount(quantity, unit)
├── ingredientParser.ts, ingredientHelpers.ts, mealPlanHelpers.ts, dishTypeConfig.ts, recipeFormConfig.ts, selectThemeConfig.ts
├── aiService.ts, apiService.ts, dateUtils.ts, logger.ts, prisma.ts

/scripts
├── /shopping-list            # backfillNormalisedNames.ts, evalRecipeIngredientNormaliser.ts
├── /purchase-history         # import-receipts, upload-receipts, analyse-frequency, analyse-gaps
└── /rehaul                   # backfillRecipes.ts (one-off recipe backfill CLI) and synthetic/ (rehearsal fixtures; delete once applied)

/prisma
├── schema.prisma, seed.ts
├── migrateIngredients.ts     # Build step: legacy ingredient text -> Ingredient rows
├── backfillIngredientAmounts.ts # Build step: fills Ingredient.amount (idempotent; --dry-run, --list)
└── /migrations

/tests/integration            # Real-Postgres tests (npm run test:integration)
/restock-agent                # Untested WIP, to be rebuilt in the main app then deleted (PLAN D8)
/types/index.ts               # Shared types
```

The Vercel build runs `prisma generate`, `prisma migrate deploy`, `migrateIngredients.ts`, `backfillIngredientAmounts.ts`, then `next build`.

## Target Architecture (WIP)

To simplify the structure of the application and to enable faster iteration (and clearer boundaries between components), the architecture will evolve into a modules-based monolith.

### Core Principles

**1. Module-Based Structure**

The application will be structured around 3 core modules: `shopping-list`, `meal-plan`, `recipes`. Each module encapsulates its own pages, components, and business logic.

Modules live in a route group `(modules)` to organize them without affecting URLs:

```
/app/
  (modules)/              # Route group - doesn't affect URLs
    shopping-list/
      page.tsx            # Server component → /shopping-list
      actions.ts          # Server actions - mutations
      components/
    meal-plan/            # Future: migrate here
    recipes/              # Future: migrate here
  api/                    # External integrations only
  layout.tsx
  page.tsx                # Home → /
```

**2. Module Independence**

Modules should be "mostly independent" - they can query each other's data via Prisma (the database is the shared contract), but should never import code from other modules. Shared utilities live in `/lib/shared/`.

**3. Server Components for Reads, Server Actions for Writes**

| Operation Type | Mechanism | Location |
|----------------|-----------|----------|
| Data fetching (reads) | Server component with Prisma | `page.tsx` |
| Mutations (create/update/delete) | Server actions | `actions.ts` |
| External integrations (AI, auth, webhooks) | API routes | `/app/api/` |

**Why this split?**
- Server actions are POST-only, not suitable for cached/cacheable reads
- Server components can fetch data directly and pass to client components as props
- API routes remain necessary for external services that need HTTP endpoints

**4. When to Keep API Routes**

API routes are still appropriate for:
- AI integrations (recipe import agent, Inspire Me, meal plan modification)
- Webhooks from external services
- Endpoints that external clients need to call
- Complex multi-step operations that benefit from HTTP semantics

### Migration Approach

We will migrate incrementally, starting with new features:
1. Build `shopping-list` as a module first (new feature, low risk)
2. Use it as a template for refactoring `meal-plan` and `recipes`
3. Add test coverage before refactoring existing modules

## Data Flow

### Recipe Management Flow
```
User clicks "Add Recipe"
  ↓
RecipeForm component shows
  ↓
User fills the RecipeEditor form (ingredients, method steps, kind, servings...)
  ↓
POST /api/recipes/create → lib/recipeWrite.ts createRecipeFromForm → Prisma (amounts via parseAmount)
  ↓
Recipes page refetches data
  ↓
RecipeCard components display updated list
```

### Recipe Import Flow (agent)
```
User taps "Import", pastes a URL or describes a recipe
  ↓
POST /api/recipes/import → runRecipeImporter() → runAgent() loop (lib/agents/loop.ts)
  ↓ Claude calls tools: fetch_page, find_similar_recipes, then submit_recipe (or cannot_import_recipe)
Run recorded to AgentRun/AgentStep (visible on /agent-runs)
  ↓
Review screen shows the draft (nothing saved yet)
  ↓ "Save to recipe book"
POST /api/recipes/import/save → saveRecipeDraft (tier "new")
```

### Natural Language Modification Flow
```
User types "swap Tuesday for something faster"
  ↓
POST /api/meal-plan/modify
  ↓
API fetches current meal plan + all recipes
  ↓
Calls modifyMealPlan() in lib/ai/modifyMealPlan.ts
  ↓
Claude (via a tool call) understands the instruction and picks the new recipe
  ↓
API updates affected meal plans in database
  ↓
Returns explanation + updated plans
  ↓
UI shows changes and AI explanation
```

### Shopping List Flow (Module Pattern)

The shopping list uses a 5-step matching pipeline to intelligently match recipe ingredients against the household master list:

```
User visits /shopping-list
  ↓
Server component (page.tsx) fetches list via Prisma
  ↓
Data passed to client component (ShoppingListClient)
  ↓
User clicks "Generate Shopping List"
  ↓
Client calls syncMealIngredients() server action
  ↓
=== 5-Step Matching Pipeline ===

Step 1: COLLECT + AGGREGATE
  Fetch meal plans → extract ingredients → aggregate by name

Step 2: NORMALISE (local, no API)
  normaliseName() → canonical form: "garlic cloves" → "garlic (fresh)"

Step 3: EXPLICIT MAPPING LOOKUP
  Check IngredientMapping table for user-confirmed matches
  Matched → matchConfidence: 'explicit'

Step 4: EMBEDDING MATCH
  Embed canonicalName → cosine similarity vs master list embeddings
  Auto-matched at ≥0.90; 0.65-0.90 surfaces as a suggestion (thresholds in lib/ai/config.ts)

Step 5: CROSS-RECIPE DEDUP + WRITE
  Group unmatched items by canonicalName (string equality)
  Write to ShoppingListItem with matchConfidence: 'unmatched'
  Suppress items matched to restock, consolidate into staples
  ↓
revalidatePath() triggers page refresh with new data
  ↓
UI displays items with checkboxes for tracking
```

Debug logs are written after each step to `logs/embedding-match-*.log`.

**Note:** The shopping-list module is the first to use the new modular architecture:
- `app/(modules)/shopping-list/page.tsx` - Server component for data fetching
- `app/(modules)/shopping-list/actions.ts` - Server actions for mutations
- `app/(modules)/shopping-list/components/` - Client components

## Key Design Patterns

### 1. Server vs Client Components

**Server Components** (default):
- No `'use client'` directive
- Rendered on the server
- Can directly access database
- Cannot use hooks or browser APIs
- Examples: API routes, home page

**Client Components** (`'use client'`):
- Need interactive features (state, events)
- Use React hooks (useState, useEffect)
- Run in the browser
- Examples: Recipe form, meal plan page

### 2. API Route Handlers

Each route exports HTTP method functions:
```typescript
// app/api/recipes/route.ts
export async function GET(request: NextRequest) {
  // Fetch recipes
}

export async function POST(request: NextRequest) {
  // Create recipe
}
```

Dynamic routes use params:
```typescript
// app/api/recipes/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // params.id contains the recipe ID
}
```

### 3. Prisma Client Singleton

To avoid creating multiple Prisma clients in development:
```typescript
// lib/prisma.ts
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production')
  globalForPrisma.prisma = prisma
```

### 4. AI Abstraction Layer

All generative AI goes through `lib/ai/` (one-shot calls) or `lib/agents/` (tool loops), on Claude:
```typescript
// lib/ai/modifyMealPlan.ts
export async function modifyMealPlan(
  instruction: string,
  currentPlan: MealPlan[],
  allRecipes: Recipe[]
): Promise<ModifyResult>

// lib/ai/claude.ts: one tool, schema = the shape we want; the reply's tool_use.input is already an object
export async function callForcedTool<T>(...): Promise<T>
```

Function signatures are provider-independent, so callers do not know which model runs. Model names and token limits live only in `lib/ai/config.ts`. OpenAI is used only by `lib/ai/openaiEmbeddings.ts`.

### 5. Ingredient Parsing

The `lib/ingredientParser.ts` utility parses ingredient strings into structured data:
```typescript
// Parses "2 cups flour (sifted)" into:
{
  quantity: "2",
  unit: "cups",
  name: "flour",
  notes: "sifted"
}
```

This supports common formats:
- "2 cups flour" → quantity + unit + name
- "1/2 lb chicken breast" → fractional quantities
- "3 large eggs" → quantity + size modifier in name
- "salt and pepper to taste" → name only (no quantity/unit)

### 5. Type Safety with TypeScript

Types are defined in `types/index.ts` and used everywhere:
```typescript
// Define once
export interface RecipeFormData {
  name: string
  ingredients: string
  proteinType: ProteinType
  // ...
}

// Use everywhere
async function handleCreate(data: RecipeFormData) {
  // TypeScript ensures data has all required fields
}
```

## Database Schema

### Recipe Table
```prisma
model Recipe {
  id                    String       @id @default(cuid())
  name                  String
  ingredients           String       // Legacy text field (kept in step by the write paths; still read by some code)
  proteinType           String?
  carbType              String?
  vegetableType         String?
  recipeUrl             String?
  prepTime              String?      // quick | medium | long (coarse bucket)
  tier                  String
  isLunchAppropriate    Boolean      @default(false)
  kind                  String       @default("full") // 'full' | 'quick' (quick side/main, e.g. Simple Fries)
  servings              Int?         // People the ingredient amounts serve (scaling)
  description           String?
  totalTimeMinutes      Int?
  notes                 String?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt
  structuredIngredients Ingredient[]
  steps                 RecipeStep[] // Optional method; zero steps is normal
  // plus four MealPlan relations (lunch / protein / carb / vegetable), all onDelete: Cascade
}
```

Deleting a recipe deletes the meal-plan days that use it (cascade on all four slots).

### RecipeStep Table
```prisma
model RecipeStep {
  id           String @id @default(cuid())
  recipeId     String
  order        Int     // 0-based, contiguous; no unique constraint
  text         String  // May contain {ing:<ingredientId>} tokens
  timerSeconds Int?
  recipe       Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@index([recipeId, order])
}
```

Step text refers to ingredients with `{ing:<ingredientId>}` tokens (`lib/recipeStepTokens.ts`). Cook mode / the recipe page render a token as amount + unit + name, scaled by `servings wanted / recipe servings` (`renderStepText`, `describeIngredient`). An unknown or deleted id renders as "the ingredient"; malformed fragments are left as text; nothing throws. Writers must call `validateStepText` and reject unknown ids. The editor shows `{name}` instead (`lib/stepEditorText.ts`); MCP accepts `{ing:N}` (1-based position in the submitted ingredient list) and stores real ids.

### Ingredient Table
```prisma
model Ingredient {
  id        String   @id @default(cuid())
  recipeId  String
  name      String   // Ingredient name (e.g., "flour")
  quantity  String?  // Free-text amount as written (e.g., "1 1/2"); the fallback when amount is null
  unit      String?  // Unit of measurement (e.g., "cups")
  amount    Float?   // Numeric amount from parseAmount(quantity, unit), for servings scaling; null when unsure
  notes     String?  // Additional notes (e.g., "sifted")
  order     Int      // Display order
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  recipe    Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@index([recipeId])
}
```

### MealPlan Table
```prisma
model MealPlan {
  id        String   @id @default(cuid())
  date      DateTime
  dayOfWeek String
  lunchRecipeId     String?   // plus proteinRecipeId, carbRecipeId, vegetableRecipeId
  lunchRecipe       Recipe?   @relation("LunchRecipe", fields: [lunchRecipeId], references: [id], onDelete: Cascade)
  // ... same pattern for protein / carb / vegetable
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([date])  // For efficient date queries
}
```

`amount` is set on every save by `parseAmount` (`lib/ingredientAmount.ts`) in `lib/recipeWrite.ts`, the importer and the MCP tools; `prisma/backfillIngredientAmounts.ts` fills older rows at build time. The parser is conservative: ranges, sums, words ("a pinch") and unit conflicts stay null.

### DayNote Table
```prisma
model DayNote {
  id   String   @id @default(cuid())
  date DateTime @unique @db.Date   // calendar day, no time component
  text String
  // createdAt, updatedAt
}
```
Day notes on the meal-plan grid are stored here (previously browser localStorage), via `app/meal-plan/dayNoteActions.ts` (`getDayNotesForWeek`, `saveDayNote`; empty text deletes the row). Dates cross the server boundary as `YYYY-MM-DD` strings and are stored at UTC midnight, so no timezone shift. Last write wins. `useDayNotes` debounces saves by 600 ms and flushes on unmount / tab hide. Notes are keyed by date only, not linked to a `MealPlan` row.

### AgentRun and AgentStep Tables
```prisma
model AgentRun {
  id String @id @default(cuid())
  agent   String   // e.g. "recipe-importer"
  trigger String   // manual | batch | schedule | mcp
  input   Json
  status  String   @default("running") // running | succeeded | failed
  output  Json?
  error   String?
  startedAt DateTime @default(now())
  finishedAt DateTime?
  inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens Int @default(0)
  steps AgentStep[]
}

model AgentStep {
  id String @id @default(cuid())
  runId String
  order Int            // 0-based, contiguous
  kind String          // model | tool_call | tool_result | note (loop commentary)
  toolName String?
  payload Json         // model: {content, stopReason}; tool_call: {id, input}; tool_result: {output, isError}; note: {text, reason}
  inputTokens Int?     // model steps only
  outputTokens Int?
  run AgentRun @relation(fields: [runId], references: [id], onDelete: Cascade)
}
```
Allowed values are plain strings, not DB-enforced (like `tier`, `source`). Every agent records its runs here; `/agent-runs` reads them generically.

### ShoppingList Table (New)
```prisma
model ShoppingList {
  id        String             @id @default(cuid())
  weekStart DateTime           // Week start date (Monday)
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt
  items     ShoppingListItem[]

  @@unique([weekStart])  // One shopping list per week
}
```

### ShoppingListItem Table
```prisma
model ShoppingListItem {
  id              String          @id @default(cuid())
  shoppingListId  String
  name            String          // Ingredient name
  quantity        String?         // Amount
  unit            String?         // Unit of measurement
  notes           String?         // Additional notes
  checked         Boolean         @default(false)  // Purchased status
  source          String          @default("recipe") // 'recipe' | 'staple' | 'restock' | 'manual'
  canonicalName   String?         // Normalised name e.g. "garlic (fresh)"
  masterItemId    String?         // FK → MasterListItem (nullable)
  matchConfidence String?         // 'explicit' | 'embedding' | 'unmatched'
  order           Int             // Display order
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  shoppingList    ShoppingList    @relation(fields: [shoppingListId], references: [id], onDelete: Cascade)
  masterItem      MasterListItem? @relation(fields: [masterItemId], references: [id], onDelete: SetNull)

  @@index([shoppingListId])
}
```

### MasterListItem Table (Household items for matching)
```prisma
model MasterListItem {
  id              String              @id @default(cuid())
  name            String
  type            String              // 'staple' | 'restock'
  included        Boolean             @default(true)
  baseIngredient  String?             // LLM-extracted base concept (legacy)
  canonicalName   String?             // Normalised name e.g. "garlic (fresh)"
  embedding       Float[]             // text-embedding-3-small vector
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  mappings        IngredientMapping[]
  shoppingListItems ShoppingListItem[]
}
```

### IngredientMapping Table (Learned ingredient-to-master mappings)
```prisma
model IngredientMapping {
  id             String         @id @default(cuid())
  recipeName     String         // Normalised ingredient name
  masterItemId   String
  confirmedCount Int            @default(1)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  masterItem     MasterListItem @relation(fields: [masterItemId], references: [id], onDelete: Cascade)

  @@unique([recipeName, masterItemId])
  @@index([recipeName])
}
```

### Staple Table (Master list of weekly staples)
```prisma
model Staple {
  id        String   @id @default(cuid())
  name      String
  quantity  String?  // Optional default quantity
  unit      String?  // Optional default unit
  order     Int      // Display order
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### RestockItem Table (Household items bought as needed)
```prisma
model RestockItem {
  id        String   @id @default(cuid())
  name      String
  quantity  String?  // Optional default quantity
  unit      String?  // Optional default unit
  order     Int      // Display order
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## State Management

This app uses simple React state management:

**Local State** (`useState`):
- Component-specific data
- Form inputs
- UI state (modals, editing)

**Server State** (fetch + refetch):
- Database data (recipes, meal plans)
- Fetched on mount with `useEffect`
- Refetched after mutations

For a larger app, consider:
- React Query for server state
- Zustand or Redux for global state

## AI Integration Details

### Claude configuration
`getAnthropic()` (`lib/ai/claude.ts`) creates the SDK client lazily, so importing never needs a key. Models and limits come from `lib/ai/config.ts`:

- `CLAUDE_MODELS.agent` = `claude-sonnet-5-5` (import agent, meal-plan modify, discovery)
- `CLAUDE_MODELS.cheap` = `claude-haiku-5-5` (ingredient normalisers)
- `AI_CONFIG` holds per-function model and max tokens (`recipeImporter` also has `maxTurns: 8`; `discoverRecipes.webSearchMaxUses: 5`)

Env: `ANTHROPIC_API_KEY` (the key must have web search enabled). `claude-sonnet-5-5` rejects forced `tool_choice` and `thinking: disabled`, so `callForcedTool` offers one tool with `tool_choice: auto`, appends "Respond only by calling the X tool" to the system prompt, and throws if no `tool_use` block returns.

### Structured output via tools
Instead of asking for JSON in free text, each call defines a tool whose `input_schema` is the shape we want (schemas in `lib/ai/schemas.ts`). The `tool_use` block's `input` is already a parsed object.

### Discovery (Inspire Me)
`lib/ai/discoverRecipes.ts` gives Claude the Anthropic-hosted `web_search_20250305` tool (max 5 searches) plus a `submit_recipes` tool. It handles `pause_turn` continuations (up to 3) and nudges once if Claude answers in text. `POST /api/recipes/discover` is a thin wrapper.

### Agents (`lib/agents/`)
- **`loop.ts` `runAgent`**: a generic, hand-written tool loop (design decision D7). Each turn it calls Claude (`tool_choice: auto`), logs the turn, runs every requested tool, returns results as `tool_result` blocks (a thrown error becomes `is_error: true` so Claude can retry), and repeats. A tool marked `endsRun` ends the run with its output; one marked `givesUp` fails it with the model's reason. It also stops on an API error, a reply cut off by `max_tokens`, a model that ignores one nudge, or `maxTurns`. It never throws; it returns `{ runId, ok, output?, error?, gaveUpReason? }`.
- **`runLog.ts`**: `startRun({agent, trigger, input})` returns `{ id, step, finish, fail }`; writes `AgentRun` / `AgentStep` rows as the run goes. Token totals are written at the end (a run killed mid-way stays `running`; no cleanup job yet).
- **`recipeImporter/`**: the first agent. Tools: `fetch_page(url)`, `find_similar_recipes(name)`, `cannot_import_recipe(reason)` (honest exit) and `submit_recipe(recipe)` (final answer, validated by `buildDraft`; does not save). `pageText.ts` returns the schema.org Recipe from JSON-LD when present, else cleaned page text (capped at `EXTRACT_HTML_MAX_LENGTH`). The model supplies quantity and unit as written; the server fills `amount` with `parseAmount`, and sets the source URL. Step text uses temporary `{ing:i1}` keys that `saveRecipeDraft` rewrites to real ids in one transaction. Method is optional and never guessed (D3). One text box: a lone `http(s)` URL is a URL, anything else is a description (`classifyImportInput`).
- **`safeFetch.ts` (SSRF guard)**: the only way to fetch a user-supplied URL. http/https only; the host is resolved and every address must be public (blocks loopback, private, link-local incl. cloud metadata, multicast, IPv6 equivalents); redirects followed by hand (max 5), each re-checked; 15 s timeout; 2 MB cap; page content types only. `ALLOW_PRIVATE_FETCH=1` (dev/test only, ignored when `NODE_ENV=production`) allows loopback/private fixtures and never opens link-local. Known gap: DNS rebinding (address checked before the request, not pinned).
- **Enrich mode**: `runRecipeImporter(input, 'batch', { enrich })` (`enrichPrompt.ts`) runs the same agent against a recipe already in the book (without `find_similar_recipes`); the caller keeps only gaps in empty fields.
- **`recipeBackfill/`** + `scripts/rehaul/backfillRecipes.ts`: one-off backfill. `--dry-run` (default) writes `backfill-report.md/.json` (gitignored; one line per recipe: enrich / quick / leave / duplicate) and changes no recipe data (it only records `AgentRun` rows, trigger `batch`). `--apply <report.json> --i-have-a-backup` applies what is left in the JSON: fills only still-empty fields, never touches ingredients or existing steps, sets `quick` by plain name/ingredient-count rules (no AI), and merges duplicates only where `"approved": true`, re-pointing all four meal-plan slots before deleting. Idempotent; each recipe in its own transaction. Options: `--delay-ms`, `--token-budget`, `--only`, `--limit`. Remove the script and `lib/agents/recipeBackfill/` once applied in production.
- Cost guard: each real import took 3 to 5 model turns and 5k to 9k input tokens. No prompt caching yet.

### MCP server (`/api/mcp`, `lib/mcp/`)
Streamable HTTP MCP server (version 0.2.0) with six tools; spec in `docs/Specs/MCP.md`. Handlers are exported functions separate from `registerX` so they can be unit-tested. Read tools: `get_meal_plan`, `get_shopping_history`, `get_recipes` (adds `kind`, `has_method`, `servings`; no steps), `get_recipe` (one recipe in full; steps as `text` and `text_with_references`). Write tools: `create_recipe` (kind, servings, description, totalTimeMinutes, notes, steps with optional timers, legacy `ingredients[{name, quantity}]` + `metadata` still accepted) and `update_recipe` (a patch: omitted = unchanged, `null` = clear; `steps` and `ingredients` replace the whole list; one transaction). Tool descriptions are instructions to the model (confirm before writing, check `get_recipes` first, never invent a method). Shared code is `lib/mcp/recipeInput.ts`: zod schemas, `toIngredientRow` (fills `amount` via `parseAmount`), `resolveSteps` (`{ing:N}` to `{ing:<id>}`; replacing ingredients re-points tokens by name, dropped ones become plain text), `jsonResult` / `errorResult` (errors return `isError: true`). **The route has no authentication** (see BACKLOG).

## Performance Considerations

### Database
- PostgreSQL for production (via Vercel Postgres)
- Indexed queries on date for meal plans and shopping lists
- Cascade delete to maintain referential integrity
- Structured ingredients enable efficient shopping list aggregation

### API Routes
- Keep API handlers thin
- Move business logic to `lib/` folder
- Use proper HTTP status codes

### React
- Client components only where needed
- Fetch data on mount, cache in state
- Show loading states

### Future Optimizations
- Add React Query for caching
- Implement optimistic updates
- Use Next.js Image component for photos
- Add debouncing for search/filters

## Security Considerations

### Current (Development)
- API key in server-side env variables
- No authentication (single-user app)
- Input validation on API routes
- `/api/mcp` has no authentication (open BACKLOG item); `safeFetch` guards the importer against SSRF

### For Production
- Add user authentication (NextAuth.js)
- Implement rate limiting
- PostgreSQL already in use via Vercel Postgres
- Add CSRF protection
- Sanitize user inputs
- Use proper environment variable management

## Testing Strategy

Unit tests (`npm test`, mocked Claude and Prisma) and real-Postgres integration tests (`npm run test:integration`, `tests/integration/`) exist; see `TESTING.md`. Recommended approach going forward:

### Unit Tests
- Test AI prompt functions
- Test data transformation utilities
- Test form validation

### Integration Tests
- Test API routes with test database
- Test recipe CRUD operations
- Test meal plan generation

### E2E Tests
- Test complete user flows
- Use Playwright or Cypress
- Test AI features with mocks

## Deployment

### Recommended Platforms

**Vercel** (Easiest):
```bash
# 1. Push code to GitHub
# 2. Connect repo to Vercel
# 3. Add ANTHROPIC_API_KEY and OPENAI_API_KEY (embeddings) to environment variables
# 4. Deploy!
```

**Other Options**:
- Railway
- Render
- Netlify
- AWS (more complex)

### Database for Production
- PostgreSQL already configured via Vercel Postgres
- Database URL set via `DATABASE_URL` environment variable

### Environment Variables
Set these in your hosting platform:
- `ANTHROPIC_API_KEY` (all generative AI; web search must be enabled on the key)
- `OPENAI_API_KEY` (embeddings only)
- `DATABASE_URL` (pooled, runtime) and `DATABASE_URL_UNPOOLED` (direct, Prisma migrations)
- `ALLOW_PRIVATE_FETCH=1` is for local dev/tests only; never set it on Vercel (ignored in production anyway)

## Extending the App

### Adding a New Feature

1. **Database Schema** - Update `prisma/schema.prisma`
2. **Types** - Add types to `types/index.ts`
3. **API Routes** - Create route handlers in `app/api/`
4. **Components** - Build UI in `components/`
5. **Pages** - Wire everything together in page components

### Example: Adding Recipe Ratings

1. Add to schema:
```prisma
model Recipe {
  // ... existing fields
  rating Int @default(0)
}
```

2. Add to types:
```typescript
export interface RecipeFormData {
  // ... existing fields
  rating: number
}
```

3. Update API, form, and display components

## Common Questions

### Q: Why Prisma instead of raw SQL?
**A:** Type safety, automatic migrations, great DX

### Q: Why PostgreSQL?
**A:** Production runs on Neon Postgres via Vercel; local and CI use a local PostgreSQL server

### Q: Why not use a state management library?
**A:** This app is simple enough for useState + fetch

### Q: Why abstraction layer for AI?
**A:** Callers depend on function signatures, not on a provider; model names live in `lib/ai/config.ts`

### Q: Can I use this commercially?
**A:** Yes! It's open source. Just be aware of Anthropic and OpenAI (embeddings) API costs.

## Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Prisma Quickstart](https://www.prisma.io/docs/getting-started)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [OpenAI Embeddings Docs](https://platform.openai.com/docs/guides/embeddings)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
