# EPIC-007: Conformance

Status: Active
Goal: Every "fix before release" finding from epic close audits, fixed before the first release.
Design: Architecture.md; Design.md, section Epics

## Tasks

- [x] T-007.1 CLI task writes during an epic no longer collide with the epic branch at merge (done when: ticking a task with doit set while its epic is Active leaves the main checkout clean or the merge conflict-free; a test covers it)
- [x] T-007.2 Project colours five to seven come from tokens with dark values, not literals in web/state.js (done when: web/state.js COLORS holds only var(--p…) tokens, each defined for light and dark in style.css)

## Test plan

- Batch A: T-007.1 (store, cli): development
- Batch B: T-007.2 (web): development
- Performance: none

## Check in play

Nothing yet.

## Notes

Decisions and deviations, newest first.

- T-007.2 added 2026-11-20 from the EPIC-008 close audit.
- T-007.1 added 2026-11-20 from the EPIC-006 close audit.

## Close audit

## For the standard
