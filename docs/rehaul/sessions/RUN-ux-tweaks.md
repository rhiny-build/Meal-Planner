# Run: UX tweaks (week page, app on the home screen, cook mode resume, latency)

Read `docs/rehaul/sessions/_common.md` first. Work unsupervised and use the `claude.md` message format. This run should need no real Claude calls.

**Start only once the clean-up run's PR is merged into `main`.** If it isn't merged yet, stop and tell Ronen.

## Why
Feedback from Ronen using the app on his phone:
- On the Week page he couldn't find how to add a meal or a note. The only way in is the ⇄ button, which he read as "swap days".
- Every page feels slow to load.
- He opens the app from a browser bookmark. When he leaves cook mode and comes back, he lands in a browser tab and loses his place.

## Branch
**`rehaul_phase_ux2`**, created from the latest `main` (it deploys a preview). Push after meaningful milestones only. One PR to `main` at the end; don't merge it. Before every push, check the branch's PR isn't already merged (`claude.md`).

## Scope
1. **Week page: make adding obvious.**
   - Tapping a day opens its editor (today's "Change day" panel). An empty day says "Plan this day", not "Nothing planned".
   - Each row shows an editable **note** line ("Add note" when empty). Typing it in place saves it, with no panel needed.
   - Replace the ⇄ icon: use an edit affordance for opening the day, and keep swapping days as an option inside the editor, labelled in words.
   - When next week has empty days, show one short hint near Draft my week: "Add notes first, Draft my week uses them".
   - Keep everything the Week page does today: Ask box, Draft my week, Accept all, swap with another day.
2. **Installable, full-screen app.**
   - Add a web app manifest (name, short name, icons, theme colours from the app's style, `display: standalone`, start URL `/`), plus the Apple-specific tags iPhone needs to open it full screen.
   - Make an app icon in the app's style (green ground, a simple mark). Provide the sizes the manifest and iPhone need.
   - Check in standalone mode that navigation works without a browser back button, and that links to recipe websites still open.
   - Check Next.js's own docs for manifest and metadata support, and use that rather than hand-written files where it fits.
3. **Cook mode resumes.**
   - Save the cooking place as it changes: recipe, servings, current step and running timers (their end time, so they survive a reload).
   - Reopening cook mode for that recipe resumes there. The Tonight page shows **Resume cooking** while a session is in progress. Finishing or leaving cook mode on purpose clears it, and so does a session more than 12 hours old.
   - Browser storage on the device is fine for this. Note: on iPhone, the home-screen app and Safari keep separate storage. Say in the log what that means for the existing "tell me as you go" drafts.
4. **Latency: measure, then fix.**
   - **Measure first.** Record, per request, the page or API route, total server time, database time and number of queries, and whether it looks like a cold start. In the browser, record navigation timings (time to first byte, time until the page is usable). Store them in a new table (database changes only add) and show them on an admin page: per page, the median and slowest 10% over the last 7 days.
   - Keep the recording cheap: it must not noticeably slow pages itself, and old rows are cleaned up after 30 days.
   - Don't add an external monitoring service. If Vercel's built-in tools would be better, explain why under "Proposed doc updates" for Ronen to decide; it's an infrastructure decision.
   - **Then fix** what the numbers show from production-mode runs (e.g. sequential queries that could run together, pages fetching more than they show). Report before and after numbers per page in the log. What can only be seen in production (cold starts, the database waking up, the region gap between Vercel and Neon) goes under "Try on the preview", with what to look at on the new admin page.

## Out of scope
- Removing the old shopping list.
- MCP authentication.
- Changes to how the agents work.

## Testing
- Unit tests for the cook-mode save, resume and expiry rules, and for the timing records.
- Playwright at phone (390px) and desktop widths: add a meal and a note to an empty day without using the ⇄ button; Ask box and Draft my week still work; cook mode resumes after a page reload; Tonight shows Resume cooking.
- Check that the manifest is valid and the icons load, in production mode (`npm run build && npm start`).
- The before/after timings come from production mode, not `npm run dev`.

## Finish
- Log: `docs/rehaul/logs/RUN-ux-tweaks.md`, with every section from `_common.md`, before/after phone screenshots of the Week page, and the latency table.
- PR to `main`. Message Ronen what to try on the preview, on his phone:
  1. Add the app to the home screen.
  2. Plan a day and add a note.
  3. Start cooking, switch to another app, then come back.
  4. Check the timings page after a day of use.
