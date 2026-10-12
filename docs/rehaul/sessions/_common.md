# Common rules for every rehaul session

Read this before starting any session in `docs/rehaul/sessions/`.

## Context to read
1. `docs/rehaul/PLAN.md` — decisions D1–D13 and the parallel-safe rules. Treat the decisions as settled. If the code makes one of them impractical, stop and ask; don't work around it.
2. Your session prompt.
3. The log of every session your prompt lists under "Depends on" (`docs/rehaul/logs/<id>.md`).
4. `claude.md` and the repo skills `coding-conventions`, `naming-convention`, `db-migrations` (if your session is schema: yes), `generate-tests`, `ui` (if you touch UI).

Do **not** run `pick-up-context` or read `MEMORY.md`. ARCHITECTURE.md is partly stale; the code is the source of truth.

## Working with Ronen
- Ronen reads React/Next/TypeScript and reviews design, but doesn't write code. You write it.
- Before writing code, show a short design (data flow, files you'll create or change, anything surprising) and wait for a go-ahead. Keep it to one screen.
- Ask one question at a time. Never more than three paragraphs without checking in.
- For local toolchain problems (Node, npm, Homebrew), just fix them or give the exact command. Don't turn them into a lesson.

## Git and files
- Branch: `rehaul_<session-id>_<short_name>` in its own worktree. Commit per discrete change. `npm test` must pass before each commit.
- Open a PR when done. **Do not merge to main** and do not run `push-to-prod`.
- **Do not edit:** `docs/rehaul/PLAN.md`, anything in `docs/rehaul/sessions/`, `ARCHITECTURE.md`, `BACKLOG.md`, `FEATURES.md`, `README.md`, or another session's log.
- **Do write:** `docs/rehaul/logs/<your-session-id>.md` (create it). It's yours alone.
- Only touch `prisma/schema.prisma` if your prompt says `Schema: yes`.
- Follow PLAN.md → "Branches, testing and promotion to main". In particular: **database changes only add** (no renames or drops), and never point anything at the production database. Use the local Postgres in your session VM (see "Session environment").
- CI must be green on your PR before you hand over.

## Session environment
- **Database:** `service postgresql start`, create a local database, point `DATABASE_URL` and `DATABASE_URL_UNPOOLED` at it, run migrations and `npm run db:seed`. Integration tests use the same server.
- **Claude:** `ANTHROPIC_API_KEY` comes from the cloud environment (dev-only, capped). Run the real path at least once before opening the PR and show Ronen the result. Unit tests still mock Claude.
- **Never ask for production keys or connection strings.** Real-data checks happen on the PR's Vercel preview.

## AI conventions
- Claude via the official Anthropic TypeScript SDK. Use the client and model config from `lib/ai/` (set up in S01). Don't hardcode model names elsewhere.
- Check the current SDK docs for tool-use and server-tool identifiers. Don't rely on remembered version strings.
- OpenAI stays for embeddings only.
- Agents record every run through `lib/agents/runLog.ts` (from S05 on).
- Prompts live next to the agent in their own file, not inline in route handlers.

## Finish with
1. **Walkthrough for Ronen** (in the chat, not a file): what was built, design first; then the 3–5 pieces of code that matter, with file and line references; for agents, where the loop is, what each tool does, and one real run traced end to end. Then **what to try on the preview URL**: 3–5 concrete things to tap on a phone, and what Ronen should see. Then ask if anything is unclear.
2. **Your log file**, with these sections:
   - `## Built` — outcome in a few lines
   - `## Decisions` — anything decided during the session, and why
   - `## Handoff` — what later sessions need to know (names, gotchas, follow-ups)
   - `## Proposed doc updates` — concrete edits for ARCHITECTURE/BACKLOG/FEATURES, for docs-sync to apply
3. Open the PR and stop.
