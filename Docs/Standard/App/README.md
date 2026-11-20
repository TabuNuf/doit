# App layer

The stack layer for every project that is not a Unity game: web applications, desktop and mobile apps, services, tools. It sits on `Core/`, which holds the process, the test categories and the design rules; this folder holds only what is specific to building apps.

It starts almost empty on purpose. A rule enters the standard from a project that taught it, with its why, and no app project has fed it yet. The first one fills it the same way Box Trainer filled `Unity/`.

| File | Covers |
|---|---|
| `CLAUDE.app.md` | The app part of a project's `CLAUDE.md`, appended below `Core/CLAUDE.core.md` |
| `Templates/Design.md` | The product design doc: what the app is now, the source of truth |
| `Templates/Architecture.md` | The app's modules, their order, the composition root, the boundaries |
| `Starter/.claude/agents/batch-builder.md` | The build agent: a task or batch from a brief, on the cheaper model; fill `<Project>`, the source folder and the build and test commands |

## How the design rules apply

`Core/03-Design.md` is written for classes wired by hand. An app's framework often has its own way, and the aims stay the same: dependencies visible in one place, and a feature removable as one module.
Why: three Core rules read literally would fight most app frameworks. Decided by `<Designer>`, 2026-11-20, before any app project; the first one checks each line against what it meets.

- **A framework with its own container (Angular, NestJS, ASP.NET, Spring) keeps it, and its registration is the composition root.** Every binding sits in the module or registration file `Architecture.md` names; nothing is registered from inside a feature's own code at run time, and nothing is looked up by name or type outside a constructor.
  Why: the container is how the framework builds everything, and one registration file still shows the whole graph.
- **In a function-based framework (React and its kind), the module carries the design, not the class.** A feature is a folder with one public entry file; other features import only that file; state and the functions that change it live together in the module; shared behaviour comes from composing functions and hooks, never from a base component.
  Why: the framework has no classes to own data, and its import graph is where coupling shows.
- **Module-level mutable state that other files import is a mutable static.** A client, a store or a cache created at import time (`export const db = ...`) is created in the composition root and passed in, or provided through the framework's own mechanism (a provider, the container). Constants and pure functions are exported freely (`Core/03-Design.md`, Which statics are allowed).
  Why: every module in JavaScript and Python is a singleton, so the ban would mean nothing there without this line, and an imported global cannot be swapped in a test or removed with its feature.

## Versions

- The version source is the ecosystem's package file (`package.json`, `pyproject.toml`, `Cargo.toml`), in its own format, usually three parts. No `VERSION.txt` beside it. Minor releases lead to the next major as `Core/02-Working.md`, Versions and releases, says; the third number is for a release that only fixes.
  Why: the ecosystem's build and publish tools read the version from the package file, so a second file would be the drift the Core rule is there to stop.

## What the first app project decides

Each item becomes a rule here, with its why, or a line in that project's `Deviations.md`:

1. **How the design rules are enforced.** `Core/03-Design.md` is enforced in Unity by asmdefs and a guard test. An app needs its own for the rules above: import boundaries in the linter or a test that reads the imports, a check for exported mutable state, and where the composition root lives.
2. **The test categories as suites.** Which runner, and what Development, Audit and Performance are called and run (`Core/02-Working.md`, Tests).
3. **The worktree tool.** `git worktree add` may be enough; an app with local servers or ports may need a script like `Unity/Starter/Tools/Worktree/worktree.py`.
4. **The build agent's commands.** `Starter/.claude/agents/batch-builder.md` has placeholders for the build and the test of one file or suite; what the first project fills in, and any tool the agent turns out to need, comes back here.
5. **Release and deploy.** How a version is built, checked and shipped (`Core/02-Working.md`, Versions and releases, holds the version rules).
6. **The rest of a Starter.** It holds only the build agent today; code and config the next app should copy on day one go beside it.

## Decided so far

From the first app project. Items 3 and 5 above are still open.

- **Boundaries (item 1):** one folder per tier under `src/`, and a Development test that reads every `import` and fails on a tier the architecture's table forbids, `node:` built-ins included (a pure domain may import none).
  Why: a test needs no linter set-up, runs in milliseconds, and its own test proves it catches a forbidden import.
- **Test categories (item 2):** the runtime's own test runner, no packages. Development is the unit and API tests; Audit adds a folder of whole-flow tests that start the real entry points (the CLI and the server) as processes.
  Why: with no dependencies the Development run took under half a second, and the whole-flow test is the one that proves two entry points share the same files.
- **Build agent (item 4):** `batch-builder` with Read, Edit, Write, Bash, Grep and Glob only, on the cheaper model, told the test command and never to start the server in the foreground.
  Why: an app has no editor bridge, so the agent needs no MCP tools.
- **Local apps the designer starts (item 6, Starter candidate):** no terminal. A stay-open AppleScript applet, built by a script that writes the project path into it, runs a start script: fast-forward pull when the tree is clean, start the server in the background, print its pid; the applet opens the page, stops the server on quit, and only opens the page when a server already answers.
  Why: the designer asked for a double-click start; the same applet worked unchanged across two local tools apart from names, port and paths.

## Decided so far

From the first app project. Items 3 and 5 above are still open.

- **Boundaries (item 1):** one folder per tier under `src/`, and a Development test that reads every `import` and fails on a tier the architecture's table forbids, `node:` built-ins included (a pure domain may import none).
  Why: a test needs no linter set-up, runs in milliseconds, and its own test proves it catches a forbidden import.
- **Test categories (item 2):** the runtime's own test runner, no packages. Development is the unit and API tests; Audit adds a folder of whole-flow tests that start the real entry points (the CLI and the server) as processes.
  Why: with no dependencies the Development run took under half a second, and the whole-flow test is the one that proves two entry points share the same files.
- **Build agent (item 4):** `batch-builder` with Read, Edit, Write, Bash, Grep and Glob only, on the cheaper model, told the test command and never to start the server in the foreground.
  Why: an app has no editor bridge, so the agent needs no MCP tools.
- **Local apps the designer starts (item 6, Starter candidate):** no terminal. A stay-open AppleScript applet, built by a script that writes the project path into it, runs a start script: fast-forward pull when the tree is clean, start the server in the background, print its pid; the applet opens the page, stops the server on quit, and only opens the page when a server already answers.
  Why: the designer asked for a double-click start; the same applet worked unchanged across two local tools apart from names, port and paths.

Split this layer (into `Web/`, `Mac/` and so on) only when two kinds of app need rules that contradict each other.
