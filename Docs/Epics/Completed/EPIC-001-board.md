# EPIC-001: Board

Status: Done
Goal: Tabu opens Doit from the Dock and runs a project's epics, tasks and bugs on it, while Claude reads and changes the same tasks through the CLI.
Design: Design.md, sections Projects, Epics, Tasks, The CLI, Running it

## Tasks

- [x] T-001.1 Task model, states, defaults and the sweep rules (done when: domain tests cover defaults, deadline archiving and retention archiving)
- [x] T-001.2 Epic and task file parsing and writing (done when: a round-trip test keeps an epic file byte for byte when nothing changed)
- [x] T-001.3 Project files, settings file and the file source (done when: tests on a temp project create, read, archive and restore a task)
- [x] T-001.4 Board facade (done when: tests list, filter, add, update, comment and sweep through it)
- [x] T-001.5 doit CLI (done when: every command in Design.md runs against a temp project in tests)
- [x] T-001.6 Boundary guard test (done when: an import from store into cli fails the test)
- [x] T-001.7 HTTP API and static page server (done when: an API test reads and changes a task over HTTP)
- [x] T-001.8 Board page (done when: projects, epics, Open/Completed/Archive, drag, filters, detail with comments, + Project, + Epic and + Task work in the browser)
- [x] T-001.9 Doit.app launcher (done when: double-clicking starts the server and opens the page; quitting stops it)

## Test plan

- Batch A: T-001.1 to .3 (domain, store): development
- Batch B: T-001.4 to .6 (domain, cli, boundaries): development
- Batch C: T-001.7 to .9 (server, web, launcher): development, then the page checked by hand
- Performance: none

## Check in play

- T-001.8: drag rows between Active and Backlog, reopen a completed task, add a comment.
- T-001.9: start and quit Doit.app.

## Notes

Decisions and deviations, newest first.

- 2026-11-20: Tabu checked the page and the launcher by hand: both work.

- 2026-11-20: Built in the main checkout with no commits, not on an `epic/001-board` branch with a commit per task: the repo had no first commit to branch from, and the adoption commit waits for Tabu to see the file list.
- 2026-11-20: Doit registered itself as its first project, so this epic's tasks are tracked in Doit (`Docs/Epics/Tasks/`). The game pilot is still Tabu's choice.
- 2026-11-20: Existing epic files are read in place; a task file is written only when a task changes. This settles the brief's open question (read in place, or import once).
- 2026-11-20: The page was checked in the browser pane by script: state pill, comments, description save on blur, font size, epic filter, drag within Active, into Backlog and back to the top. Not checked by hand yet.

## Close audit

- Fix now: `Docs/Architecture.md` class diagram listed FileSource methods that do not exist; fixed in the close commit.
- Fix before release: `web/app.js` is 375 lines, past the 300-line rule (`Core/03-Design.md`); EPIC-005, T-005.1.
- Fix before release: the rank-between helper is written twice (`src/domain/rules.js` and `web/app.js`); EPIC-005, T-005.2.
- Fix before release: closing an epic leaves its task files in `Epics/Tasks/`, read on every load; moved by hand this time; EPIC-005, T-005.3.
- Deliberate: a read sweeps (archives by date), so reads write files, against "a read changes nothing". Added to Architecture.md, Departures, for Tabu to confirm.

## For the standard

- `App/README.md`, new section Decided so far: answers to items 1, 2, 4 and 6 (boundary test, test runner and categories, batch-builder, launcher applet). `CHANGELOG.md` line added. Not yet pushed to ClaudeStandards.
