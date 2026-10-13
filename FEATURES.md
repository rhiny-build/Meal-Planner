# Feature Checklist

## Phase 1 Features (All Implemented ✅)

### Recipe Management

- ✅ **Manual Recipe Entry**
  - Form with all required fields (name, ingredients, protein, carb, prep time, tier)
  - Input validation
  - Create and save to database
  - Editor also covers kind, servings, total time, description, notes, method steps (optional timer, insert-ingredient) and a plain "Recipe URL (optional)" field
  - File: [components/recipe/RecipeEditor.tsx](./components/recipe/RecipeEditor.tsx)

- ✅ **Import from URL or Description (agent)**
  - "Import" button on the recipes page: paste a recipe link, or describe a recipe in your own words
  - A Claude agent reads the page's own recipe data (or its visible text), checks it, and shows a review screen: name, kind, servings, time, ingredients (the source's own quantities), method, and a "maybe the same recipe" warning
  - Nothing is saved until "Save to recipe book" (tier "new"); Discard saves nothing
  - Method only if the source has one; never guessed. Unreadable pages or non-recipes give a plain message, not a made-up recipe
  - Replaces the old AI import box and `/api/recipes/extract`
  - Files: [lib/agents/recipeImporter/](./lib/agents/recipeImporter/), [app/recipes/components/RecipeImportModal.tsx](./app/recipes/components/RecipeImportModal.tsx)

- ✅ **Agent Runs Page**
  - Menu "Agent Runs" (`/agent-runs`): every agent run with status, time, duration, steps and tokens
  - Tap a run to replay it: model turns, each tool call and result, final output or error
  - Generic: later agents appear with no changes
  - Files: [app/agent-runs/](./app/agent-runs/), [lib/agents/runLog.ts](./lib/agents/runLog.ts)

- ✅ **Recipe Book View**
  - Grid display of all recipes with a "Type" filter (All / Full recipes / Quick)
  - Quick items (e.g. Simple Fries) are compact amber-edged cards; full recipes with a method show "Method · N steps"
  - Each recipe name opens a recipe page (`/recipes/[id]`): description, servings, total time, ingredients (amount + unit), method steps with ingredient amounts and timers, notes, source link. No method means no Method section
  - A disabled "Cook" button is a placeholder for cook mode
  - Files: [app/recipes/](./app/recipes/), [components/RecipeCard.tsx](./components/RecipeCard.tsx)

- ✅ **Recipe Filtering**
  - Filter by tier (Favorite/Non-Regular/New)
  - Filter by protein type
  - Filter by carb type
  - Filter by prep time
  - Filter by type (full / quick)
  - Real-time filter application
  - File: [app/recipes/components/RecipeFilters.tsx](./app/recipes/components/RecipeFilters.tsx)

- ✅ **Edit Recipe**
  - Edit from the recipe list or the recipe page (modal)
  - Pre-filled form with current values
  - Ingredient ids stay stable across edits so method steps keep pointing at the right ingredient
  - Files: [components/recipe/RecipeEditor.tsx](./components/recipe/RecipeEditor.tsx), [lib/recipeWrite.ts](./lib/recipeWrite.ts)

- ✅ **Delete Recipe**
  - Click delete with confirmation
  - Cascade delete from meal plans
  - Files: [app/api/recipes/[id]/route.ts](./app/api/recipes/[id]/route.ts)

### Weekly Meal Planning

- ✅ **Generate Meal Plan**
  - AI generates 7-day plan
  - Applies all business rules:
    - Weekdays (Mon-Thu): Quick/medium prep only
    - Weekends (Fri-Sun): Any prep time, bias toward longer recipes
    - Recipe tier mix: Mostly favorites, 1-2 non-regular, max 1 new
    - No consecutive same protein
    - No consecutive same carb
  - Files: [lib/aiService.ts](./lib/aiService.ts), [app/api/meal-plan/route.ts](./app/api/meal-plan/route.ts)

- ✅ **View Weekly Plan**
  - Display Monday-Sunday
  - Show recipe details for each day
  - Show protein, carb, prep time, tier
  - File: [app/meal-plan/page.tsx](./app/meal-plan/page.tsx)

- ✅ **Manual Meal Editing**
  - Click "Change" on any meal
  - Dropdown shows all available recipes
  - Select new recipe to replace
  - Updates immediately
  - File: [app/meal-plan/page.tsx](./app/meal-plan/page.tsx)

- ✅ **Natural Language Modifications**
  - Text input for instructions
  - AI understands intent
  - Examples work:
    - "swap Tuesday for something faster"
    - "replace chicken with fish on Wednesday"
  - Shows explanation of changes
  - Powered by Claude
  - Files: [lib/ai/modifyMealPlan.ts](./lib/ai/modifyMealPlan.ts), [app/api/meal-plan/modify/route.ts](./app/api/meal-plan/modify/route.ts)

- ✅ **Week Navigation**
  - Navigate to previous week
  - Navigate to next week
  - Persistent plans per week
  - File: [app/meal-plan/page.tsx](./app/meal-plan/page.tsx)

- ✅ **Persistent Storage**
  - Meal plans saved to database
  - Load plan for any week
  - Plans survive app restarts

- ✅ **Day Notes (synced)**
  - Notes on each day of the plan grid are stored in the database, so they sync across devices and are kept as history (past weeks are no longer cleared)
  - Saves after 600 ms of quiet and when you leave the page; a failed save shows a toast
  - Files: [app/meal-plan/dayNoteActions.ts](./app/meal-plan/dayNoteActions.ts), [lib/hooks/useDayNotes.ts](./lib/hooks/useDayNotes.ts)

### Shopping List (Implemented)

- ✅ **Shopping List Generation**
  - Generate from weekly meal plan
  - Aggregates ingredients across all meals
  - Groups by ingredient name (case-insensitive)
  - Combines quantities when units match
  - Files: [app/api/shopping-list/generate/route.ts](./app/api/shopping-list/generate/route.ts)

- ✅ **Shopping List Management**
  - Week navigation (same as meal plan)
  - Check off items as purchased
  - Delete items
  - Add manual items
  - Files: [app/shopping-list/page.tsx](./app/shopping-list/page.tsx), [app/shopping-list/components/](./app/shopping-list/components/)

- ✅ **Export Shopping List**
  - Copy to clipboard as text
  - Only exports unchecked items
  - File: [app/shopping-list/page.tsx](./app/shopping-list/page.tsx)

- ✅ **Structured Ingredients**
  - Ingredients stored with quantity, unit, name, notes
  - A numeric `amount` is set on every save (for servings scaling); quantity/unit stay as the free-text fallback
  - Ingredient parser for existing text ingredients
  - Files: [lib/ingredientParser.ts](./lib/ingredientParser.ts), [lib/ingredientAmount.ts](./lib/ingredientAmount.ts)

### Database & Infrastructure

- ✅ **Database Setup**
  - Prisma schema defined
  - PostgreSQL database (via Vercel Postgres)
  - Migrations working
  - File: [prisma/schema.prisma](./prisma/schema.prisma)

- ✅ **Seed Data**
  - 10 example recipes
  - Diverse protein types
  - Diverse carb types
  - Mix of prep times and tiers
  - File: [prisma/seed.ts](./prisma/seed.ts)

- ✅ **AI Layer (Claude)**
  - All generative AI runs on Claude (import, meal-plan modify, ingredient normalisation, Inspire Me); OpenAI is used for embeddings only
  - Models configured in one place
  - Files: [lib/ai/](./lib/ai/), [lib/agents/](./lib/agents/)

- ✅ **Inspire Me (recipe discovery)**
  - Claude searches the web itself (server-side web search) and returns 3 recipe suggestions
  - File: [lib/ai/discoverRecipes.ts](./lib/ai/discoverRecipes.ts)

- ✅ **Save and Edit Recipes from Claude.ai (MCP)**
  - Ask Claude.ai for a recipe, say "save it", and it lands in the book with method steps (with timers), servings, kind, description, total time and notes
  - Claude can read one recipe in full (`get_recipe`) and change an existing one (`update_recipe`), e.g. add a method to a family recipe
  - `get_recipes` shows kind, has-method and servings. Spec: [docs/Specs/MCP.md](./docs/Specs/MCP.md)
  - Note: the endpoint has no authentication yet (see BACKLOG)
  - Files: [lib/mcp/](./lib/mcp/), [app/api/mcp/route.ts](./app/api/mcp/route.ts)

- ✅ **Backfill of Existing Recipes (one-off script)**
  - Terminal job: dry-run report (enrich / quick / leave / duplicate, one line per recipe), then apply what you keep
  - Fills only empty fields, never overwrites what you typed; duplicates merged only when approved in the report; refuses to apply without a backup flag
  - Files: [scripts/rehaul/backfillRecipes.ts](./scripts/rehaul/backfillRecipes.ts), [lib/agents/recipeBackfill/](./lib/agents/recipeBackfill/)

- ✅ **Type Safety**
  - Full TypeScript coverage
  - Type definitions for all data
  - File: [types/index.ts](./types/index.ts)

### UI/UX

- ✅ **Responsive Design**
  - Mobile-friendly layouts
  - Grid adapts to screen size
  - Tailwind responsive classes

- ✅ **Navigation**
  - Header with links
  - Home page with feature cards
  - Clear page structure
  - File: [app/layout.tsx](./app/layout.tsx)

- ✅ **Loading States**
  - Loading indicators
  - Disabled buttons during operations
  - User feedback

- ✅ **Error Handling**
  - Try-catch in API routes
  - Error messages to user
  - Console logging for debugging

- ✅ **Dark Mode Support**
  - Dark mode CSS classes
  - Respects system preference
  - Good contrast in both modes

### Developer Experience

- ✅ **Code Documentation**
  - Comments on every major function
  - File-level documentation
  - Inline explanations

- ✅ **README**
  - Comprehensive setup guide
  - Learning path
  - Troubleshooting section
  - File: [README.md](./README.md)

- ✅ **Quick Start Guide**
  - 5-minute setup
  - Essential steps only
  - File: [QUICKSTART.md](./QUICKSTART.md)

- ✅ **Architecture Documentation**
  - System design explained
  - Data flow diagrams
  - Code patterns
  - File: [ARCHITECTURE.md](./ARCHITECTURE.md)

- ✅ **Project Structure**
  - Logical organization
  - Separation of concerns
  - Easy to navigate

- ✅ **Development Tools**
  - ESLint configured
  - Prettier configured
  - TypeScript strict mode
  - npm scripts for common tasks

## Phase 2 Features (Structure in Place, Not Implemented)

### Photo-Based Recipe Import
- 📋 Structure: API route structure ready
- 📋 Would add: Image upload, OCR or vision API, recipe parsing

### Recipe Discovery (in-app chat)
- 📋 Inspire Me and Claude.ai (MCP) cover discovery today; an in-app discovery chat agent is planned

### Staples Management
- 📋 Structure: ShoppingList model ready for extension
- 📋 Would add: Pantry staples list, exclude from shopping list generation

### Pantry Monitoring
- 📋 Structure: Could extend Ingredient model
- 📋 Would add: Track pantry inventory, suggest recipes based on available ingredients

## Testing Coverage

### Manual Testing Completed
- ✅ Home page loads
- ✅ Recipe library displays
- ✅ Add recipe form works
- ✅ Edit recipe works
- ✅ Delete recipe works
- ✅ Filters work
- ✅ Meal plan displays
- ✅ Shopping list generates from meal plan
- ✅ Shopping list items can be checked/unchecked
- ✅ Manual items can be added to shopping list
- ✅ API endpoints respond correctly

### Automated Testing (Implemented)
- ✅ Unit tests for utilities (dateUtils, ingredientParser)
- ✅ Unit tests for AI functions and agents (mocked Claude)
- ✅ Hook tests (useRecipes, useMealPlan)
- ⬜ E2E tests
- ✅ Integration tests with a real Postgres database (`tests/integration/`)

## Known Limitations

1. **Single User** - No authentication, designed for one household
2. **No Drag-and-Drop** - Using dropdown selection instead (simpler, works well)
3. **No Image Upload** - Text-only recipes for now
4. **API Costs** - Anthropic API for generative features and OpenAI API for embeddings (costs per request)
5. **No Staples Management** - All ingredients appear in shopping list (future feature)

## Performance Metrics

- **Page Load** - <1s for most pages
- **API Response** - <500ms for database queries
- **AI Generation** - 2-5s depending on model
- **Database Size** - Minimal (SQLite file <1MB)

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Accessibility

- ⚠️ Basic keyboard navigation works
- ⚠️ Color contrast good in both themes
- ⬜ Screen reader testing not done
- ⬜ ARIA labels not added
- ⬜ Focus indicators could be improved

## Security

- ✅ API keys in environment variables
- ✅ Server-side API calls
- ✅ Basic input validation
- ⬜ No authentication (by design)
- ⬜ No rate limiting
- ⬜ No CSRF protection (would need for multi-user)

## Future Enhancements (Ideas)

### Short Term
- Add recipe photos
- Add staples management (exclude from shopping list)
- Add recipe ratings
- Print-friendly meal plan view
- Email meal plan

### Medium Term
- User accounts and authentication
- Share recipes with other users
- Recipe import from popular sites
- Nutrition information
- Serving size adjustments

### Long Term
- Mobile app (React Native)
- Recipe recommendations based on history
- Integration with grocery delivery services
- Meal prep instructions
- Leftover management

## Conclusion

Phase 1 and Phase 2 core features are **complete** with all requested functionality implemented and working:
- Full recipe management with structured ingredients
- AI-powered meal plan generation and modification
- Shopping list generation from meal plans with ingredient aggregation

The codebase is well-documented, type-safe, and ready for learning and extension. Model choices live in one place (`lib/ai/config.ts`).

The app is production-ready for single-user/family use with PostgreSQL database and proper environment variables.
