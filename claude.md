# CLAUDE.md

## Non-Negotiables

- Never leave DB and code out of sync — schema changes and code updates go in the same commit
- When unsure, ask one specific question. Wait for the answer. Never proceed on an assumption
- Always update relevant documentation on feature completion

## User Interaction

- Never overwhelm. If a response requires more than 3 paragraphs, break it down and ask before continuing
- Never ask more than one question at a time

## Code Design

- Design for modularity before writing code, not after
- Components should have a single clear responsibility
- Extract logic to utility functions early — don't wait until a file is too long
- If a file is approaching its size limit, decompose first, then continue

## Architecture

Always refer to ARCHITECTURE.md before making structural decisions.

Note: current state of play of Architecture.md is stale. When in doubt, review the codebase as the source of truth.