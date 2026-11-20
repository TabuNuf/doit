# EPIC-006: Conformance

Status: Active
Goal: Every "fix before release" finding from epic close audits, fixed before the first release.
Design: Architecture.md; Design.md, sections Epics and Running it

## Tasks

- [x] T-006.1 Split domain/board.js before it passes 300 lines (done when: board.js under 250 lines; move and ordering logic in its own class; npm test passes)
- [x] T-006.2 doit epic close also sets the epic Done and moves its file to Completed/ (done when: after doit epic close the epic file is in Epics/Completed with Status: Done and no task files remain)
- [x] T-006.3 Doit.app restarts a server that runs older code than the checkout (done when: the server reports the commit it started from; the launcher, finding a running server on another commit, stops it and starts the current code; a test covers the commit check)

## Test plan

- Batch A: T-006.1 to .3 (domain, cli, server, launcher): development, run at the batch's end. `npm test` checks board.js stays under 250 lines and the move logic is its own class; `doit epic close` leaves the epic in Completed/ with Status: Done; the server reports its start commit.
- Performance: none

## Check in play

- T-006.3: with Doit running, commit a change, double-click Doit.app, and see the new code without quitting first.

## Notes

Decisions and deviations, newest first.

- T-006.3 added 2026-11-20: a server started before EPIC-005 merged kept running, so clicking an epic in the page showed "No such API route". The page loads fresh from disk but the server's routes do not, and the launcher only opens the page when a server is already up.

## Close audit

## For the standard
