---
name: coding-conventions
description: Code structure, React and TypeScript patterns, and conventions for this codebase
---

## Core Principle

Write modular, focused code from the start. Extract early, don't refactor late.

## React Patterns

- Functional components only, arrow functions for consistency
- Single clear responsibility per component
- Extract reusable logic to utility functions before a file gets large
- Use descriptive prop names
- No global state management — React `useState` for local state
- API calls refresh data from the database as source of truth

## TypeScript

- Strict type checking enabled
- Use `type` for data shapes, `interface` for component props
- Prisma generates types automatically — use them
- Prisma handles runtime validation at the database level

## Data Immutability

- Always create new arrays/objects when updating state
- Use spread operators: `{ ...data, field: newValue }`
- Use `filter()`, `map()` — avoid direct mutations

## API Endpoints

When adding a new API route:
1. Create file at `app/api/[route]/route.ts`
2. Export async functions: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
3. Add basic validation for required fields
4. Use Prisma client for database operations
5. Return `NextResponse.json()` with appropriate status codes

Keep handlers under 50 lines. If longer, extract logic to a separate file.

## File Size

- Component files: 100–150 lines, 250 hard ceiling
- API route handlers: 50 lines max
- Business logic: 200 lines max with clear sections
- Hooks: 50–80 lines

If a file is approaching its limit, that's a signal to decompose — not to keep adding.

## Date Handling

JavaScript's `new Date(string)` treats bare date strings (`YYYY-MM-DD`) as **UTC midnight**. In any timezone behind UTC, `getDate()` / `getDay()` on that Date returns the *previous* calendar day. This causes off-by-one bugs in week navigation, date comparisons, and DB queries.

**Rules:**

- **Parsing a YYYY-MM-DD string** (URL params, user input): use `parseDateParam(str)` from `lib/dateUtils.ts` — it constructs `new Date(year, month-1, day)` (local midnight).
- **Formatting a Date to a YYYY-MM-DD string** (URL params, API payloads): use `formatDateParam(date)` from `lib/dateUtils.ts` — it reads local year/month/day, never UTC.
- **Never use** `new Date('2026-05-05')` to parse a calendar date, or `.toISOString().split('T')[0]` to format one.
- **Safe uses of `new Date`**: copying a Date object (`new Date(existingDate)`), getting current time (`new Date()`), or parsing a full ISO timestamp with timezone info (`new Date('2026-05-05T07:00:00.000Z')`).
- **Prisma Date fields**: returned as JS `Date` objects — no parsing needed.

## Code Style

- ESLint enforced — run `npm run lint` before committing
- Follow Next.js and React best practices
- No `helpers`, `utils`, `misc` file suffixes — if a file needs a vague name it's doing too many things