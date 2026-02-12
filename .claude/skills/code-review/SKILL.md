---
name: code-review
description: Review the codebase for improvements and create a summary report
---

Run a review of the codebase: review the user's preferences (project structure, file sizes, design preferences etc.) and review the project.
In Docs/Code Reivews, create a file called Code-Review-{DATE} (where {DATE} is replaced with today's date) which highlights areas for improvements.
Each area for improvement should be numbered to make it easier for the user to choose which areas they would like to address.
Each area should clearly highlight the issues, ease of fixing and impact of fixing. This should be just a rough estimate unless you suspect the change is very risky (e.g breaking schema changes) - in which case you should detail the risks.

In particular, consider and add a section around AI Assisted Coding suitability - consider the context requried for changes and highlight areas where additional modularity might be useful.

Finally, quickly review the last 2-3 code reviews in the folder to make sure no big items from previous reviews were missed. The code reviews documents are not updated by design (kept as a snapshot in time) so it's very likely that they will describe a system that evolved since then. That's good. You're looking for things we forgot to fix and are still around.