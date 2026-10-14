# Run: "Next week's list" (receipts → predicted shopping list)

Read `docs/rehaul/sessions/_common.md` first. Work unsupervised, use the `claude.md` message format, and follow "Real Claude spend" (budget: 150k tokens).

**Start only once the UX refresh PR is merged into `main`.** If it isn't merged yet, stop and tell Ronen.

## Why
The current shopping list merges static staples, static restock items and badly normalised recipe ingredients. Ronen's real workflow is to paste a list into Sainsbury's. This feature predicts next week's order from his **real receipts**, plus the meals planned for that week, and he reviews it and copies it.

## Branch
Work on **`rehaul_phase4_list`** (it exists). First merge the latest `main` into it, so it has the UX refresh. One PR to `main` at the end; don't merge it. Before every push, check the branch's PR isn't already merged (`claude.md`).

## Reference material (in `docs/rehaul/mockups/`)
- `NextWeekDesktop.dc.html`: the **agreed layout**. Phone: same content, three tabs (Meals / Usual / Need these?). The older `NextWeekPhone.dc.html` shows the tab pattern, but its content is out of date.
- `prediction_reference.py`: the prediction method, already tested on 53 real orders (Sept 2025 – Oct 2026). Port its logic; don't redesign it.

## Scope
1. **Receipt upload (admin page):** upload Sainsbury's receipt PDFs, many at once, or a zip. Parse them with the existing receipt parser logic (`restock-agent/lib/parseReceipt.ts`). Watch for two things:
   - a product name that wraps its weight onto its own line, e.g. "0.42kg £8.50", is a continuation, not a new item;
   - each receipt's parsed count must equal its "Groceries (N items)". Report any receipt where it doesn't.
   Store the items in `PurchaseHistory`. Uploading the same receipt twice must not duplicate anything.
2. **Product → item:** each distinct product name gets an **item** ("JS Whole Cucumber" and "Sainsbury's Whole Cucumber" are both "cucumber"), an **aisle**, and a **cupboard** flag (pasta, spices, oil: yes; fresh food: no). Use the cheap model **once per new product name** and cache the result in a new table. Adding tables is fine; database changes only add. Ronen can correct an item or aisle; corrections stick.
3. **Prediction** (as in `prediction_reference.py`, but at item level):
   - **Usual weekly items:** items in **≥80% of the last 10 orders**. Ticked.
   - **Do you need these?:**
     - items in 70–79% of the last 10 orders;
     - plus restock items: bought ≥8 times, steady rhythm (spread ≤0.6), now 0.9–2× their usual gap.
     Unticked, each with a one-line reason ("Usually every 2 weeks, last bought 4 weeks ago").
   - Each line shows the **product bought most recently** for that item.
4. **Meal ingredients first:** for next week's meal plan, list each meal and its ingredients, matched to items (and from there to Ronen's real products). Rules:
   - **Fresh ingredient:** ticked.
   - **Cupboard ingredient:** ticked only if it's likely run out (since last bought > 1.5× its usual gap). Otherwise unticked, with the reason. If it's never been bought: unticked, "check".
   - **No duplicates:** an item needed by a meal is removed from the other two sections. The usual weekly items show it greyed out, "see Tue".
   - **Two meals, same item:** one line, "for Mon + Thu".
   - **No match to a known item:** show the plain ingredient name, unticked, "check".
5. **Copy for Sainsbury's:** one tap puts every ticked line on the clipboard, one product name per line.
6. **Where it lives:** a new "Next week" view as the first thing in the Shopping tab. The old shopping list stays reachable, unchanged, until Ronen decides to retire it.
7. **No learning from ticks** in this version. New receipts are the only feedback.

## Testing
- Port the method's backtest as a test. Using receipt fixtures from the parser, the usual weekly items must be right **≥80% of the time** across the last 8 orders. Use anonymised or synthetic receipt fixtures; never commit Ronen's real receipts to the repo, which is public.
- Unit tests for each meal-ingredient rule, and a re-upload test (no duplicates).
- Real Claude only for the product → item mapping, on a sample of at most 50 names. The full mapping runs on production when Ronen uploads.
- Playwright at desktop and phone widths.

## Finish
- Log: `docs/rehaul/logs/RUN-next-week-list.md`.
- PR to `main`. Message Ronen with the steps after merging:
  1. Upload the receipts zip on the admin page.
  2. Check the upload report.
  3. Open Next week.
