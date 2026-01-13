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
- **SQLite** - Lightweight file-based database

### AI Integration
- **OpenAI API** - GPT models for intelligent features
- **Abstraction Layer** - Easy to swap to Claude or other providers

## Project Structure

```
/app                    # Next.js App Router pages and API
├── /api               # Backend API routes
│   ├── /recipes       # Recipe CRUD operations
│   │   ├── route.ts           # GET all, POST new
│   │   ├── /[id]/route.ts     # GET, PATCH, DELETE by ID
│   │   └── /extract/route.ts  # AI extraction endpoint
│   └── /meal-plan     # Meal plan operations
│       ├── route.ts           # GET, POST, PATCH meal plan
│       └── /modify/route.ts   # Natural language modifications
├── /recipes          # Recipe library page
│   └── page.tsx
├── /meal-plan        # Weekly meal plan page
│   └── page.tsx
├── layout.tsx        # Root layout (header, footer)
├── page.tsx          # Home page
└── globals.css       # Global styles

/components           # Reusable UI components
├── Button.tsx        # Styled button with variants
├── RecipeCard.tsx    # Recipe display card
└── RecipeForm.tsx    # Recipe add/edit form

/lib                  # Shared utilities and business logic
├── ai.ts             # AI abstraction layer (OpenAI)
└── prisma.ts         # Prisma client singleton

/prisma              # Database configuration
├── schema.prisma    # Database schema definition
└── seed.ts          # Example data seeder

/types               # TypeScript type definitions
└── index.ts         # All shared types
```

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

### Meal Plan Generation Flow
```
User clicks "Generate New Meal Plan"
  ↓
POST /api/meal-plan with startDate
  ↓
API fetches all recipes from database
  ↓
Calls generateWeeklyMealPlan() in lib/ai.ts
  ↓
AI applies business rules and selects 7 recipes
  ↓
API deletes old meal plans for the week
  ↓
API creates new meal plans in database
  ↓
Returns meal plans with recipe details
  ↓
UI displays the 7-day plan
```

### Natural Language Modification Flow
```
User types "swap Tuesday for something faster"
  ↓
POST /api/meal-plan/modify
  ↓
API fetches current meal plan + all recipes
  ↓
Calls modifyMealPlan() in lib/ai.ts
  ↓
AI understands instruction and picks new recipe
  ↓
API updates affected meal plans in database
  ↓
Returns explanation + updated plans
  ↓
UI shows changes and AI explanation
```

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

All AI calls go through `lib/ai.ts`:
```typescript
// Exported functions with clear interfaces
export async function extractIngredientsFromURL(
  url: string
): Promise<ExtractedRecipeData>

export async function generateWeeklyMealPlan(
  recipes: Recipe[],
  startDate: Date
): Promise<string[]>
```

To switch AI providers, only modify `lib/ai.ts`:
- Change the client initialization
- Update the API calls
- Keep the same function signatures

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
  id          String   @id @default(cuid())
  name        String
  ingredients String
  proteinType String
  carbType    String
  prepTime    String
  tier        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  mealPlans   MealPlan[]  // Relation
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
- SQLite is fine for single-user apps
- Indexed queries on date for meal plans
- Cascade delete to maintain referential integrity

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
- Use PostgreSQL instead of SQLite
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
- Replace SQLite with PostgreSQL
- Update Prisma schema datasource
- Use database URL from hosting provider

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
