# Architecture

Doit is built from modules wired in one composition root. The general rules are in `Docs/Standard/Core/03-Design.md`; this file holds this project's instance of them.

## Layers

| Tier | Modules | May reference | Never references |
|---|---|---|---|
| Domain | `src/domain/` | itself only | `node:fs`, `node:http`, the store, the CLI, the server |
| Adapters | `src/store/` | the domain, `node:fs`, `node:path`, `node:os` | the CLI, the server |
| Interface | `src/cli/`, `src/server/`, `web/` | the domain (the `Board` facade and its value types) | the store, each other; `web/` only talks HTTP |
| Composition root | `src/root.js`, `bin/` | everything | |

Module order, low to high: domain → store → cli, server → root.

## How the boundaries are enforced

`test/boundaries.test.js` reads every `import` in `src/` and `bin/` and fails when a module imports a tier it may not, per the table above.

## Modules

- `domain/task.js`: the task value, its states, sections and defaults for a task without a file. Pure.
- `domain/rules.js`: the sweep (deadline and retention archiving) and rank between neighbours (the only place ranks are computed; the page asks `Board.move`). Pure, takes today's date.
- `domain/mover.js`: `TaskMover`, where a task goes in the Open tab: from the task and its project's tasks it returns the rank and state change. Pure; `Board.move` delegates to it.
- `domain/board.js`: `Board`, the facade both interfaces use. Lists, filters, creates, updates, moves (via `TaskMover`), comments, sweeps, closes an epic's tasks and serves an epic's document. Given a `ProjectSource` (the store's port: `projects()`, `load(project)`, `save...`) and a clock.
- `store/markdown.js`: parses and writes epic files and task files. Pure text in and out.
- `store/projectFiles.js`: `ProjectFiles`, reads and writes one project's docs folder: epics, task files, archive moves, new epic, project scaffold.
- `store/settings.js`: `SettingsFile`, the project list and settings in the app's data folder.
- `store/source.js`: `FileSource`, the port implementation the board is given; joins the two above.
- `cli/cli.js`: `Cli`, parses arguments and prints. Given a `Board` and an output stream.
- `server/server.js`: `HttpServer`, the JSON API and the static page. Given a `Board` and the web folder.
- `web/`: the board page, plain HTML, CSS and JS as ES modules, none over 300 lines: `state.js` (page state, helpers, API calls), `render.js` (views), `epicView.js` (the epic document view), `markdown.js` (markdown to HTML, no packages), `ordering.js` (drag and keyboard moves), `resize.js` (column widths), `events.js` (listeners and the reload), `app.js` (wires them).
- `root.js`: builds the settings file, the source, the board, and hands the board to the CLI or the server.

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
    +closeEpic(project, epic)
    +epicDocument(project, epic)
  }
  class TaskMover { +plan(task, tasks, placement) changes }
  class FileSource { +projects() +addProject() +settings() +load(id) +writeTask() +addLine() +createEpic() +epicDocument() }
  class ProjectFiles
  class SettingsFile
  class Cli
  class HttpServer
  Board --> TaskMover
  Board --> FileSource : port
  FileSource --> ProjectFiles
  FileSource --> SettingsFile
  Cli --> Board
  HttpServer --> Board
```

## Departures

| Where | What | Why | Until |
|---|---|---|---|
| `Board.view`, `Board.list` | A read sweeps first: it archives tasks past their deadline or retention, which writes files | Archiving is by date and nothing else runs on a schedule; without it a read would show tasks that should be gone | EPIC-004's morning run sweeps on a schedule, if reads are then fast enough without it |

## Design hooks

| Hook | Why the later iteration needs it |
|---|---|
| Task `source` field (where a task came from) | The Marketing epic marks fetched events and Reddit threads |
| Board API is read from disk on every request | The morning run writes through the CLI while the page is open |
