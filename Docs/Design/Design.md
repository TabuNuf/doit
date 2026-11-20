# Doit: Design

2026-11-20 · Tabu

What the app is now. The source of truth for what gets built. When code and this document disagree, one of them changes in the same commit and the Changelog says which.

## Purpose

One local board where Tabu and Claude share every project's epics, tasks and bugs, so Jira and Confluence can be cancelled. Claude reaches it through a CLI that returns only the slice it asks for. Left out for now: the Confluence import, the Marketing view (events, Reddit, influencers), the Claude view and the morning run; each is a later epic. The wireframe for all of them is `Docs/Design/wireframe.html`.

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
- **An epic with a worktree** on its branch `epic/<nnn>-<short-name>` has its epic file and task files read and written in that worktree, by the page and the CLI alike, so a tick made during the epic lands on its branch and the main checkout stays clean. When the worktree is removed, they are read from the project folder again.
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
- **Column widths:** dragging the gap between two columns resizes them; the middle column takes what is left. Double-click a gap to reset it. Focused, a gap moves 20 px with the arrow keys. Widths are kept per browser. Below 1100 px wide the layout stacks and the gaps do not drag.
- The board reloads from disk every 10 seconds, so changes Claude makes through the CLI show without a refresh.

## Docs

Each project's docs folder (design, specs, architecture) is read and edited in place in a Docs view beside the Board. Doit keeps no copy. Claude edits docs as files, as it does today; the view is for Tabu.

- **Board / Docs** in the top bar switches the view. The Docs view shows the selected project; in All projects it shows the first project and says so.
- Three panes: **Documents** (the folder tree), the **document**, and **Linked**.
- **The tree** lists the Markdown files of the docs folder, folders first, by name. `Archive/`, `Epics/Tasks/` and `Standard/` are left out. `Epics/Completed/` is listed but folded until clicked.
- **The document** is rendered with the epic view's renderer plus tables. Above it: its path and who changed it last, from git (author and date of the last commit that touched it; "not committed" when none).
- **Edit** swaps the rendered page for a plain text box with the file's text; **Done** writes the file and shows it rendered again. Text size A− / A+ applies, as in the Detail pane.
- **Linked** lists the project's open tasks whose description or done-when names the document's file name (`Design.md`); clicking one opens it on the Board.
- Paths are always inside the docs folder: a path with `..`, an absolute path, or one into a hidden folder is refused. Only `.md` files are read or written.
- Docs are read and written in the project folder, not in an epic's worktree.
- Pictures in a document are not shown yet; the Confluence import epic (EPIC-009) brings them.

## Look

Blueprint: the board reads as a drafting sheet. It replaces the greyscale wireframe look; there is one style, no picker. Light and dark follow the system setting.

- **Colour.** Light: pale blue sheet (`#e6eef8`), near-white panes, navy ink (`#0f2a4a`), one technical blue for selection and lines (`#0b61d6`). Dark: navy sheet (`#0b2545`), deeper navy panes, pale blue ink, sky blue accent (`#7cc4ff`). Warning orange and success green stay semantic, apart from the accent.
- **Type.** IBM Plex Sans for text, IBM Plex Mono for numbers, ids, dates and labels.
- **Sheet.** A faint 20 px grid behind the panes, in the accent at about 8 % opacity.
- **Corners.** Panes, buttons, chips and pills have 2 px corners. Things that float or pass (popups, empty states, cards, forms, the error toast) keep 6 px corners, and the count badge is round, so they read as apart from the sheet.
- **Panes.** Outlined in the accent. Pane headers in mono capitals, accent coloured, with a small square bullet, over a dashed rule.
- **Rows and selection.** Rows divided by dashed rules, square corners. The selected row or epic gets an accent outline on a light accent fill. The active tab is underlined in the accent.
- **Progress.** Epic bars are segmented like a scale rule, filled in the accent.
- **Detail.** The field block has a dashed outline instead of a grey fill.
- **Logo.** A checkmark in a circle over a drafting frame, cyan with orange crop marks. The board shows the transparent mark (`web/logo.svg`) before the name in the top bar and as the tab icon; the launcher uses the navy icon (`launcher/icon.svg`), which `launcher/build.sh` turns into the app icon. The logo keeps its own colours and is not themed.
- Every colour comes from a token defined for light and dark; no literal colour in a component rule.

The comparison of the five candidate styles, with this one as "Blueprint", is the private artifact `Doit Style Options` (claude.ai/artifact/L8qjksrvdhpyhEDjTd4unB).

## The CLI

`node bin/doit.js <command>`. Every command sweeps first (deadline and retention archiving). Output is one line per task, or JSON with `--json`.

- `projects`, `project add <name> <folder> [--docs Docs]`
- `list [--project <id>] [--epic EPIC-<nnn>] [--state open|active|backlog|done|archived] [--owner ai|human]`: default open tasks of every project, never archived ones unless asked.
- `show <project>/<T-id>`, `add <project> <EPIC-nnn> <title> [--owner] [--type] [--done-when] [--deadline] [--state]`, `set <project>/<T-id> key=value ...`, `comment <project>/<T-id> <text> [--as human]`, `epic add <project> <name>`, `epic close <project> <EPIC-nnn>` (archives the epic's task files, sets it Done and moves it to Completed/), `sweep`.

## Running it

`launcher/Doit.app` (built by `launcher/build.sh`) is a stay-open applet: double-click starts the server and opens `http://localhost:4317`; quitting it stops the server. If a server is already running on the checked-out commit, it only opens the page; one on another commit (`GET /api/version`) is stopped and the current code started. No terminal is needed.

## Data

- The project list and settings: `~/Library/Application Support/Doit/settings.json` (`DOIT_HOME` overrides it). Kept until deleted.
- Tasks and epics: Markdown in each project's docs folder, tracked by that project's git. Nothing leaves the machine. No personal data beyond names Tabu types.

## Changelog

- 2026-11-20, EPIC-001: first version, from the interview (`Brief.md`) and the wireframe.
- 2026-11-20, EPIC-005: clicking an epic opens a read-only view of its document; the task filter moves to a Filter button on each epic. `epic close` is added to the CLI.
- 2026-11-20: clicking an epic both filters the list and shows the epic's document in the Detail pane; the separate Filter button and the full-width epic view are gone.
- 2026-11-20: the three columns are resized by dragging the gaps between them.
- 2026-11-20, EPIC-008: the Blueprint look replaces the greyscale wireframe look (section Look), chosen from five candidate styles.
- 2026-11-20: the Doit logo, in the top bar, as the tab icon and as the launcher icon (section Look).
- 2026-11-20, EPIC-007: an epic with a worktree has its files read and written there (section Epics).
- 2026-11-20, EPIC-003: the Docs view: tree, rendered document with edit, and Linked tasks (section Docs). The Confluence import moves to EPIC-009.
