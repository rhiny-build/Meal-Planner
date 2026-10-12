# S02 — Move day notes from browser storage to the database

Wave 1 · Schema: **yes** · Depends on: none · Can run alongside: S01

Read `docs/rehaul/sessions/_common.md` and the repo skill `db-migrations` first.

## Goal
Day notes on the meal-plan grid ("football till 7", "out Thursday") are stored in the DB. They persist across devices and weeks, and are readable by agents later (the S12 draft-week agent depends on this history).

## Current state
- `lib/hooks/useDayNotes.ts` stores notes in `localStorage` under `mealPlanNotes_<weekStart>`, and **deletes them once the week is past**.
- Notes are shown and edited in the meal-plan components (find where `useDayNotes` is used).

## Scope
1. New model `DayNote`: `id`, `date` (unique, a calendar day; follow the timezone helpers in `lib/dateUtils.ts` — `parseDateParam`/`formatDateParam` — because the app has had an off-by-one-day bug before), `text`, timestamps.
2. Server actions to read the notes for a week and to upsert or delete one day's note. Empty text deletes the row.
3. Rewrite `useDayNotes` to use them. Keep the component API the same so the UI barely changes. Remove the "clear past weeks" behaviour: history is the point.
4. One-off migration of existing notes: on first load, if `localStorage` has notes for the current or future weeks, push them to the DB and then remove the localStorage keys. Keep this small and delete-able, and note in your log when it can be removed.
5. Tests for the actions and the hook.

## Out of scope
Any agent use of notes. Note UI redesign.

## Done when
A note typed on the laptop shows up on the phone. Last week's notes are still there next week. Tests pass.

## Focus for "How it works" in your log
The migration (what changed in the DB), and how server actions replaced localStorage in the hook.
