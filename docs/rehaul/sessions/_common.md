# Common rules for every rehaul session

These rules apply to every rehaul build session, and to every subagent a phase run starts.

## Context to read
1. `docs/rehaul/PLAN.md`: decisions D1–D13, environments, and the database rules. Treat the decisions as settled.
2. Your session prompt.
3. The log of every session your prompt lists under "Depends on" (`docs/rehaul/logs/<id>.md`).
4. `claude.md` and the repo skills `coding-conventions`, `naming-convention`, `db-migrations` (if your session is schema: yes), `generate-tests`, `ui` (if you touch UI).

Do **not** run `pick-up-context` or read `MEMORY.md`. Do **not** follow `push-to-prod` or the merge step in `git-discipline`; this file replaces them. ARCHITECTURE.md is partly stale; the code is the source of truth.

## Work unsupervised
Ronen does not review each change. Build, test and decide on your own. Interrupt him **only** for:
- **UX changes**: anything that changes how a screen looks or behaves beyond what the session prompt describes.
- **Blockers**: e.g. the Anthropic API cap is hit, a service is unreachable, or a required secret is missing.
- **Real trade-offs**: two reasonable options with different consequences for him as a user.

Anything else, decide it yourself, pick the conventional option, and record it under `## Decisions` in your log. Never interrupt to ask "shall I continue?", "shall I open the PR?" or "is this branch name OK?".

When you do interrupt, use the message format in `claude.md` and stop until he answers.

## Branches (strict)
- Ignore any default branch name the environment gives you. Work on, and push to, exactly the branch your prompt names.
- If you cannot push to that name, say so in your **first** message, and don't rename it quietly.
- Commit per discrete change. `npm test` must pass before each commit.
- Never push to `main`.

## Files
- **Do not edit:** `docs/rehaul/PLAN.md`, anything in `docs/rehaul/sessions/`, `ARCHITECTURE.md`, `BACKLOG.md`, `FEATURES.md`, `README.md`, or another session's log.
- **Do write:** `docs/rehaul/logs/<your-session-id>.md`. It's yours alone.
- Only touch `prisma/schema.prisma` if your prompt says `Schema: yes`. Database changes only **add** (no renames or drops).

## Session environment
- **Database:** `service postgresql start`, create a local database, point `DATABASE_URL` and `DATABASE_URL_UNPOOLED` at it, then run migrations and `npm run db:seed`. Integration tests use the same server. Never production.
- **Claude:** `ANTHROPIC_API_KEY` comes from the cloud environment (dev-only, capped). Unit tests mock Claude, but run the real path yourself at least once.
- **Never ask for production keys or connection strings.**

## Test it yourself before calling it done
- Unit tests and integration tests pass.
- Run the app against local Postgres and exercise the feature the way a user would (Playwright, per the `ui` skill). For AI features, use real Claude at least once.
- "I haven't tried it in the running app" is never an acceptable hand-over.

## AI conventions
- Claude via the official Anthropic TypeScript SDK. Use the client and model config from `lib/ai/` (set up in S01). Don't hardcode model names elsewhere.
- Check the current SDK docs for tool-use and server-tool identifiers. Don't rely on remembered version strings.
- OpenAI stays for embeddings only.
- Agents record every run through `lib/agents/runLog.ts` (from S05 on).
- Prompts live next to the agent in their own file, not inline in route handlers.

## Finish with your log file
`docs/rehaul/logs/<id>.md`, with these sections:
- `## Built`: the outcome for Ronen as a user, in a few lines.
- `## Decisions`: what you decided without asking, and why.
- `## How it works`: a short plain-language explanation for Ronen's learning. Design first, then the 2–3 pieces of code that matter. For agents: where the loop is, what each tool does, and one real run traced.
- `## Try on the preview`: 3–5 concrete things to tap on a phone, and what Ronen should see.
- `## Handoff`: what later sessions need to know.
- `## Proposed doc updates`: edits for ARCHITECTURE/BACKLOG/FEATURES.
