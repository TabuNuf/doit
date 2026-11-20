# EPIC-011: Move epics

Status: Done
Closed: 2026-11-20
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

- Checked by Claude on a throwaway copy of these docs at 1400 px, with real drag events: a Planned epic parked (file in `Parked/`, status Parked), reopened from Parked, dropped on Archived (`Closed:` and `Archived:` lines, both tasks in `Archive/Tasks`), reopened from Archived (status Planned, open task back as To-do, ticked one as Completed), dropped on Completed; an Active epic dropped on Parked showed the refusal toast. Each section header unfolds on click. Not checked: the confirm dialog itself (answered by script), dark mode, the stacked layout.

## Notes

Decisions and deviations, newest first.

- 2026-11-20, browser check: clicking a section header did nothing, because the Docs tree's click handler also reads `data-fold` and ran first; the epic headers use `data-epic-fold` now, with a test that no header attribute is one the Docs click reads. Dragging to Archived missed when it passed over Completed, which unfolded on enter and pushed Archived down; a header now unfolds only after the epic rests on it 600 ms. The 10 s reload now waits during an epic drag, since a re-render ends it.

- 2026-11-20: planned from Tabu's request. Archived as a drop target closes and archives in one step rather than staying date-only. Reopen restores only tasks archived by the close, so a task archived by its deadline before the close stays archived.

- 2026-11-20: Batch A. Move logic and the close path sit in `src/domain/epicMoves.js` (`EpicMoves`, pure `planEpicMove`) because `board.js` is capped at 250 lines by `test/structure.test.js`. `parked` comes from the epic's folder, not its status. An epic archived by date counts as archived, so Archived to Completed is refused for it. CLI `epics` lists open then parked, as before. `moveEpic` returns `{moved, restoredTasks, archivedTasks}`.

## Close audit

- Main merged in (EPIC-004 had landed): conflicts in `web/state.js`, `src/domain/board.js` and `Architecture.md` resolved. EPIC-004's activity log records task changes in `Board.#write`, and `EpicMoves` wrote tasks to the source directly, so a close or reopen would have gone unlogged. Fixed now: `EpicMoves` takes the Board's logged write, with a test that a close and a reopen log one line per task. Development 85/85, Audit 86/86.
- `src/domain/board.js`, Core/03-Design.md (size): 247 lines against the structure test's cap of 250, after moving epic moves out to `EpicMoves`. Fix before release: split it before the next feature lands in it (already noted at EPIC-010; no conformance epic is open, so it is recorded here).
- Two routes close an epic: `POST .../close` (the Close epic button) and `POST .../move` with `to: completed`. Deliberate for now, both reach `EpicMoves.close`; the button could use move and the close route go. Question for Tabu at the next pass, recommendation: drop the close route.
- Boundaries test passes; the class diagram and module list match the code. Store, domain and server each keep one job; the web part sits in its own `epicMove.js`.

## For the standard

- `App/README.md` Page interaction (new): one `data-` name per meaning in click dispatch, with a test; a hover-opening drop target waits for the dragged item to rest, and a timed reload waits during a drag. Both bugs passed the unit tests and were found with real drag events in the browser.
- 2026-11-20: Batch B. T-011.4 and .5 share one commit: the section headers are the drop targets and the buttons carry the drag attributes in the same markup. Folded section bodies stay in the DOM with `hidden` (not left out), so a header can unfold on drag-over without a re-render that would end the drag. Drag code is in `web/epicMove.js`; `dropEpic(key, to)` is the testable handler. Browser drag not run.
