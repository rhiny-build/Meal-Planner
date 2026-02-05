# Critical Issues Log

Documenting critical bugs, data loss incidents, and lessons learned.

---

## 2026-02-04: Seed Script Data Loss

### What Happened
Running `npx prisma db seed` during the shopping list feature migration wiped all existing recipe data (including the `ingredients` field).

### Root Cause
1. The seed script had destructive `deleteMany()` calls:
   ```typescript
   await prisma.mealPlan.deleteMany()
   await prisma.recipe.deleteMany()
   ```

2. The "production guard" relied on `NODE_ENV`:
   ```typescript
   if (process.env.NODE_ENV === 'production') return
   ```

3. **Problem**: `NODE_ENV` is NOT automatically set when running Prisma CLI commands like `npx prisma db seed`. It's only set by Next.js commands (`npm run dev`, `npm run build`).

4. Result: The guard check passed (undefined !== 'production'), and the destructive code ran.

### Impact
- All recipe data in local dev database was deleted
- Recipes were recreated from seed but without user's actual data
- The `ingredients` field was empty for all recipes

### Fixes Applied
1. Removed `deleteMany()` calls from seed script
2. Changed seed to be additive - checks if recipes exist before seeding:
   ```typescript
   const existingCount = await prisma.recipe.count()
   if (existingCount > 0) {
     console.log(`Skipping - ${existingCount} recipes already exist`)
     return
   }
   ```

### Lessons Learned
1. **Never trust NODE_ENV in scripts** - Prisma CLI doesn't set it
2. **Avoid destructive operations in seed scripts** - Use upsert/additive patterns
3. **Defense in depth** - Don't rely on a single guard; make the code safe by default
4. **Search before deleting** - When removing API routes or other code, grep the codebase for all callers

### Related Issue
The shopping list module refactor also removed an API route (`/api/shopping-list/generate`) without updating all callers. The meal-plan page still referenced it, causing a 404.

**Fix**: Removed the orphaned "Generate Shopping List" button from meal-plan page (functionality now lives only on shopping-list page).

---

## Checklist for Future Migrations

- [ ] Search for all references before deleting any code/routes
- [ ] Never use `deleteMany()` in seed scripts without explicit user confirmation
- [ ] Test the full user flow after any refactor
- [ ] Don't rely on NODE_ENV for safety guards in CLI scripts
