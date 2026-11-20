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

Split this layer (into `Web/`, `Mac/` and so on) only when two kinds of app need rules that contradict each other.
