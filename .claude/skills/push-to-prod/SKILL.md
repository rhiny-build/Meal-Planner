---
name: push-to-prod
description: run a basic pipeline to our production environment (Vercel)
---

Check in all files into git and run the test suite.
Review the state of the test suite and modify/extend it if required (tests should have been generated ahead of this step but you should check regardless)
Run the test suite and fix any relevant failing tests. This means fixing any bugs found as well as any issues with the tests. If unrelated tests are failing - ask the user for direction (fix/skip).
After all tests pass, merge the branch into main and then push to github.
Delete the branch and inform the user the action is completed.
Update the backlog as necessary.