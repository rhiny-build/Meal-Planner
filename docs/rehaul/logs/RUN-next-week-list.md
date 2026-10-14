# RUN: Next week's list (receipts to predicted shopping list)

Branch `rehaul_phase4_list`. The UX refresh (PR #18) was already merged into `main` and into this branch, so the run could start.

## Built
- **Admin page `/admin/receipts`** (linked from Settings). Choose many PDFs or a zip. The zip is opened in the browser, the `.eml` files are ignored, and each PDF goes **straight from the browser to private Vercel Blob**. The server then reads them in batches of 5 with a progress bar. Nothing big ever passes through a Vercel function.
- **Raw receipts kept**: every PDF is stored unchanged at `receipts/<Sainsbury's order number>.pdf` (private Blob). The zip itself is not stored.
- **Upload report**: receipts read (new / already stored), items, receipts that could not be read, and every receipt whose parsed count differs from its own "Groceries (N items)".
- **Re-upload is safe**: rows are keyed by order number and line, so the same receipt twice replaces its own rows and adds nothing.
- **Rebuild from stored receipts** button: re-reads every stored PDF and rebuilds the purchase history from them. Safe to run any time (each order is replaced in one transaction). Gives the same report.
- **Product to item**: each new product name is sent once to the cheap model (Haiku 5.5) and the answer (item, aisle, cupboard flag) is cached in `ProductMapping`. Ronen can correct an item or aisle with **Edit** on any line. Corrections stick (a corrected row is never overwritten).
- **Next week** is the first tab in Shopping. The old tabs (This Week's Meals, Staples, Restock, Shopping List) are unchanged and still reachable. Desktop shows the agreed layout; on a phone the same content is three tabs (Meals / Usual / Need these?).
- **Copy for Sainsbury's** puts every ticked line on the clipboard, one product name per line.
- Ticks Ronen changes are remembered (`NextWeekTick`) until the order date has passed. The list itself is never saved: it is recomputed from the receipts and next week's meal plan on every visit.

## Decisions
- **Vercel docs were not reachable** from this session (vercel.com is blocked by the cloud environment's network policy), so I could not read the current limits as asked. I designed for the conservative known limits instead (a few MB request body, short function time): files never go through a function, parsing is 5 PDFs per request (`maxDuration` 60 s), and the classify step is 30 names per request. This works whatever the exact numbers are. Worth a 2-minute check of the Functions limits page by Ronen.
- **Count check**: a receipt "matches" if its parsed line count **or** its parsed unit count (a "2 x" line counts as 2) equals "Groceries (N items)". I had no real receipt to tell which one Sainsbury's uses. The report shows both numbers for any mismatch, so the first real upload will settle it.
- **Order number** comes from "Order number: ..." in the PDF, else from a 6+ digit number in the file name. If neither exists the receipt is reported as unreadable (and nothing is stored). This is the part most likely to need a tweak on the first real upload, since I could only test with synthetic receipts.
- **Variable weights** ("0.42kg") are stripped from product names so the same product has the same name every week. A line that is only a weight and a price is a continuation of the product above.
- **PDF reading**: replaced `pdf-parse` (old bundled pdf.js) with `pdfjs-dist` for the new code, joining text exactly the way pdf-parse did. On Node 22 the old one failed on good PDFs at random and could crash the process with an unhandled rejection; the new one read 53/53 synthetic PDFs in 1.1 s. `scripts/purchase-history/import-receipts.ts` still uses pdf-parse (untouched).
- **Old rows**: `PurchaseHistory` rows from the earlier batch import have no order number and are ignored by the new prediction (the receipts are the source of truth). They are not deleted.
- **Item matching for recipe ingredients** is deterministic and free (word matching against Ronen's items, ties to the item he buys most), not another model call. Ingredients that match nothing show as the plain name, unticked, "check". Fallback item name for a product the model has not classified yet is the cleanup rule from `prediction_reference.py`.
- **Which meals**: dinner recipes only (protein, carb and vegetable slots of each planned day, one card per day). Lunches are not included. "Next week" is the week after the current one (using the week-start setting); the order date is the weekday most of the last 10 orders were delivered on, within that week.
- **Cupboard ingredient bought only once** (no usual gap can be worked out): unticked, "check".
- **Two meals needing the same item**: one real line in the first meal ("for Mon + Thu"); the later meal shows a greyed "see Mon".
- **Prediction needs at least 4 earlier orders**; with fewer, the tab asks for receipts. Restock items must also have a usual gap of at least 1.5 weeks (kept from the reference method), so weekly items are "usual", not "restock".
- **Phone tab bar**: two top tab labels are shortened on a phone (Meals, List) so all five tabs fit.
- No feature flag: the prompt makes Next week the first tab, and the old tabs are untouched.
- `npm run lint` is broken in this repo (`next lint` no longer exists in Next 16), so I used `tsc --noEmit` and the tests.

## How it works
**Design.** Three layers, each testable alone:
1. *Receipts in.* Browser to Blob, then `/api/admin/receipts/process` reads a few PDFs, parses them (`lib/receipts/parseReceipt.ts`), stores the raw PDF and replaces that order's `PurchaseHistory` rows. Same code path for upload and rebuild.
2. *Products to items.* `lib/nextWeek/classifyProducts.ts` finds product names with no `ProductMapping`, asks Haiku in batches of 30, caches the answers.
3. *The list.* `lib/nextWeek/loadNextWeek.ts` loads receipts, mappings, next week's meal plan and ticks, then the pure functions `predict.ts` (usual weekly / "do you need these?") and `buildList.ts` (meal ingredient rules) build the three sections. Nothing is stored except ticks.

**Code that matters.**
- `predict()` in `lib/nextWeek/predict.ts`: share of the last 10 orders an item is in (>= 80% usual, 70-79% maybe), plus restock items (bought >= 8 times, spread <= 0.6, now 0.9-2x the usual gap).
- `buildNextWeekList()` in `lib/nextWeek/buildList.ts`: one place for every meal rule (fresh ticked, cupboard only if > 1.5x its gap, no duplicates, "for Mon + Thu", unmatched means "check").
- `saveParsedReceipt()` in `lib/receipts/ingest.ts`: delete-then-insert per order in one transaction, which is why re-uploads and rebuilds never duplicate.

**A real run (local, synthetic receipts, real Claude).** Uploading a zip of 56 PDFs + 56 .eml: 56 receipts read, 1109 items, 56 other files ignored, 0 count mismatches, 33 product names sorted by the model (4,046 tokens). Uploading it again: 0 new, 56 already stored, 0 new products, no extra model call. Rebuild: 56 receipts, 1109 items, same.

## Tests
- Backtest as a test: usual weekly items right at least 80% of the time across the last 8 of 53 synthetic orders (parsed from receipt text). Measured 92.7% (range 73-100%).
- Unit tests: parser (wrapped name, weight-only line, count match and mismatch, UTC dates), every prediction threshold, every meal rule, copy text, ingredient matching.
- Integration (real Postgres, real PDFs generated from synthetic receipts): store + raw PDF, re-upload adds nothing, unreadable receipt stores nothing, rebuild repairs damaged rows, product mapping runs once and never overwrites a correction, the loaded list from a meal plan.
- Playwright (desktop 1280 and phone 390, run against the dev server; scripts in `scripts/next-week/e2e/`, screenshots in `docs/rehaul/logs/next-week-screens/`): zip upload with progress and report, second upload, rebuild, tick kept after reload, copy to clipboard (13 lines), edit item/aisle, old list tab reachable, no sideways scroll on the phone.
- Fixtures are synthetic (`tests/fixtures/receipts/synthetic.ts`); no real receipt is in the repo.
- Real Claude spend: one sample of 50 product names (2 calls) = 7,946 tokens, plus 3 names in a prompt check (about 0.4k), plus 33 names through the app (4,046 tokens): about 12.4k of the 150k budget. The sample answers are recorded in `tests/fixtures/receipts/classify-sample.json` and replayed in a test.

## Try on the preview
1. On a phone open Settings, then Receipts. Choose the receipts zip. Watch the progress bar. When it ends, read the report: receipts read, any "Count mismatches", anything under "Could not read".
2. Open Next week (first tab in Shopping). You should see your meals first, then "Your usual weekly items" by aisle, then "Do you need these?" with a reason on each line.
3. Tick and untick a few lines, leave the page and come back: your ticks are still there.
4. Tap **Copy for Sainsbury's**, then paste into Notes: one product per line, only ticked lines.
5. Tap **Edit** on a line, change its aisle, Save: it moves. Open Receipts and press Rebuild: it stays moved.

## Handoff
- Needs the Vercel Blob store connected to the project (`BLOB_READ_WRITE_TOKEN`) and `ANTHROPIC_API_KEY` in production. Without the Blob token the admin page uses a local folder (dev only).
- The first real upload is the real test of the parser on Sainsbury's PDFs (order number, count rule, wrapped names). If the report shows mismatches or unreadable receipts, send one failing PDF's text and I fix `lib/receipts/parseReceipt.ts`, then Rebuild repairs everything with no re-upload.
- Aisle list and the cupboard rule live in `lib/nextWeek/aisles.ts` and `classifyPrompt.ts`.
- Database: additive only (3 tables, 2 nullable columns on `PurchaseHistory`). Neon backup branch before merging, per PLAN.
- Not done on purpose: learning from ticks, deleting the old shopping list, receipts by email.

## Proposed doc updates
- FEATURES: "Next week" list (receipts to predicted order, copy for Sainsbury's) and the Receipts admin page.
- ARCHITECTURE: new `lib/receipts/` and `lib/nextWeek/`; tables `Receipt`, `ProductMapping`, `NextWeekTick`; raw receipts in private Blob under `receipts/`.
- BACKLOG: retire the old shopping tabs once Next week is trusted; learn from ticks; receipts by email (D10); replace `pdf-parse` in `scripts/purchase-history/import-receipts.ts`; fix `npm run lint` for Next 16.
