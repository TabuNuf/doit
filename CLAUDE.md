# Doit

A local task and documentation board shared by Tabu and Claude, replacing Jira and Confluence. Desktop app in Node.js (no dependencies) with a plain HTML/JS page, started from a macOS launcher.

## Read before any work

A turn costs more than a file: every tool call re-sends the whole conversation. Send independent calls in one message, read a source file under about 30 KB whole and once, read large documents by section, and keep one task or batch per session; builds go to the `batch-builder` agent. A hook refuses a whole read over 40 KB. Details in `Docs/Standard/Core/02-Working.md`, Session cost.

- `Docs/Design/Design.md`: what we build now. Source of truth.
- `Docs/Architecture.md`: module rules, folder structure, class diagram, the boundaries.
- `Docs/Epics/`: the work queue, shown on the Doit board. Process in `Docs/Standard/Core/01-Tasks.md`.
- Tasks only through the board's CLI: `node bin/doit.js help` (project id `doit`). Never read task files, the epic checklist or the archive directly (`Core/01-Tasks.md`, The board).
- `Docs/Epics/Parked/`: not scheduled. Never plan or build from it until Tabu asks.
- `Docs/Standard/Core/03-Design.md`: how code is shaped: objects, modules, low coupling, which patterns to use and when. Read before adding a class.
- `Docs/Standard/Core/02-Working.md`: commits, versions, test categories, Claude setup.
- `Docs/Design/Brief.md`: the interview that started the project. Context only; Design.md wins.

## Workflow

1. Design input: update the design doc and its Changelog.
2. Plan: an epic with small tasks, each with "done when", and a Test plan in batches of 3 to 5. When it goes `Active`, first `python3 ../../Unity/ClaudeStandards/Tools/sync_standard.py update Docs/Standard` on main and commit any pull as `Standard: pull <short commit>`; then build it on main in the main checkout, with no branch or worktree. One epic is active at a time. A second runs beside it only on Tabu's yes, in a worktree (below), with a Touches list that overlaps the first's in nothing (`Docs/Standard/Core/01-Tasks.md`, Branches and Epic rules).
3. Before coding a task: update the class diagram, check it against `Core/03-Design.md` and the boundaries in `Architecture.md`.
4. One task at a time: builds with zero errors, committed as `T-<epic>.<n>: <summary>` on main (on the epic's branch when it runs in a worktree). Never `git push` unless Tabu asks for that push; fetch and `git pull --ff-only` are fine. End a turn that left unpushed commits with the branches and the push commands.
5. Tests by category (`Docs/Standard/Core/02-Working.md`, Tests): Development at each batch's end, under 2 minutes, without starting the app; Audit at an epic's close; every category in the release. No test or play run over 15 minutes. More only in an away run the designer starts.
6. Close a task: `doit set doit/T-<nnn>.<n> state=done`, note deviations. Close the epic (`Docs/Standard/Core/01-Tasks.md`, Closing an epic): the Audit tests, the architecture audit, fix-now findings fixed, `doit epic close`, committed. An epic in a worktree merges main in first and ends with a `--no-ff` merge to main from the main checkout. Tabu pushes main.
7. Update the standard: before an epic is `Done`, move anything the next project would need into `Docs/Standard/`, add a line to its `CHANGELOG.md`, and fill the epic's "For the standard" section.

## The standard is living

`Docs/Standard/` is carried from project to project and must leave this one better than it arrived. Besides epic close, update it when a mistake costs time a second time, when a review ends, when a rule proves wrong, and after a framework or package upgrade. Test for what goes in: would the next project need it with a different design? If it would hold outside this stack too, it goes in `Core/`; otherwise in the stack's folder. Write it without this project's names, with its reason on the next line. Rules in `Docs/Standard/README.md`, Keeping it current.

## Design rules

- Object-oriented, in modules with one job each. A feature is a module; removing it removes the module and one line in the composition root.
- One composition root creates every module and passes in its dependencies. No singletons (`static Instance`), no service locator.
- Dependencies go one way, in the order written in `Architecture.md`. The rules know nothing of the engine, framework, interface or storage.
- Modules at the same level never reference each other; they talk through events that carry facts.
- A class past about 300 lines or with two reasons to change is split first.
- Comments state intent, one or two lines.

## App

- Build: none (plain Node ES modules). Test by category: Development `npm test`, Audit `npm run test:audit`, Performance: none yet.
- Run locally: `npm start`, at `http://localhost:4317`. Tabu starts it with `launcher/Doit.app` (build it with `launcher/build.sh`).
- Modules live in `src/<module>/`; the composition root is `src/root.js`. Module order and boundaries in `Docs/Architecture.md`.
- Epics are built on main. A worktree only for a second epic beside it, after Tabu's yes, and never two: `git worktree add ../doit-wt/<nnn>-<short-name> -b epic/<nnn>-<short-name>` until the project has its own tool (`Docs/Standard/Core/01-Tasks.md`, Branches and Parallel work).
- `Docs/Standard/App/README.md` lists what this stack has not decided yet; a decision made here goes back into the standard.

## Using Doit as Claude (any project)

Claude reads and changes tasks only through the CLI, never by reading epic or task files directly: `node /Users/tabu/Repos/doit/bin/doit.js help`. Archived tasks are never read unless Tabu asks.
