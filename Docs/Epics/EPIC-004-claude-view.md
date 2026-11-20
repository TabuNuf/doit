# EPIC-004: Claude view and morning run

Status: Active
Goal: One page shows what Claude is working on, what it is blocked on, and what changed; a scheduled morning run sweeps and reports.
Design: Design.md, section Claude view. Wireframe: Docs/Design/wireframe.html, Claude view.

## Scope

- Decided: a Claude view beside Board and Docs with three panes: Working on now, Blocked on you (with Up next for Claude below it), Activity log.
- Decided: everything on the page comes from task data and the activity log; no separate state.
- Decided: Working on now lists AI tasks In progress; Up next lists AI To-do tasks in rank order.
- Decided: Blocked on you lists human To-do tasks with a `blocks: T-<id>` field naming the AI task they hold up.
- Decided: every change to a task, from the CLI or the page, appends one line to `activity.log` in the app's data folder (time, task, what changed); lines older than 30 days are dropped on write.
- Decided: the morning run is a Claude desktop app scheduled task, 07:00 on weekdays, running `doit morning`. It sweeps, then writes one report block across all projects: swept, In progress, top three Up next, Blocked on you, Tabu's tasks due within 7 days. It changes nothing beyond the sweep.
- Decided: clicking a card on the Claude view opens that task on the Board.

## Tasks

- [x] T-004.1 Activity log: the CLI and server append one line per change, kept 30 days (done when: a test sets, comments and closes a task and reads three log lines; lines older than 30 days are dropped on write)
- [x] T-004.2 A `blocks` field on tasks, settable from the CLI and the detail pane (done when: `doit set p/T-x blocks=T-y` round-trips through the task file; the detail pane shows it)
- [x] T-004.3 Claude view: Working on now, Blocked on you, Up next and the activity log (done when: with fixtures, each pane lists the right tasks; clicking a card opens it on the Board)
- [ ] T-004.4 Morning run: `doit morning` writes the five-part report to the log, and the scheduled task's prompt runs it (done when: a test with fixtures reads the report block with each part right and finds no task changed beyond the sweep; the schedule is created in the desktop app)
- [ ] T-004.5 Views switcher in the top bar: Board, Docs and Claude, with a badge for Tabu's tasks due within 7 days (done when: switching views keeps the selected project; the badge count matches the Due within 7 days filter on 🧑 tasks)

## Test plan

- Batch A: T-004.1 to .3 (store, domain, server, web): development
- Batch B: T-004.4 to .5 (cli, web): development
- Performance: none

## Check in play

- T-004.3: with real data, the Claude view matches what the Board shows for AI tasks.
- T-004.4: the first scheduled morning run's report is readable and its changes match the log.
- T-004.5: the badge count is right on a day with a deadline inside 7 days.

## Notes

Decisions and deviations, newest first.

- 2026-11-20, T-004.3: a card's last change is its newest log line, else its `updated` time. The log pane groups lines only for a block under a ref that is not a task (the morning report), so task lines stay strictly newest first. The Detail pane's Blocks input had its `pattern` lose its backslashes in the template literal; fixed in this commit. Checked in the running app on a scratch data folder: panes, log, card click, Blocks edit.
- 2026-11-20, T-004.2: `blocks` accepts `T-<n>.<n>` or empty (clears it); it is not checked against an existing task, so a typo shows on the Claude view as written.
- 2026-11-20, T-004.1: the Board is handed a `record(ref, what)` function by the root, so it logs every change without knowing the log. A drag logs "moved"; a save that changes nothing logs nothing. To stay under its 250-line guard, Board's helpers `matchesState`, `check` and `oneLine` moved to `task.js`.
- 2026-11-20: interviewed and planned. The morning run uses a desktop app schedule rather than launchd: no headless login or permissions to keep, and each run is a session Tabu can open; it fires only while the app is open. The report is read-only beyond the sweep so its changes are the swept list.

## Close audit

## For the standard
