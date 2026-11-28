# EPIC-026: Hide open tasks of inactive epics

In short: Open tasks of a parked, completed or archived epic leave every list and report, untouched, and come back in the state they had when the epic is open again.
Why it exists: parking an epic left its tasks in the Backlog and in `doit list`, so work nobody wants now was still offered to Tabu and to Claude (on 2026-11-22 the two tasks of the parked EPIC-009 were in this project's Backlog).

Status: Active
Design: Design.md, section Epics, "Open tasks of an epic that is not open are hidden"
Order: after EPIC-028

## Findings

1. `[design]` **An open task is offered only while its epic is open** `Decided`
   - Seen: a parked epic's To-do, In progress and Backlog tasks show in the Open tab, the Claude view, the morning report and `doit list`.
   - Decided: an epic is open while its file is in `Epics/` with status Planned or Active. While it is parked, completed or archived, its open tasks are hidden from the Open tab, the project page's waiting list, the Claude view and its due badge, the morning report, the weekly outreach list and `doit list`. Completed and Archived tasks are not affected.
2. `[design]` **Nothing is written to a hidden task** `Decided`
   - Seen: `epic close` archives every task of the epic, and a reopen brings the unticked ones back as To-do whatever they were.
   - Decided: hiding is a rule on reading. The task files and their states stay as they are, and the tasks show again in the state they had when the epic is back among the open epics. `epic close` archives only the completed tasks. Epics closed before this change keep the old restore on reopen.
3. `[design]` **Asking for the epic still finds its tasks** `Proposed`
   - Decided: `doit show` returns a hidden task.
   - Proposed: clicking the epic in the left pane lists its hidden tasks, and `doit list --epic EPIC-<nnn>` lists them, since a parked epic has to be readable when it is planned again. `doit show` adds a line saying the task is hidden, and `list --json` carries `hidden`.
4. `[design]` **The list says why the tasks show only there** `Proposed`
   - Proposed: with a parked, completed or archived epic selected, a line above the list names the epic and its place, says its open tasks show only here, and says how to bring them back.
5. `[design]` **The sweep still runs on hidden tasks** `Proposed`
   - Proposed: a hidden task whose deadline passes is archived like any other. A deadline is a date in the world and parking the epic does not move it.

## Tasks

- [x] T-026.1 A task knows it is hidden, and the board's view and list leave hidden tasks out (done when: npm test passes with a board test: a parked epic's open tasks are absent from view() and from list() for open, active and backlog, present with hidden true in view({hidden: true}) and list({epic}), found by get, and back in the state they had after the epic is moved to open)
- [x] T-026.2 Closing an epic archives its completed tasks and leaves the open ones hidden (done when: npm test passes with a board test: an epic closed with a todo, a progress and a backlog task keeps all three task files unarchived and hidden, archives its done task, and after a move back to open lists each in the state it had)
- [x] T-026.3 doit show says when a task is hidden, and list --json carries hidden (done when: npm test passes with a cli test: for a parked epic's task, list leaves it out, list --epic prints it, show prints the hidden line, and list --epic --json has hidden true)
- [x] T-026.4 Tests hold the hiding rule for the Claude view, the morning report and the weekly outreach (done when: npm test passes with new tests: no pane of ClaudeView.panes, no line of morning() and no campaign step of Outreach.week names an open task of a parked epic, and each names it again after the epic is moved to open)
- [x] T-026.5 The page keeps hidden tasks out of the Open tab, the due badge and the waiting list (done when: npm test passes with tests: GET /api/board returns a parked epic's open task with hidden true; visible() leaves it out with no epic selected and keeps it with its epic selected; dueSoonTasks() and waiting() leave it out)
- [x] T-026.6 The list says why when the selected epic is parked, completed or archived (done when: npm test passes with a page test: the list pane shows the line for a selected parked epic that has a hidden task, with the epic id and the word parked, and shows no line for an open epic or with no epic selected)
- [x] T-026.7 Check in play (done when: Every check in the description is confirmed in the running board, or its failure is a task in EPIC-026)
- [x] T-026.8 Close audit: a task forced to archived is not hidden, the drag confirm and three comments state the new close rule, and Architecture.md names epicIsOpen and what applyChanges recomputes (done when: A new test moves a parked epic's task file to Archive/ by hand and reads it as archived and not hidden; web/epicMove.js says completed tasks are archived and open ones hidden; npm test passes)

## Touches

Nothing that merges badly as text: source, tests and docs only. EPIC-028 changes `web/` and the store beside it, so main is merged into this branch at the start of Batch B.

## Test plan

- Batch A: T-026.1 to .4 (domain: task, board, epicMoves; cli): development
- Batch B: T-026.5 to .6 (server, web): development
- Performance: none
- Check in play: T-026.7

## Notes

Decisions and deviations, newest first.

- 2026-11-22, checked in the running app by the coordinator, on a scratch project in a scratch data folder (the worktree's server on port 4399), all as specified:
  - Parking an epic with a To-do, an In progress, a Backlog and a designer's task with a deadline took all four out of the Open tab, the Claude view, the due badge (2 to 1) and the project page's waiting list.
  - Selecting the parked epic listed them under the line "EPIC-004 is parked, so its open tasks show only here. Drag it onto the open epics to bring them back."; Show all hid them again.
  - Moving it back to the open epics returned each in the state it had.
  - Closing it with one done and three open tasks archived the one and left the three unarchived and hidden; reopening returned the three as they were and the done one as Completed.
  - `doit list`, `list --epic`, `show` and `morning` from the worktree read the same.
  - Not checked: dragging by hand (the moves went through the move API) and the changed confirm text on Close epic. Both are on T-026.7.
- 2026-11-22, seen in that check and older than this epic: the epic page's header shows Close epic on a parked epic, where Design.md says only open epics have it (`web/epicView.js` tests `completed` only). For the close audit.
- 2026-11-22, Batch B (T-026.5 and .6) built by one `batch-builder` agent, development 420 of 420. Deviations: the note is rendered in `listBody`, `listPane` is exported for its test, and the note uses the existing `.note` class, so no CSS was added.
- 2026-11-22, Batch A (T-026.1 to .4) built by one `batch-builder` agent, development 418 of 418. Deviations:
  - A task without a task file, in an epic that is closed and reopened, comes back as Backlog and not as the state it showed before. It has no stored state: it takes the default for the epic's status, and a reopened epic is Planned.
  - The morning test does not ask for the To-do task back in Up next, since the report holds only the top three.
  - Tests that held the old rule were moved to the new one: `board.test.js` (T-016.1 of the parked fixture epic left two lists; close counts), `server.test.js`, `cli.test.js`, `morning.test.js`, `activity.test.js`, `worktree.test.js`.
  - T-026.2's new confirm text on Close epic is unchecked in play.
- 2026-11-22: built in the worktree `../doit-wt/026-hide-open-tasks-of-inactive-epics` on `epic/026-hide-open-tasks-of-inactive-epics`, beside EPIC-028, which is Active on main and still gets tasks from its Check in play.

## Close audit

Closed 2026-11-28. Main was merged into the branch first (`EPIC-026: merge main`): one conflict, in the Modules list of `Docs/Architecture.md`, resolved to main's side with the branch's three wordings put back; every `src/`, `web/` and `test/` file merged by itself. Development (504) and Audit (505) tests pass on the merged branch. Read: `git diff main...HEAD` before the merge, against `Architecture.md`, `Core/03-Design.md`, `App/README.md` and `Design.md`, section Epics, and every reader of board tasks that main gained since the branch was cut. No forbidden import, no event carries a live object, and nothing on main lists open tasks past the hiding rule: the server-side readers go through `Board.view` or `Board.list`, and what main added (the Games tab, the column picker, contact scale) reads no board tasks.

Fix now (T-026.8):

- `src/domain/taskLoader.js` (bug): a task whose file lies in `Archive/` is forced to archived after `makeTask` set `hidden` from the file's old state, so a parked epic's task moved there by hand read as archived and hidden, and `list --state archived` left it out. Fixed with a test.
- `web/epicMove.js`: the confirm of a drag to Completed or Archived still said every task is archived; the epic changed that sentence only in `web/epicView.js`. Corrected, with the comments above `EpicMoves.close` and `Board.closeEpic` and the list named `open` that held the done tasks.
- `Docs/Architecture.md`: `epicIsOpen` was not named, and the `taskEdit.js` line did not say that an edit sets `hidden` again. Added.

Fix before release (EPIC-022):

- `web/epicView.js` (bug, older than this epic and handed to this audit by the Notes): Close epic shows on a parked epic's page. T-022.36.
- `src/domain/task.js`, `src/domain/epicMoves.js`, `src/domain/board.js`: is-this-epic-open is written twice with two answers. T-022.37.
- `src/domain/board.js`, `web/state.js`, `web/projectPage.js`: leave-hidden-out is written four times. T-022.38.
- `web/projectPage.js`, `src/domain/docs.js`: a hidden task no longer blocks a designer's task, and a document's Linked tasks leave hidden tasks out. The design names neither. T-022.39, which needs Tabu's answer.

Deliberate, each already written down:

- The page, not `Board.view`, keeps hidden tasks out of the Open tab, the due badge and the waiting list, since `/api/board` sends them for the selected epic. Which tasks are hidden is decided in the domain. Written in the `server/server.js` line of `Architecture.md`; no Departures row.
- A task with no task file comes back as Backlog when its epic is reopened (Notes, Batch A).
- The sweep still archives a hidden task past its deadline (`Design.md`, section Epics, and the Departures row for `Board.view` and `Board.list`).
- `listPane` in `web/render.js` is exported only for its test (Notes, Batch B).

## For the standard

Nothing new. The rule this close leans on is already there: `Core/01-Tasks.md`, Branches, merge main into the branch at the start of each batch. This branch was 46 commits behind main at its close, which cost one doc conflict.
