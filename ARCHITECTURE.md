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
- **OpenAI API** - GPT models for intelligent features
- **Abstraction Layer** - Easy to swap to Claude or other providers

## Project Structure - Note: accurate as of 03/02 and about to change in the next couple of weeks

```
/app                    # Next.js App Router pages and API
├── /api               # Backend API routes
│   ├── /recipes       # Recipe CRUD operations
│   │   ├── route.ts           # GET all recipes
│   │   ├── /create/route.ts   # POST new recipe
│   │   ├── /[id]/route.ts     # GET, PATCH, DELETE by ID
│   │   └── /extract/route.ts  # AI extraction endpoint
│   ├── /meal-plan     # Meal plan operations
│   │   ├── route.ts           # GET, POST, PATCH meal plan
│   │   └── /modify/route.ts   # Natural language modifications
│   └── /shopping-list # Shopping list operations
│       ├── route.ts           # GET shopping list for week
│       ├── /generate/route.ts # POST generate from meal plan
│       └── /item
│           ├── route.ts       # POST add item
│           ├── /update/route.ts # PATCH update item
│           └── /delete/route.ts # DELETE remove item
├── /recipes          # Recipe library page
│   └── page.tsx
├── /meal-plan        # Weekly meal plan page
│   └── page.tsx
├── /shopping-list    # Shopping list page
│   ├── page.tsx
│   └── /components
│       ├── ShoppingListHeader.tsx
│       ├── ShoppingListItems.tsx
│       └── AddItemForm.tsx
├── layout.tsx        # Root layout (header, footer)
├── page.tsx          # Home page
└── globals.css       # Global styles

/components           # Reusable UI components
├── Button.tsx        # Styled button with variants
├── RecipeCard.tsx    # Recipe display card
└── RecipeForm.tsx    # Recipe add/edit form

/lib                  # Shared utilities and business logic
├── /ai               # AI abstraction layer
│   ├── extractIngredientsFromURL.ts  # URL recipe extraction
│   └── modifyMealPlan.ts             # Natural language modifications
├── /hooks            # React hooks
│   ├── useMealPlan.ts        # Meal plan state management
│   ├── useRecipes.ts         # Recipe state + filtering
│   └── useShoppingList.ts    # Shopping list state management
├── apiService.ts       # API call utilities
├── shoppingListHelpers.ts # Shopping list business logic
├── ingredientParser.ts # Ingredient string parsing utility
├── dateUtils.ts      # Date manipulation helpers
└── prisma.ts         # Prisma client singleton

/prisma              # Database configuration
├── schema.prisma    # Database schema definition
└── seed.ts          # Example data seeder

/types               # TypeScript type definitions
└── index.ts         # All shared types
```

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
- AI integrations (recipe extraction, meal plan generation)
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
User fills form or uses AI import
  ↓ (if AI import)
POST /api/recipes/extract → AI extraction → Returns ingredients
  ↓
User submits form
  ↓
POST /api/recipes → Prisma creates recipe → Updates database
  ↓
Recipes page refetches data
  ↓
RecipeCard components display updated list
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
AI understands instruction and picks new recipe
  ↓
API updates affected meal plans in database
  ↓
Returns explanation + updated plans
  ↓
UI shows changes and AI explanation
```

### Shopping List Flow (Module Pattern)
```
User visits /shopping-list
  ↓
Server component (page.tsx) fetches list via Prisma
  ↓
Data passed to client component (ShoppingListClient)
  ↓
User clicks "Generate Shopping List"
  ↓
Client calls generateShoppingList() server action
  ↓
Server action fetches meal plans for the week
  ↓
Aggregation logic groups ingredients by name
  ↓
Server action creates/updates ShoppingList records
  ↓
revalidatePath() triggers page refresh with new data
  ↓
UI displays items with checkboxes for tracking
```

**Note:** The shopping-list module is the first to use the new modular architecture:
- `app/shopping-list/page.tsx` - Server component for data fetching
- `app/shopping-list/actions.ts` - Server actions for mutations
- `app/shopping-list/components/` - Client components

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

All AI calls go through modular files in `lib/ai/`:
```typescript
// lib/ai/extractIngredientsFromURL.ts
export async function extractIngredientsFromURL(
  url: string
): Promise<ExtractedRecipeData>  // Returns name, ingredients, and structuredIngredients

// lib/ai/modifyMealPlan.ts
export async function modifyMealPlan(
  instruction: string,
  currentPlan: MealPlan[],
  allRecipes: Recipe[]
): Promise<ModifyResult>
```

To switch AI providers, modify the files in `lib/ai/`:
- Change the client initialization
- Update the API calls
- Keep the same function signatures

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
  ingredients           String       // Legacy text field (kept for backwards compatibility)
  proteinType           String?
  carbType              String?
  prepTime              String
  tier                  String
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt
  structuredIngredients Ingredient[] // New structured ingredients
  mealPlans             MealPlan[]
}
```

### Ingredient Table (New)
```prisma
model Ingredient {
  id        String   @id @default(cuid())
  recipeId  String
  name      String   // Ingredient name (e.g., "flour")
  quantity  String?  // Amount (e.g., "2")
  unit      String?  // Unit of measurement (e.g., "cups")
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
  recipeId  String
  recipe    Recipe   @relation(fields: [recipeId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([date])  // For efficient date queries
}
```

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
  id             String       @id @default(cuid())
  shoppingListId String
  name           String       // Ingredient name
  quantity       String?      // Amount
  unit           String?      // Unit of measurement
  notes          String?      // Additional notes
  checked        Boolean      @default(false)  // Purchased status
  source         String       @default("meal") // 'meal' | 'staple' | 'restock' | 'manual'
  order          Int          // Display order
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  shoppingList   ShoppingList @relation(fields: [shoppingListId], references: [id], onDelete: Cascade)

  @@index([shoppingListId])
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

### OpenAI Configuration
```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
```

### Prompt Engineering
All AI functions use structured prompts with:
1. System message - Defines AI role
2. User message - Specific task with context
3. JSON response format - Structured output

Example:
```typescript
const completion = await openai.chat.completions.create({
  model: MODEL,
  messages: [
    {
      role: 'system',
      content: 'You are a meal planning assistant...'
    },
    {
      role: 'user',
      content: `Generate a meal plan for...\n\n${data}`
    }
  ],
  response_format: { type: 'json_object' },
})
```

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

### For Production
- Add user authentication (NextAuth.js)
- Implement rate limiting
- PostgreSQL already in use via Vercel Postgres
- Add CSRF protection
- Sanitize user inputs
- Use proper environment variable management

## Testing Strategy

Currently no tests, but here's a recommended approach:

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
# 3. Add OPENAI_API_KEY to environment variables
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
- `OPENAI_API_KEY`
- `DATABASE_URL` (PostgreSQL connection string)
- `OPENAI_MODEL` (optional)

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

### Q: Why SQLite instead of PostgreSQL?
**A:** Simplicity for learning and local development

### Q: Why not use a state management library?
**A:** This app is simple enough for useState + fetch

### Q: Why abstraction layer for AI?
**A:** Makes it easy to switch providers without rewriting the whole app

### Q: Can I use this commercially?
**A:** Yes! It's open source. Just be aware of OpenAI API costs.

## Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Prisma Quickstart](https://www.prisma.io/docs/getting-started)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
