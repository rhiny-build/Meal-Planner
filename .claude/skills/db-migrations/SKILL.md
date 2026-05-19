---
name: db-migration
description: Process for making database schema changes safely
---

## Hard Rule

Never leave DB and code out of sync. Schema changes and the code that uses them go in the same commit.

## Migration Sequence

1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_migration_name`
3. Run `npx prisma generate` to update Prisma client types
4. Update all code that references the changed schema
5. Run `npm test` — must pass before committing
6. Commit schema, migration file, and code changes together

## Naming Migrations

Use descriptive names that explain what changed:
- `add_purchase_history_table`
- `add_master_item_embedding`
- `remove_canonical_name_field`

Not: `update_schema`, `migration_1`, `fix`

## Useful Commands

```bash
# Create migration after schema changes
npx prisma migrate dev --name descriptive_migration_name

# Regenerate Prisma client after schema changes
npx prisma generate

# Open Prisma Studio to view/edit data
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## Production

Always use `npx prisma migrate deploy` in production, never `migrate dev`.

## When Unsure

If a migration has destructive implications — dropping a column, renaming a field, changing a relation — stop and ask before proceeding. One question, wait for the answer.