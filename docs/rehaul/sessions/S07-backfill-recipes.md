# S07 — One-off backfill of existing recipes

Wave 4 · Schema: no · Depends on: S03, S05 (S04 helpful for reviewing results)

Read `docs/rehaul/sessions/_common.md` and the S03 and S05 logs first.

## Goal
Bring the existing 78 recipes into the new book without guessing anything (D3, D12).

## Known shape of the data (snapshot from 12 Oct 2026; re-check)
- About 45 recipes have a source URL → enrich them with method, servings and times using the S05 importer's tools, in **enrich mode**: it fills empty fields and never overwrites anything Ronen has entered.
- About 15 are really quick items, typically one ingredient or "Simple …": Simple Fries, Simple Steamed Rice, Simple Noodles, Simple Israeli Couscous, Simple Sweet Potatoes Fries, Chicken Nuggets, Ready soup, Air Fried Green Beans, Baked Cauliflower, Burgers and Fries, Nuggets and Onion Rings, Steak Sandwich, Tortillas… → **propose** `kind = quick`.
- About 15 family recipes with no URL (Shini's …, Rhiny's Schnitzels, Beef in Oyster Sauce, Tuna and Anchovy Pasta, Improvised Pasta, …) → **leave alone**. They're captured later via MCP (S06) or as you cook (S09).
- Duplicates: "Easy Asian Cucumber Salad" ×2, "Pan Fried Sea Bass with Lemon Garlic Herb Sauce" ×2 → **flag** them. Merging has to preserve meal-plan references (MealPlan rows point at recipe ids), so propose how.

## Scope
1. Script `scripts/rehaul/backfillRecipes.ts` with two modes:
   - `--dry-run` (default): runs the agent per recipe, writes **nothing** to the DB, and produces a report (`backfill-report.md` plus a JSON file, both gitignored). One line per recipe: proposed action (enrich / quick / leave / duplicate), what would change, and the agent run id. URLs that fail (404, paywall, no method found) are listed as "leave", with the reason.
   - `--apply <report.json>`: applies only the actions Ronen has kept in the JSON (he can delete lines). Idempotent, so re-running doesn't double-add steps.
2. Every per-recipe agent run is recorded with trigger `batch`, so it's visible on `/agent-runs`.
3. Rate-limit politely, both to recipe sites and to the API. Report total token usage.
4. Before `--apply` on production: check that a DB backup exists, or tell Ronen exactly how to take one for the actual provider. Ask; don't assume Supabase or Neon.

## Out of scope
Capturing family recipes. Merging duplicates automatically: propose only, apply only if Ronen approves.

## Done when
A dry-run report against prod data is in front of Ronen, with a summary of counts by action. **Stop there.** Applying it is Ronen's call, and can happen after the PR merges.

## Walkthrough focus
How the same importer agent is reused in batch, what enrich mode changes in the prompt, and how the dry-run/apply split protects production data.
