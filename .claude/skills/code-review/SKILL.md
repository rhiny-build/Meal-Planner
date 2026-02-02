---
name: code-review
description: Review the codebase for improvements and create a summary report
---

Run a review of the codebase: review the user's preferences (project structure, file sizes, design preferences etc.) and review the project.
Create a file called Code-Review-{DATE} (where {DATE} is replaced with today's date) which highlights areas for improvements.
Each area for improvement should be numbered to make it easier for the user to choose which areas they would like to address.
Each area should clearly highlight the issues, ease of fixing and impact of fixing. This should be just a rough estimate unless you suspect the change is very risky (e.g breaking schema changes) - in which case you should detail the risks.