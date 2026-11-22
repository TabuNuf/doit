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
- [ ] T-026.5 The page keeps hidden tasks out of the Open tab, the due badge and the waiting list (done when: npm test passes with tests: GET /api/board returns a parked epic's open task with hidden true; visible() leaves it out with no epic selected and keeps it with its epic selected; dueSoonTasks() and waiting() leave it out)
- [ ] T-026.6 The list says why when the selected epic is parked, completed or archived (done when: npm test passes with a page test: the list pane shows the line for a selected parked epic that has a hidden task, with the epic id and the word parked, and shows no line for an open epic or with no epic selected)
- [ ] T-026.7 Check in play (done when: Every check in the description is confirmed in the running board, or its failure is a task in EPIC-026)

## Touches

Nothing that merges badly as text: source, tests and docs only. EPIC-028 changes `web/` and the store beside it, so main is merged into this branch at the start of Batch B.

## Test plan

- Batch A: T-026.1 to .4 (domain: task, board, epicMoves; cli): development
- Batch B: T-026.5 to .6 (server, web): development
- Performance: none
- Check in play: T-026.7

## Notes

Decisions and deviations, newest first.

- 2026-11-22, Batch A (T-026.1 to .4) built by one `batch-builder` agent, development 418 of 418. Deviations:
  - A task without a task file, in an epic that is closed and reopened, comes back as Backlog and not as the state it showed before. It has no stored state: it takes the default for the epic's status, and a reopened epic is Planned.
  - The morning test does not ask for the To-do task back in Up next, since the report holds only the top three.
  - Tests that held the old rule were moved to the new one: `board.test.js` (T-016.1 of the parked fixture epic left two lists; close counts), `server.test.js`, `cli.test.js`, `morning.test.js`, `activity.test.js`, `worktree.test.js`.
  - T-026.2's new confirm text on Close epic is unchecked in play.
- 2026-11-22: built in the worktree `../doit-wt/026-hide-open-tasks-of-inactive-epics` on `epic/026-hide-open-tasks-of-inactive-epics`, beside EPIC-028, which is Active on main and still gets tasks from its Check in play.

## Close audit

Filled when the epic closes.

## For the standard

Filled when the epic closes.
