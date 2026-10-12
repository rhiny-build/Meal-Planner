# Family Meal Planner

A household meal planning application built with modern web technologies. This app helps families organize their weekly meals, manage a recipe library, and generate smart meal plans using AI.

## Overview

This project is designed to be both a functional meal planning tool and a learning resource for modern web development. The codebase is well-documented with comments explaining key concepts and patterns.

## Tech Stack

- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Prisma 5** - Database ORM (using PostgreSQL)
- **Claude (Anthropic API)** - all AI features (import agent, meal-plan changes, discovery, ingredient normalisation)
- **OpenAI API** - embeddings only (ingredient matching)

## Features

### Phase 1 (Implemented)

#### Recipe Management
- ✅ Manual recipe entry with full details
- ✅ Import from a URL or a description: a Claude agent drafts the recipe, you review it before saving (method only if the source has one)
- ✅ Recipe book: full and quick recipes, a recipe page with method steps, servings and timers
- ✅ Save and edit recipes from Claude.ai through the MCP endpoint
- ✅ Recipe library with filtering by:
  - Tier (Favorite/Non-Regular/New)
  - Protein type (Chicken/Fish/Red Meat/Vegetarian)
  - Carb type (Rice/Pasta/Couscous/Fries/Other)
  - Prep time (Quick/Medium/Long)
- ✅ Edit and delete recipes

#### Weekly Meal Planning
- ✅ AI-generated 7-day meal plans with smart rules:
  - Weekdays (Mon-Thu): Quick/medium prep recipes
  - Weekends (Fri-Sun): Any prep time, bias toward longer recipes
  - Recipe tier distribution: Mostly favorites, some non-regular, max 1 new
  - No consecutive same protein or carb types
- ✅ Manual meal plan editing (click to change any meal)
- ✅ Natural language modifications using AI
  - Example: "swap Tuesday for something faster"
  - Example: "replace chicken with fish on Wednesday"
- ✅ Navigate between weeks
- ✅ Persistent meal plans, with day notes stored in the database (synced across devices)

#### Shopping List
- ✅ Generate shopping list from weekly meal plan
- ✅ 5-step matching pipeline:
  - Collects and aggregates ingredients from meal plans
  - Normalises ingredient names with form awareness ("garlic cloves" → "garlic (fresh)")
  - Checks explicit learned mappings (IngredientMapping table)
  - Embedding-based matching against household master list
  - Cross-recipe deduplication by canonical name
- ✅ Intelligent ingredient aggregation (groups same ingredients, combines quantities)
- ✅ Master list management (staples and restock items)
- ✅ Check off items as purchased
- ✅ Add manual items
- ✅ Export to clipboard as text

#### Agent runs
- ✅ `/agent-runs` page: every agent run, replayable step by step

### Phase 2 (Structure in place, not implemented)
- Photo-based recipe import
- In-app recipe discovery chat (Inspire Me and Claude.ai already cover discovery)
- Staples management (exclude common pantry items)
- Pantry monitoring

## Project Structure

```
/app
  /(modules)        # shopping-list, settings, purchase-history (page + server actions)
  /api              # Route handlers: recipes (incl. import, discover), meal-plan, mcp
  /recipes          # Recipe book, plus /recipes/[id] recipe page
  /meal-plan        # Weekly meal plan page (day notes actions here)
  /agent-runs       # Agent runs page
/components         # Shared UI; /components/recipe has the recipe editor
/lib
  /ai               # Claude client, config (models), schemas, discovery, embeddings
  /agents           # Generic agent loop, run log, recipe importer, backfill
  /mcp              # MCP server and recipe tools
  /shopping-list    # Matching and normalisation helpers
/prisma             # schema.prisma, migrations, seed.ts, build-time data scripts
/scripts            # Maintenance scripts (shopping-list, purchase-history, rehaul)
/tests/integration  # Real-Postgres tests
/types              # Shared types
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full tree.

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm (comes with Node.js)
- An Anthropic API key ([Get one here](https://console.anthropic.com/settings/keys)) with web search enabled (used by Inspire Me)
- An OpenAI API key ([Get one here](https://platform.openai.com/api-keys)), used for embeddings only

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up your environment variables:**

   Copy the example file and add your API keys:
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and replace the placeholders with your actual keys:
   ```
   ANTHROPIC_API_KEY="..."   # all generative AI
   OPENAI_API_KEY="..."      # embeddings only
   ```

   `ALLOW_PRIVATE_FETCH=1` is for local fixture testing of the recipe importer only; it is ignored in production.

3. **Set up the database:**
   ```bash
   # Generate Prisma client
   npm run db:generate

   # Create the database (first time setup)
   npm run db:push

   # Seed with example recipes
   npm run db:seed
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed database with example recipes

## Understanding the Code

### AI Layer (`lib/ai/`, `lib/agents/`)

All generative AI runs on Claude through the official Anthropic SDK:
- `lib/ai/config.ts` - the model names and token limits (the only place models are named)
- `lib/ai/claude.ts` - lazy client, and `callForcedTool` for one-shot structured output via a tool
- `lib/ai/modifyMealPlan.ts`, `discoverRecipes.ts` - meal-plan changes, Inspire Me (Claude web search)
- `lib/agents/loop.ts` - a hand-written agent loop, written to be read top to bottom; `recipeImporter/` is the first agent built on it
- `lib/ai/openaiEmbeddings.ts` - OpenAI embeddings, the only OpenAI use

Function signatures are provider-independent, so the rest of the app does not depend on the model.

### Database with Prisma (`prisma/schema.prisma`)

The schema defines these main models:
- `Recipe` - Stores recipe information
- `Ingredient` - Structured ingredients for each recipe (quantity, unit, numeric amount, name, notes)
- `RecipeStep` - Optional method steps, with optional timers
- `DayNote` - A note for one calendar day on the meal-plan grid
- `AgentRun` / `AgentStep` - Recorded agent runs, shown on `/agent-runs`
- `MealPlan` - Stores which recipe is planned for which date
- `ShoppingList` - Weekly shopping list
- `ShoppingListItem` - Individual items with canonical name, master item link, and match confidence
- `MasterListItem` - Household staples/restock items with canonical names and embeddings
- `IngredientMapping` - Learned mappings from recipe ingredients to master list items

Prisma provides type-safe database access. When you change the schema:
1. Run `npx prisma migrate dev --name descriptive_name` to create a migration
2. Prisma automatically generates TypeScript types for you

Note: `npm run db:push` is fine for initial setup or prototyping, but use migrations for schema changes on existing databases with data.

### API Routes (`app/api/`)

Next.js App Router uses file-based routing for APIs:
- `app/api/recipes/route.ts` - GET for recipes (steps included; `?kind=`)
- `app/api/recipes/import/route.ts` - run the import agent
- `app/api/recipes/[id]/route.ts` - GET, PATCH, DELETE for a specific recipe
- `app/api/meal-plan/route.ts` - Meal plan operations

Each route exports functions named after HTTP methods: `GET`, `POST`, `PATCH`, `DELETE`.

### Component Patterns

The app uses modern React patterns:
- **Client Components** (`'use client'`) - For interactive UI with state
- **Server Components** (default) - For static content and data fetching
- **Custom Hooks** - Reusable logic (like `useEffect` for data fetching)
- **Props & TypeScript** - Type-safe component interfaces

## Learning Path

If you're new to these technologies, here's a suggested learning order:

1. **Start with the home page** (`app/page.tsx`) - Simple, static content
2. **Look at the Button component** (`components/Button.tsx`) - See how props and variants work
3. **Study the Recipe Card** (`components/RecipeCard.tsx`) - Understand how data flows through props
4. **Explore the Recipe API** (`app/api/recipes/route.ts`) - Learn about API routes and database queries
5. **Dive into the Recipes page** (`app/recipes/page.tsx`) - See state management and data fetching
6. **Understand the AI layer** (`lib/ai/claude.ts`, then `lib/agents/loop.ts`) - Learn how to integrate AI APIs and how a tool loop works
7. **Study the Meal Plan page** (`app/meal-plan/page.tsx`) - Complex state and multiple API calls

## Common Modifications

### Adding a New Field to Recipes

1. Update `prisma/schema.prisma`:
   ```prisma
   model Recipe {
     // ... existing fields
     cuisine String? // Add optional cuisine field
   }
   ```

2. Run `npx prisma migrate dev --name add_cuisine_field` to create a migration

3. Update types in `types/index.ts`:
   ```typescript
   export interface RecipeFormData {
     // ... existing fields
     cuisine?: string
   }
   ```

4. Add the field to `components/recipe/RecipeEditor.tsx` (the form component)

5. Update `RecipeCard.tsx` to display the new field

### Changing the AI Model

Edit `CLAUDE_MODELS` in `lib/ai/config.ts`. Model names are not set in `.env`.

### Adding More Seed Recipes

Edit `prisma/seed.ts` and add recipes to the array, then run `npm run db:seed`.

## Troubleshooting

### Database connection issues
- Check that `DATABASE_URL` is set correctly in `.env`
- For local development, ensure PostgreSQL is running
- For Vercel deployment, check Vercel Postgres connection settings

### AI features not working
- Check that `ANTHROPIC_API_KEY` is set correctly in `.env` (and `OPENAI_API_KEY` for embedding-based matching)
- Make sure you have API credits in your Anthropic account, and that web search is enabled for Inspire Me
- Check the browser console and terminal for error messages

### Changes not appearing
- Make sure the development server is running (`npm run dev`)
- Try hard refreshing the browser (Cmd+Shift+R or Ctrl+Shift+R)
- Check for TypeScript errors in the terminal

## Next Steps

Once you're comfortable with the codebase, try:

1. **Add a rating system** - Let users rate recipes
2. **Add photos** - Allow uploading recipe images
3. **Add staples management** - Exclude common pantry items from shopping lists
4. **Add user authentication** - Support multiple families
5. **Add pantry monitoring** - Track what's in your pantry

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)

## License

This project is open source and available for learning purposes.
