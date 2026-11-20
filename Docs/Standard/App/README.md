# App layer

The stack layer for every project that is not a Unity game: web applications, desktop and mobile apps, services, tools. It sits on `Core/`, which holds the process, the test categories and the design rules; this folder holds only what is specific to building apps.

It starts almost empty on purpose. A rule enters the standard from a project that taught it, with its why, and no app project has fed it yet. The first one fills it the same way Box Trainer filled `Unity/`.

| File | Covers |
|---|---|
| `CLAUDE.app.md` | The app part of a project's `CLAUDE.md`, appended below `Core/CLAUDE.core.md` |
| `Templates/Design.md` | The product design doc: what the app is now, the source of truth |
| `Templates/Architecture.md` | The app's modules, their order, the composition root, the boundaries |

## What the first app project decides

Each item becomes a rule here, with its why, or a line in that project's `Deviations.md`:

1. **How the design rules are enforced.** `Core/03-Design.md` is enforced in Unity by asmdefs and a guard test. An app needs its own: import boundaries in the linter or a test that reads the imports, one folder per module, and where the composition root lives.
2. **The test categories as suites.** Which runner, and what Development, Audit and Performance are called and run (`Core/02-Working.md`, Tests).
3. **The worktree tool.** `git worktree add` may be enough; an app with local servers or ports may need a script like `Unity/Starter/Tools/Worktree/worktree.py`.
4. **The build agent.** A `batch-builder` agent with the app's build and test commands, written from `Unity/Starter/.claude/agents/batch-builder.md`.
5. **Release and deploy.** How a version is built, checked and shipped (`Core/02-Working.md`, Versions and releases, holds the version rules).
6. **A Starter.** The files the next app copies on day one, once there are any worth copying.

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
