# EPIC-018: Conformance

Status: Done
Closed: 2026-11-21
Goal: Drift found at epic closes is fixed before the next release.
Design: Architecture.md

## Tasks

- [x] T-018.1 Outreach.taskDone stops swallowing every error: retry without the game only when the game has no profile, and let other failures reach the log (done when: a domain test sees an unknown-contact touch skipped and any other failure reported)
- [x] T-018.2 Board (245 of 250 lines) and Cli (253 lines) get room before their next feature: move a further job out of each (done when: both under 220 lines, structure test passes)

## Test plan

- Batch A: T-018.1 to .2: development

## Notes

Decisions and deviations, newest first.

## Close audit

2026-11-21. Audit tests: 259 pass. Diff 575b114^..5ea4776 read against Architecture.md and Core/03-Design.md: no findings. taskEdit.js and help.js are in the module list and class diagram; DoneNotifier's onError keeps the Board free of contacts; the structure test now holds board.js and cli.js under 220 lines.

## For the standard

Nothing new: both fixes apply rules the standard already has (a split before the next feature, no swallowed errors).
