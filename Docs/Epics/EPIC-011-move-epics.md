# EPIC-011: Move epics

Status: Active
Goal: Tabu drags an epic between the open list, Parked, Completed and Archived, each a folded section below the open epics, and a closed epic reopens with its tasks.
Design: Design.md, section Epics.

## Scope

- Decided: below the open epics, per project: Parked, Completed (was Closed), Archived, all folded until clicked, each with a count.
- Decided: Parked epics leave the open list; they show only in the Parked section.
- Decided: drop on Parked parks a Planned epic (status Parked, file to `Epics/Parked/`); an Active epic is refused, since it has a worktree and branch.
- Decided: drop on Completed is Close epic, with its confirmation. Drop on Archived is Close epic plus an `Archived: <date>` line, so it is archived at once.
- Decided: drop on the open epics reopens: status Planned, file to `Epics/`, `Closed:` and `Archived:` lines removed. From Completed or Archived, the tasks archived with reason `Epic <id> closed` come back, ticked ones as Completed (their completed date kept), the rest as To-do.
- Decided: the CLI is unchanged; `epics` stays open-only.

## Tasks

- [x] T-011.1 Store: park, reopen and archive-on-close for an epic file (done when: a test parks a Planned epic and finds it in `Parked/` with status Parked; reopens it into `Epics/` as Planned; closes one with the archived flag and reads `Closed:` and `Archived:` lines; reopens it with both lines gone; an epic in a worktree is moved there, not in main) `7e298db`
- [x] T-011.2 Domain: `board.moveEpic(project, id, to)` for to = open, parked, completed, archived; the view returns parked epics apart from open ones, and an `Archived:` line makes a closed epic archived (done when: domain tests cover each move, the Active-to-Parked refusal, a same-place move doing nothing, and a reopen restoring a ticked task as done and an open one as todo while a task archived for another reason stays archived) `72d8a1d`
- [x] T-011.3 Server: `POST /api/epics/<project>/<EPIC-nnn>/move` with `{to}` (done when: a server test parks and reopens an epic through the API; an unknown `to` is a 400) `32ca003`
- [x] T-011.4 Web: Parked, Completed and Archived sections, all folded, below the open epics (done when: a web test renders the three sections from view data, folded, and unfolds each by its header; parked epics are not in the open list) `c1c4739`
- [x] T-011.5 Web: drag an epic button onto a section header or the open epics to move it; Completed and Archived ask for confirmation; a refusal shows its message (done when: a web test drives the drop handler for each target and finds the right API call; in play, each move lands in the right section) `c1c4739`

## Test plan

- Batch A: T-011.1 to .3 (store, domain, server): development
- Batch B: T-011.4 to .5 (web): development
- Performance: none
- Touches: none (source and docs only)

## Check in play

- T-011.4: Parked shows EPIC-002 and EPIC-009 for Doit, folded; Completed and Archived fold and unfold.
- T-011.5: on a throwaway project, park a Planned epic, reopen it, close one by dropping on Completed, archive one by dropping on Archived, reopen an archived one and see its tasks back.

## Notes

Decisions and deviations, newest first.

- 2026-11-20: planned from Tabu's request. Archived as a drop target closes and archives in one step rather than staying date-only. Reopen restores only tasks archived by the close, so a task archived by its deadline before the close stays archived.

- 2026-11-20: Batch A. Move logic and the close path sit in `src/domain/epicMoves.js` (`EpicMoves`, pure `planEpicMove`) because `board.js` is capped at 250 lines by `test/structure.test.js`. `parked` comes from the epic's folder, not its status. An epic archived by date counts as archived, so Archived to Completed is refused for it. CLI `epics` lists open then parked, as before. `moveEpic` returns `{moved, restoredTasks, archivedTasks}`.

## Close audit

## For the standard
- 2026-11-20: Batch B. T-011.4 and .5 share one commit: the section headers are the drop targets and the buttons carry the drag attributes in the same markup. Folded section bodies stay in the DOM with `hidden` (not left out), so a header can unfold on drag-over without a re-render that would end the drag. Drag code is in `web/epicMove.js`; `dropEpic(key, to)` is the testable handler. Browser drag not run.
