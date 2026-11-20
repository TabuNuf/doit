# EPIC-007: Conformance

Status: Done
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

- T-007.2: project colours five to seven show from a fifth registered project on, in light and dark. Only one project is registered, so nothing to see yet.

## Notes

Decisions and deviations, newest first.

- Close 2026-11-20: development and audit 43 of 43 on the branch with main merged in. Both ticks in this epic were made with the worktree's `doit set`, which wrote them in the worktree; the main checkout gained nothing.
- T-007.1: the fix moves the write instead of reconciling at the merge. `EpicWorktrees` reads git's own worktree records (`.git/worktrees/<name>/HEAD` and `gitdir`) rather than running git, so the store keeps to fs; a change in that layout would make Doit fall back to the main checkout, not fail. A project folder inside a repository works too: the worktree root gets the same relative path.
- T-007.2 added 2026-11-20 from the EPIC-008 close audit.
- T-007.1 added 2026-11-20 from the EPIC-006 close audit.

## Close audit

Nothing found. `git diff main...HEAD` read against Architecture.md (tiers: the store imports only the domain and node:fs/path; the class diagram has `EpicWorktrees`), 03-Design.md (the finder is built in the composition root and passed in) and App/README.md Styling; `source.js` is 132 lines.

## For the standard

`Core/01-Tasks.md`, Branches: a tool that writes tracked docs writes an active epic's files in its worktree, never the main checkout. `CHANGELOG.md` line added.
