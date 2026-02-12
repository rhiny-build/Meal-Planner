# Family Meal Planner

A household meal planning application built with modern web technologies. This app helps families organize their weekly meals, manage a recipe library, and generate smart meal plans using AI.

## Overview

This project is designed to be both a functional meal planning tool and a learning resource for modern web development. The codebase is well-documented with comments explaining key concepts and patterns.

## Tech Stack

- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Prisma 5** - Database ORM (using PostgreSQL)
- **OpenAI API** - AI-powered features (abstracted for easy switching to Claude)

## Features

### Phase 1 (Implemented)

#### Recipe Management
- ✅ Manual recipe entry with full details
- ✅ AI-powered recipe import from text
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
- ✅ Persistent meal plans

#### Shopping List
- ✅ Generate shopping list from weekly meal plan
- ✅ Intelligent ingredient aggregation:
  - Groups same ingredients (case-insensitive)
  - Combines quantities when units match
- ✅ Check off items as purchased
- ✅ Add manual items
- ✅ Export to clipboard as text

### Phase 2 (Structure in place, not implemented)
- Photo-based recipe import
- Recipe discovery via natural language
- Staples management (exclude common pantry items)
- Pantry monitoring

## Project Structure

```
/app
  /api              # API routes (Next.js route handlers)
    /recipes        # Recipe CRUD operations
    /meal-plan      # Meal plan operations
    /shopping-list  # Shopping list operations
  /recipes          # Recipe library page
  /meal-plan        # Weekly meal plan page
  /shopping-list    # Shopping list page
  globals.css       # Global styles
  layout.tsx        # Root layout component
  page.tsx          # Home page

/components         # Reusable UI components
  Button.tsx        # Styled button component
  RecipeCard.tsx    # Recipe display card
  RecipeForm.tsx    # Recipe add/edit form

/lib                # Business logic and utilities
  /ai               # AI abstraction layer (modular)
    extractIngredientsFromURL.ts
    modifyMealPlan.ts
  ingredientParser.ts  # Parse ingredient strings
  dateUtils.ts      # Date manipulation helpers
  prisma.ts         # Prisma client singleton

/prisma             # Database configuration
  schema.prisma     # Database schema
  seed.ts           # Seed data script

/types              # TypeScript type definitions
  index.ts          # Shared types
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm (comes with Node.js)
- An OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up your environment variables:**

   Copy the example file and add your OpenAI API key:
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and replace `your-openai-api-key-here` with your actual API key:
   ```
   OPENAI_API_KEY="sk-..."
   ```

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

### AI Abstraction Layer (`lib/ai/`)

The AI layer is modular with separate files for each function:
- `extractIngredientsFromURL.ts` - Extract recipe data from URLs
- `modifyMealPlan.ts` - Natural language meal plan modifications

Each file demonstrates how to:
- Integrate with the OpenAI API
- Structure code for easy provider switching
- Handle AI responses and errors

**To switch to Claude API:**
1. Install the Anthropic SDK: `npm install @anthropic-ai/sdk`
2. Update the imports and client initialization in each `lib/ai/*.ts` file
3. Update each function to use Claude's API format
4. Add `ANTHROPIC_API_KEY` to your `.env` file

The function signatures remain the same, so the rest of your app won't need changes!

### Database with Prisma (`prisma/schema.prisma`)

The schema defines these main models:
- `Recipe` - Stores recipe information
- `Ingredient` - Structured ingredients for each recipe (quantity, unit, name, notes)
- `MealPlan` - Stores which recipe is planned for which date
- `ShoppingList` - Weekly shopping list
- `ShoppingListItem` - Individual items in a shopping list

Prisma provides type-safe database access. When you change the schema:
1. Run `npx prisma migrate dev --name descriptive_name` to create a migration
2. Prisma automatically generates TypeScript types for you

Note: `npm run db:push` is fine for initial setup or prototyping, but use migrations for schema changes on existing databases with data.

### API Routes (`app/api/`)

Next.js App Router uses file-based routing for APIs:
- `app/api/recipes/route.ts` - GET and POST for recipes
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
6. **Understand the AI layer** (`lib/ai.ts`) - Learn how to integrate AI APIs
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

4. Add the field to `RecipeForm.tsx` (the form component)

5. Update `RecipeCard.tsx` to display the new field

### Changing the AI Model

Open `.env` and change the model:
```
OPENAI_MODEL="gpt-4"  # Use GPT-4 instead of gpt-4o-mini
```

### Adding More Seed Recipes

Edit `prisma/seed.ts` and add recipes to the array, then run `npm run db:seed`.

## Troubleshooting

### Database connection issues
- Check that `DATABASE_URL` is set correctly in `.env`
- For local development, ensure PostgreSQL is running
- For Vercel deployment, check Vercel Postgres connection settings

### AI features not working
- Check that your `OPENAI_API_KEY` is set correctly in `.env`
- Make sure you have API credits in your OpenAI account
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
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

## License

This project is open source and available for learning purposes.
