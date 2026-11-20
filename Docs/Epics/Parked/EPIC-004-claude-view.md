# EPIC-004: Claude view and morning run

Status: Parked
Goal: One page shows what Claude is working on, what it is blocked on, and what it did today; a scheduled morning run sweeps, plans and reports.
Design: not written yet. Wireframe: Docs/Design/wireframe.html, Claude view.

## Scope

- Decided: a Claude view beside the Board with three panes: Working on now, Blocked on you (with Up next for Claude below it), Activity log.
- Decided: everything on the page comes from task data and a log the CLI writes; no separate state.
- Proposed: Working on now lists AI tasks In progress; Up next lists AI To-do tasks in rank order.
- Proposed: Blocked on you lists human To-do tasks that an AI task waits on, marked by a `blocks: T-<id>` field on the human task.
- Proposed: every CLI command that changes a task appends one line to an activity log in the app's data folder (time, task, what changed); the log keeps 30 days.
- Proposed: the morning run is a scheduled Claude session at 07:00 on weekdays that sweeps, reads the open AI tasks, and writes a short report into the log.
- Proposed: clicking a card on the Claude view opens that task on the Board.

Open before planning: whether the morning run starts from a Claude Code schedule or a launchd job, and what the report must contain.

## Tasks

- [ ] T-004.1 Activity log: the CLI and server append one line per change, kept 30 days (done when: a test sets, comments and closes a task and reads three log lines; lines older than 30 days are dropped on write)
- [ ] T-004.2 A `blocks` field on tasks, settable from the CLI and the detail pane (done when: `doit set p/T-x blocks=T-y` round-trips through the task file; the detail pane shows it)
- [ ] T-004.3 Claude view: Working on now, Blocked on you, Up next and the activity log (done when: with fixtures, each pane lists the right tasks; clicking a card opens it on the Board)
- [ ] T-004.4 Morning run: the scheduled session and its prompt, which sweeps, plans and writes its report to the log (done when: one run started by hand writes a report line and changes nothing but task states it names)
- [ ] T-004.5 Views switcher in the top bar: Board and Claude, with a badge for Tabu's tasks due within 7 days (done when: switching views keeps the selected project; the badge count matches the Due within 7 days filter)

## Test plan

- Batch A: T-004.1 to .3 (store, domain, server, web): development
- Batch B: T-004.4 to .5 (launcher or schedule, web): development
- Performance: none

## Check in play

- T-004.3: with real data, the Claude view matches what the Board shows for AI tasks.
- T-004.4: the morning run's report is readable and its changes match the log.
- T-004.5: the badge count is right on a day with a deadline inside 7 days.

## Notes

Decisions and deviations, newest first.

## Close audit

## For the standard
