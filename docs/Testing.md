# Testing

Vitest runs everything. There are two kinds of test.

| Type | Where | Database | Command |
|---|---|---|---|
| Unit | `*.test.ts(x)` next to the code | None (Prisma and Claude are mocked) | `npm test` |
| Integration | `tests/integration/*.integration.test.ts` | Real local Postgres, database `mealplanner_test` | `npm run test:integration` |

`npm run test:all` runs both. CI (GitHub Actions, `.github/workflows/ci.yml`) runs the type check and the unit tests on every PR. It has no database, so integration tests run locally.

## Integration tests: one-time setup

```bash
# a local Postgres with user postgres / password localdev (see .env.test)
psql "postgresql://postgres:localdev@localhost:5432/postgres" -c "CREATE DATABASE mealplanner_test;"
npx dotenv -e .env.test -- npx prisma migrate deploy
```

Run them with `npm run test:integration` (it loads `.env.test` and runs files one at a time with `--no-file-parallelism`, because they share one database). Each file clears the database before every test with the helpers in `tests/integration/setup.ts`. If a test fails after a schema change, re-run the `migrate deploy` line above. Never point these at a real database: they empty tables.

## Claude in tests

Tests never call Claude. Agent logic is tested by replaying recorded responses (`tests/helpers/scriptedClaude.ts` and fixtures next to each agent). Real Claude calls are made by hand, with the capped dev key, only to check judgement (see `docs/rehaul/sessions/_common.md`).

## Patterns

- Arrange, act, assert; one behaviour per test.
- Pure logic (`lib/`) is tested directly: dates, ingredient parsing, scaling, prediction, receipt parsing, step tokens.
- Server actions and API routes: mock `@/lib/prisma` and `next/cache` with `vi.mock`.
- Components and hooks: React Testing Library with jsdom (see `components/*.test.tsx`, `lib/hooks/*.test.ts`).
- Anything that changes the database (merge, backfill, apply, receipts ingest) also gets an integration test, so the SQL is exercised for real.

## Try it in the running app

Tests are not enough for UI or Vercel behaviour. Run `npm run build && npm start` against a local database and use the feature in a browser at phone and desktop widths (the `ui` skill describes the Playwright flow).

## Troubleshooting

- **Connection refused:** start Postgres (`service postgresql start`) and check the URL in `.env.test`.
- **Missing table or column:** run the `migrate deploy` line above against the test database.
- **Flaky integration test:** almost always two files running in parallel; use `npm run test:integration`, not plain `vitest`.
