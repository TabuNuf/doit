# EPIC-005: Conformance

Status: Active
Goal: Every "fix before release" finding from epic close audits, fixed before the first release.
Design: Architecture.md

## Tasks

- [x] T-005.1 Split web/app.js (375 lines) into render, ordering and events modules (done when: no web file over 300 lines; the page works as before)
- [x] T-005.2 One rank-between helper: the page asks the server for a move instead of computing ranks (done when: web/app.js has no rank arithmetic; drag still works)
- [x] T-005.3 doit epic close moves the epic's task files to the archive (done when: closing an epic leaves no task files of it in Epics/Tasks)
- [ ] T-005.4 Clicking an epic opens a view of its contents (done when: Clicking an epic on the board opens a readable view of that epic's document: goal, tasks, test plan and notes, for any epic including parked ones.)

## Test plan

- Batch A (T-005.1 to T-005.4), development, run at the batch's end:
  - `npm test` checks: no file in `web/` is over 300 lines; the move endpoint places a task between neighbours, across sections and to the top; `web/` has no rank arithmetic; `doit epic close` leaves no task file of the epic in `Epics/Tasks` and appears in `doit help`; the epic endpoint returns the document of an open, parked and completed epic; the markdown renderer turns headings, lists and checkboxes into HTML and escapes text.
  - By hand in the page: the board loads and every control works as before; drag a row within Active, to the top of Active, into Backlog; Alt + arrow keys nudge a row; click an epic (also a parked one) and read goal, tasks, test plan and notes; close the view and land on the board.
## Notes

Decisions and deviations, newest first.

- T-005.3: `doit epic close` archives the task files only (including tasks that have no file yet and tasks not ticked). It does not set the epic to Done or move the epic file; that stays in the close procedure.

- T-005.2: `POST /api/tasks/<project>/<id>/move` takes `{section, before|after}`; ranks are computed in `Board.move` with `rankBetween`, within one project. The page used to rank across projects in All projects; it now refuses a drop next to a task of another project and skips other projects' rows on Alt + arrow.

## Close audit

## For the standard
