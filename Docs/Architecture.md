# Architecture

Doit is built from modules wired in one composition root. The general rules are in `Docs/Standard/Core/03-Design.md`; this file holds this project's instance of them.

## Layers

| Tier | Modules | May reference | Never references |
|---|---|---|---|
| Domain | `src/domain/` | itself only | `node:fs`, `node:http`, the store, the CLI, the server |
| Adapters | `src/store/` | the domain, `node:fs`, `node:path`, `node:os`, `node:child_process` (git, for who last changed a document), `node:sqlite` (only here: `marketing.db`) | the CLI, the server |
| Interface | `src/cli/`, `src/server/`, `web/` | the domain (the `Board`, `DocsLibrary`, `ClaudeView` and `ContactBook` facades and their value types) | the store, each other; `web/` only talks HTTP |
| Composition root | `src/root.js`, `bin/` | everything | |

Module order, low to high: domain → store → cli, server → root.

## How the boundaries are enforced

`test/boundaries.test.js` reads every `import` in `src/` and `bin/` and fails when a module imports a tier it may not, per the table above.

## Modules

- `domain/task.js`: the task value, its states, sections and defaults for a task without a file. Pure.
- `domain/rules.js`: the sweep (deadline and retention archiving), whether a closed epic is archived (`epicArchived`) and rank between neighbours (the only place ranks are computed; the page asks `Board.move`). Pure, takes today's date.
- `domain/mover.js`: `TaskMover`, where a task goes in the Open tab: from the task and its project's tasks it returns the rank and state change. Pure; `Board.move` delegates to it.
- `domain/activity.js`: `ActivityLog`, the activity log: one line per task change (`YYYY-MM-DD HH:MM  <project/T-id>  <what>`), newest first for reading, lines past 30 days dropped on write; `describeChanges` puts a task update in words. Over an activity-file port. Pure.
- `domain/epicMoves.js`: `EpicMoves`, closes an epic and moves it between open, parked, completed and archived; `planEpicMove` is pure (epic and tasks in, plan out, or a refusal). `Board.closeEpic` and `Board.moveEpic` delegate to it. A reopen restores the tasks archived with reason `Epic <id> closed`.
- `domain/board.js`: `Board`, the facade both interfaces use. Lists, filters, creates, updates, moves (via `TaskMover`), comments, sweeps, closes an epic (archives its tasks, then the source sets it Done, writes `Closed: <date>` and files it in `Completed/`), returns the closed epics in `view` as `closedEpics` (each with `closed` and `archived`, an `Archived:` line counting) and parked ones as `parkedEpics`, next to the open `epics` (the CLI's `epics` lists open then parked) and serves an epic's document. Given a `ProjectSource` (the store's port: `projects()`, `load(project)`, `save...`) a clock and a `record(ref, what)` function from the root that it tells every change it writes (the root points it at the `ActivityLog`, so the CLI and the page are logged alike).
- `store/markdown.js`: parses and writes epic files and task files. Pure text in and out.
- `store/projectFiles.js`: `ProjectFiles`, reads and writes one project's docs folder: epics, task files, archive moves, new epic, move to Completed, project scaffold.
- `store/activityFile.js`: `ActivityFile`, `activity.log` in the app's data folder: read its lines, append, or replace them all.
- `store/settings.js`: `SettingsFile`, the project list and settings in the app's data folder.
- `store/worktrees.js`: `EpicWorktrees`, finds the worktrees on `epic/<nnn>-…` branches by reading `.git/worktrees`, no git process.
- `store/changeWatcher.js`: `ChangeWatcher`, watches the data folder, each project's docs folder and each epic worktree's docs folder with `fs.watch`, debounces bursts (300 ms) into one call to its subscribers and rebuilds its folder list when the settings file changes and every 5 s (a new worktree makes no event in a watched folder). Over `SettingsFile` and `EpicWorktrees`; only the root builds it.
- `store/source.js`: `FileSource`, the port implementation the board is given; joins the settings file and each project's files, and reads and writes an epic's file and task files in its worktree when `EpicWorktrees` finds one.
- `domain/claude.js`: `ClaudeView`, the Claude view's facade: from the board's tasks and the activity log, the panes Working on now, Blocked on you (human To-do tasks with `blocks`) and Up next, each card with its last logged change; `morning()` sweeps and writes the morning report (`morningReport`, pure) to the log as one block. The pane filters (`workingOn`, `blockedOnYou`, `upNext`, `dueSoon`) are pure functions. Given the `Board` and the `ActivityLog`.
- `domain/docs.js`: `DocsLibrary`, the docs facade: tree, read, save and the tasks linked to a document, over a `DocsSource` port and the `Board`; `checkDocPath` keeps paths inside the docs folder (`.md` only, no `..`, no hidden names). Pure.
- `store/docsFolder.js`: `DocsFiles`, the `DocsSource` port on disk: the docs tree (leaving out `Archive/`, `Epics/Tasks/`, `Standard/`, folding `Epics/Completed/`), read, write, and the last change from `git log`.
- `domain/contacts.js`: the `Contact` value and its vocabulary (types, reach bands A to E with their follower floors, statuses, channel kinds, touch kinds), validation that refuses an unknown value, and the filters (`contactFilter`: type, game fit, status, reach `C+`, due by date). Pure.
- `domain/contactBook.js`: `ContactBook`, the contacts facade: list with filters, get, add, update, set fit, add touch, and the profiles. Over a `ContactSource` port (`all()`, `get(id)`, `insert(contact)`, `update(id, contact)`, `setFit(id, game, reason)`, `addTouch(id, touch)`) and a `ProfileShelf` port (`list()`, `has(game)`), with a clock for "due". A fit to a game with no profile is refused.
- `domain/contactImport.js`: the sheet import, pure: `parseCsv` (quotes, commas and newlines in quoted fields), `mapStreamers` (header aliases, BB1 and BB2 ignored, reach letter or follower count to a band, links to channels, Replied and Posted Video to touches). `ContactBook.import(rows)` matches by email, then YouTube link, and returns `{added, updated, skipped}`.
- `store/sqliteContacts.js`: `SqliteContacts`, the `ContactSource` port on `marketing.db` in the data folder (`node:sqlite`): tables contacts, channels, fit, touches; `PRAGMA user_version` is 1 and the file is opened and the schema created on first use, so a command that never reads contacts leaves no file.
- `store/profileShelf.js`: `ProfileShelf`, the profile port: reads `<docs folder>/Profiles/*.md` of the marketing project (settings key `marketingProject`, default `polyspice-marketing`, resolved through `SettingsFile`), creates a profile from a template.
- `cli/cli.js`: `Cli`, parses arguments and prints. Given a `Board`, output streams, the `ClaudeView` (for `morning`), the `ContactBook` and `readText(path)` (a file reader the root supplies, since the CLI tier has no `node:fs`); the contact commands go to `ContactsCli`.
- `cli/contactsCli.js`: `ContactsCli`, the contact commands (`contacts`, `contact`, `fit`, `touch`, `profiles`), over the `ContactBook`.
- `server/server.js`: `HttpServer`, the JSON API (including `GET /api/version`, the start commit) and the static page. Given a `Board`, the web folder, the commit, the `DocsLibrary` (the `/api/docs/` routes) and the `ClaudeView` (`GET /api/claude`), and `GET /api/events`, a server-sent event stream that sends `changed` on connect and on every event of the optional `changes` port (`subscribe(listener)` returning an unsubscribe; the root passes the `ChangeWatcher`); `close()` ends the open streams first and closes the port, since the server is its only user. `bin/server.js` reads the commit with `git rev-parse HEAD`.
- `launcher/`: `Doit.applescript` (the app), `start-server.sh`, `check-server.sh` (running server on the checked-out commit? exit 0, 1 none, 3 other), `stop-server.sh`, and `morning-run.md` (the desktop app scheduled task's prompt for `doit morning`; created by hand).
- `web/`: the board page, plain HTML, CSS and JS as ES modules, none over 300 lines: `state.js` (page state, helpers, API calls), `render.js` (views), `epicView.js` (the epic document view and its Close epic button), `epicList.js` (the left pane's epic buttons and the Closed and Archived sections), `docsView.js` (the Docs view: tree, document, linked tasks), `claudeView.js` (the Claude view: its three panes; a card opens the task on the Board), `markdown.js` (markdown to HTML, no packages), `ordering.js` (drag and keyboard moves), `resize.js` (column widths), `events.js` (listeners and live updates: an `EventSource` on `/api/events` reloads the page, held while the user types, drags or has a menu or form open), `app.js` (wires them).
- `root.js`: `makeContacts` builds the contact book over `SqliteContacts` and `ProfileShelf` (handed to the CLI, with a file reader); builds the change watcher (server only), the activity log and points the board's `record` at it, the Claude view over both, the settings file, the worktree finder, the source, the board, the docs files and library, and hands the board to the CLI or the server.

## Class diagram

```mermaid
classDiagram
  class Board {
    +list(filter) Task[]
    +get(ref) Task
    +addTask(...)
    +update(ref, changes)
    +move(ref, placement)
    +comment(ref, who, text)
    +addEpic(project, name)
    +addProject(...)
    +sweep()
    +sweepTasks() refs
    +closeEpic(project, epic, archived)
    +moveEpic(project, epic, to)
    +epicDocument(project, epic)
  }
  class ClaudeView { +panes(project) +morning() }
  class ActivityLog { +record(entries) +recent(project, limit) }
  class ActivityFile { +lines() +append(lines) +replace(lines) }
  class DocsLibrary { +tree(project) +read(project, path) +save(project, path, text) +linked(project, path) }
  class DocsFiles { +tree(id) +read(id, path) +write(id, path, text) +lastChange(id, path) }
  class ContactBook { +list(filter) +get(id) +add(input) +update(id, changes) +setFit(id, game, reason) +addTouch(id, touch) +profiles() +import(rows) }
  class ContactsCli { +contacts() }
  class SqliteContacts { +all() +get(id) +insert(c) +update(id, c) +setFit() +addTouch() }
  class ProfileShelf { +list() +has(game) +create(game, name) }
  class TaskMover { +plan(task, tasks, placement) changes }
  class EpicMoves { +close() +move(project, epic, to) }
  class FileSource { +projects() +addProject() +settings() +load(id) +writeTask() +addLine() +createEpic() +completeEpic() +parkEpic() +reopenEpic() +setEpicArchived() +closedEpics() +epicDocument() }
  class ProjectFiles
  class SettingsFile
  class EpicWorktrees { +find(folder) }
  class ChangeWatcher { +subscribe(listener) +close() }
  class Cli
  class HttpServer { +commit }
  Board --> TaskMover
  Board --> EpicMoves
  EpicMoves --> FileSource : port
  Board ..> ActivityLog : record fn from root
  ActivityLog --> ActivityFile : port
  Board --> FileSource : port
  FileSource --> ProjectFiles
  FileSource --> SettingsFile
  FileSource --> EpicWorktrees
  ContactBook --> SqliteContacts : port
  ContactBook --> ProfileShelf : port
  ProfileShelf --> SettingsFile
  Cli --> Board
  Cli --> ClaudeView
  Cli --> ContactsCli
  ContactsCli --> ContactBook
  HttpServer --> Board
  HttpServer --> DocsLibrary
  HttpServer --> ClaudeView
  HttpServer ..> ChangeWatcher : changes port
  ChangeWatcher --> SettingsFile
  ChangeWatcher --> EpicWorktrees
  ClaudeView --> Board
  ClaudeView --> ActivityLog
  DocsLibrary --> Board
  DocsLibrary --> DocsFiles : port
  DocsFiles --> SettingsFile
```

## Departures

| Where | What | Why | Until |
|---|---|---|---|
| `Board.view`, `Board.list` | A read sweeps first: it archives tasks past their deadline or retention, which writes files | Archiving is by date; the morning run (EPIC-004) sweeps only on weekdays while the desktop app is open, so a read still has to | A sweep that runs whenever the Mac is on |

## Design hooks

| Hook | Why the later iteration needs it |
|---|---|
| Task `source` field (where a task came from) | The Marketing epic marks fetched events and Reddit threads |
| Board API is read from disk on every request | The morning run writes through the CLI while the page is open; the page learns of it from `/api/events` and reloads |
