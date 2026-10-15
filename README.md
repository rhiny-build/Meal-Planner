# Family Meal Planner

A household meal planner for one family. It keeps a recipe book, plans the week's dinners, and predicts the next Sainsbury's order from real receipts. Claude does the AI work: importing recipes, capturing methods while you cook, and drafting or adjusting the week.

## What it does

- **Tonight / Week:** the meal plan (lunch, protein, carb, vegetable per day), day notes, an Ask box ("swap Wednesday for fish"), and **Draft my week** (the agent drafts next week, you accept or tweak).
- **Recipes:** a recipe book of full and quick recipes. Import from a URL or a description (you review before saving), edit, and **cook mode** with steps, timers and servings scaling. "Tell me as you go" captures a method while you cook.
- **Shopping:** the **Next week** list, predicted from uploaded Sainsbury's receipts plus next week's meals, with **Copy for Sainsbury's**. The older shopping list (master items, matching) still works but is hidden; turn it on in Settings > Preferences.
- **Claude.ai:** an MCP endpoint (`/api/mcp`) lets Claude.ai read and write recipes and the meal plan.
- **Behind the scenes:** `/agent-runs` shows every AI agent run step by step; `/admin/receipts` uploads receipts; `/admin/backfill` tidies older recipes.

## Run it locally

You need Node 22, PostgreSQL 16, and an Anthropic API key (an OpenAI key is only needed for the old shopping list's embeddings).

```bash
npm ci
cp .env.example .env              # add ANTHROPIC_API_KEY (and OPENAI_API_KEY)
# also set DATABASE_URL and DATABASE_URL_UNPOOLED to your local Postgres, e.g.
#   postgresql://postgres:localdev@localhost:5432/mealplanner_dev
npx prisma migrate deploy         # create the tables
npm run db:seed                   # example recipes (local databases only)
npm run dev                       # http://localhost:3000
```

Without `BLOB_READ_WRITE_TOKEN`, receipts are stored under `.receipts-dev/` instead of Vercel Blob.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build (also runs `prisma migrate deploy`) and server; try features in this mode before shipping |
| `npm test` | Unit tests (no database) |
| `npm run test:integration` | Integration tests against a local test database (see [docs/Testing.md](docs/Testing.md)) |
| `npx tsc --noEmit` | Type check |
| `npx prisma migrate dev --name <name>` | Create and apply a migration (see the `db-migrations` skill) |
| `npx prisma studio` | Look at the data in a browser |

## Where to read more

- [ARCHITECTURE.md](ARCHITECTURE.md): how it is built, with diagrams (system, data model, agents, receipts, planning, deploys).
- [docs/rehaul/](docs/rehaul/): the plan behind the rehaul (decisions D1–D13), session prompts and logs.
- [docs/Specs/MCP.md](docs/Specs/MCP.md): the MCP tools.
- [docs/Old-Shopping-List.md](docs/Old-Shopping-List.md): the hidden older shopping list.
- [docs/Testing.md](docs/Testing.md): how tests are organised and run.
- [BACKLOG.md](BACKLOG.md): what is left to do.
- [docs/Archive/](docs/Archive/): history (old plans, reviews, design notes).
- [claude.md](claude.md) and `.claude/skills/`: how Claude Code works on this repo.

## Deploying

Merging to `main` deploys production on Vercel. Branches get a preview with their own copy of the data, but only `main` and `rehaul_phase*` branches are built (the allow-list in `vercel.json`). See [ARCHITECTURE.md](ARCHITECTURE.md#6-environments-and-deploys).
