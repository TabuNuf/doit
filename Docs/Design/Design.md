# Doit: Design

2026-11-20 · Tabu

What the app is now. The source of truth for what gets built. When code and this document disagree, one of them changes in the same commit and the Changelog says which.

## Purpose

One local board where Tabu and Claude share every project's epics, tasks and bugs, so Jira and Confluence can be cancelled. Claude reaches it through a CLI that returns only the slice it asks for. Left out for now: the Docs view, the Marketing view (events, Reddit, influencers), the Claude view and the morning run; each is a later epic. The wireframe for all of them is `Docs/Design/wireframe.html`.

## Users and their jobs

- **Tabu** opens the board to see what to do next, what Claude is doing, and to rank, add, comment on and close work. Done for them: the next thing to do is at the top of Active, and Claude's work is one click away.
- **Claude** asks the CLI for open tasks in one project or epic, works the AI tasks top to bottom, comments on progress and closes them. Done for Claude: it never reads more than the slice it needs, and never reads the archive.

## Projects

- A project is a folder with a docs folder inside (`Docs/` by default; a game keeps its own, such as `ClobberBopDocs/`). The project list lives in the app's settings, not in any project.
- **+ Project** asks for a name, a folder and the docs folder name. It creates `<docs>/Epics/` with `Tasks/`, `Parked/` and `Completed/` where missing, and a rolling bug epic `EPIC-001: Bugs (rolling)` when the project has no epics yet. It never overwrites an existing file.
- The top bar lists every project plus **All projects**. In All projects each row shows a project pill.

## Epics

- Epic files follow `Docs/Standard/Core/01-Tasks.md`: `<docs>/Epics/EPIC-<nnn>-<short-name>.md`, status `Parked | Planned | Active | Done`, a `## Tasks` checklist.
- The left pane lists the project's epics from `Epics/` and `Epics/Parked/` with done/total counts and a progress bar.
- **Clicking an epic** filters the task list to its tasks and shows its document in the Detail pane: goal and status, tasks (checklist), test plan, notes, close audit and standard section. It works for any epic in the list, parked ones too. The markdown is shown with headings, lists, checkboxes, bold and code; nothing in it is editable. Selecting a task shows the task in the Detail pane, and clicking the epic again brings its document back. Clicking the epic while its document shows, or **Show all**, clears the filter.
- Epics in `Epics/Completed/` are not shown and not read, except by an explicit archive request.
- **+ New epic** creates the next number with the standard template, status `Planned`.

## Tasks

- A task is a line in its epic's checklist, `- [ ] T-<nnn>.<n> <title> (done when: <check>)`, plus an optional task file `<docs>/Epics/Tasks/T-<nnn>.<n>.md` holding its fields, description and comments. A task without a file uses defaults:
  - state: unticked in an `Active` epic is To-do; unticked in a `Planned` or `Parked` epic is Backlog; ticked is Archived (it was finished before Doit existed);
  - owner: AI; type: Bug when the epic's name contains "bug", else Task;
  - rank: the epic number times 1000 plus the task number.
- Fields: state, owner (`ai` or `human`), type (`task` or `bug`), rank, deadline (optional date), created, updated, completed (timestamps).
- States: To-do, In progress, Backlog, Completed, Archived.
- **Open tab:** one column in two sections. Active (To-do and In progress) on top, ranked; Backlog below. A pill on each Active row shows To-do or In progress; clicking it switches. Rows are reordered and moved between sections only by dragging the dotted handle (Alt + arrow keys from the keyboard).
- **Completed tab:** completed tasks, newest first, each with Reopen. A completed task moves to Archived after **14 days** (setting, 1 to 90).
- **Archive tab:** archived tasks, each with Restore. Claude never reads the archive.
- A task whose deadline passes before it is completed is archived at once.
- Ticking: Completed and Archived-after-completion tasks are ticked `[x]` in the epic file; the others are unticked.
- Archiving moves the task file to `<docs>/Archive/Tasks/`; restoring moves it back.
- Row, left to right: drag handle, rank (Active only), a red dot for a bug or a blue dot for a task, number, title, then on the right: state pill, due date, project pill (All projects), 🧑 or 🤖.
- Search filters by number or text. **All / 🧑 Mine / 🤖 Claude's** filters by owner. The funnel filters by type (tasks, bugs) and due date (any, due within 7 days, has one, has none).
- **+ Task** creates a task in a chosen epic with title, type and owner, at the bottom of Active.
- **Detail pane:** number, epic, title, type, owner, project; state, owner and deadline editable; created and updated times; the description (editable); done when; comments with author and time, and a box to add one. Text size A− / A+, 12 to 22 px, starting at 15.
- The board reloads from disk every 10 seconds, so changes Claude makes through the CLI show without a refresh.

## The CLI

`node bin/doit.js <command>`. Every command sweeps first (deadline and retention archiving). Output is one line per task, or JSON with `--json`.

- `projects`, `project add <name> <folder> [--docs Docs]`
- `list [--project <id>] [--epic EPIC-<nnn>] [--state open|active|backlog|done|archived] [--owner ai|human]`: default open tasks of every project, never archived ones unless asked.
- `show <project>/<T-id>`, `add <project> <EPIC-nnn> <title> [--owner] [--type] [--done-when] [--deadline] [--state]`, `set <project>/<T-id> key=value ...`, `comment <project>/<T-id> <text> [--as human]`, `epic add <project> <name>`, `epic close <project> <EPIC-nnn>` (moves the epic's task files to the archive), `sweep`.

## Running it

`launcher/Doit.app` (built by `launcher/build.sh`) is a stay-open applet: double-click starts the server and opens `http://localhost:4317`; quitting it stops the server. If a server is already running, it only opens the page. No terminal is needed.

## Data

- The project list and settings: `~/Library/Application Support/Doit/settings.json` (`DOIT_HOME` overrides it). Kept until deleted.
- Tasks and epics: Markdown in each project's docs folder, tracked by that project's git. Nothing leaves the machine. No personal data beyond names Tabu types.

## Changelog

- 2026-11-20, EPIC-001: first version, from the interview (`Brief.md`) and the wireframe.
- 2026-11-20, EPIC-005: clicking an epic opens a read-only view of its document; the task filter moves to a Filter button on each epic. `epic close` is added to the CLI.
- 2026-11-20: clicking an epic both filters the list and shows the epic's document in the Detail pane; the separate Filter button and the full-width epic view are gone.
