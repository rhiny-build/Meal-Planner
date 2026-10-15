# CLAUDE.md

## Non-Negotiables

- Never leave DB and code out of sync — schema changes and code updates go in the same commit
- Code must work on Vercel (serverless), not just locally. "Works on my machine" isn't done
- When unsure, ask one specific question. Wait for the answer. Never proceed on an assumption
- Always update relevant documentation on feature completion. If you change structure (tables, agents, flows, deploys), update the matching diagram in `ARCHITECTURE.md`. (Rehaul build sessions are the exception: they write only their own log, and a docs-sync run updates the shared docs.)
- Never push to `main`. All work reaches `main` through a pull request that Ronen merges (merging **is** a production deploy)

## User Interaction

- Never overwhelm. If a response requires more than 3 paragraphs, break it down and ask before continuing
- Never ask more than one question at a time

## Message Format

Every message to Ronen uses this shape:

- **What I need from you:** first line. A yes/no, a choice between numbered options, or "nothing, FYI"
- **Status:** one line. Designing / waiting for approval / building / testing / done
- **Details:** at most 5 short bullets, plain language, about what changes for Ronen as a user. No file names or code unless he asks
- **My recommendation:** when asking him to decide, which option you'd pick and why, in one line

Stop and wait whenever "What I need from you" isn't "nothing".

## Pushing to a Branch with a PR

- Before every push to a branch, check whether it has a pull request and whether that PR is already merged or closed
- Never push to a branch whose PR is merged or closed. The commits won't reach `main`. Start a new branch from the latest `main` and open a new PR
- After pushing, confirm the PR includes the new commit before telling Ronen it's ready

## Setup and Infrastructure Decisions

Applies to environments, secrets, CI, deployments and databases.

1. State the requirements first, in a few bullets, and get Ronen's OK
2. Check the official docs before proposing anything, and cite them
3. Give one proposal, checked against every requirement, with trade-offs stated
4. Don't act until Ronen agrees

## Code Design

- Design for modularity before writing code, not after
- Components should have a single clear responsibility
- Extract logic to utility functions early — don't wait until a file is too long
- If a file is approaching its size limit, decompose first, then continue

## Branches and previews

- One short-lived branch per piece of work, one PR to `main`
- Vercel only builds `main` and branches matching the allow-list in `vercel.json` (`rehaul_phase*`). A branch with another name gets no preview: either use a matching name or add its pattern to `vercel.json` in the same PR
- Preview deployments get their own copy of the data (a Neon branch), so try features there, not in production

## Architecture

Refer to ARCHITECTURE.md (diagrams of the system, data model, agents, receipts flow, planning flows and deploys) before making structural decisions. It was rewritten from the code in the clean-up run; when in doubt, the code is the source of truth, and a diagram that disagrees with it is a bug to fix.
