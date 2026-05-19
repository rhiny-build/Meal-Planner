---
name: ui
description: Rules and validation process for all UI work — fixes and new features
---

## Before Starting

Check if dev server is running before starting:
`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`

If not running, start it: `npm run dev`

## MCP Tools

**Playwright MCP** — for end-to-end UI validation
- Always reference it explicitly as "use Playwright MCP"
- Navigate to affected pages and verify behaviour works end-to-end

**Chrome DevTools MCP** — for debugging
- Use for console errors, network requests, DOM inspection
- Use after any pipeline changes to verify no console errors

## Done Criteria

A UI change is not complete until Playwright validation has run and passed. Do not commit, do not summarise, do not move on until this has happened.

**For fixes:** run Playwright across all affected areas plus any adjacent UI that could have regressed. Do not assume a fix is isolated.

**For new features:** validate the full new surface end-to-end, including edge cases and empty states.

## Hard Rule

Do not mark UI work as done based on TypeScript passing or logic looking correct. That is not sufficient. Playwright validation is the gate.