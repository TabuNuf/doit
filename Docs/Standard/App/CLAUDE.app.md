## App

<!-- Appended below Core/CLAUDE.core.md. In the core part, set the stack line to: <web app | desktop app | service> in <language and framework>. -->

- Build: `<command>`. Test by category: Development `<command>`, Audit `<command>`, Performance `<command>`.
- Run locally: `<command>`, at `<url or port>`.
- Modules live in `<folder>/<module>/`, each with one public entry file; other modules import only that. The composition root is `<file>` (the framework's registration file where it has a container). No exported mutable state: clients, stores and caches are created in the root and passed in. Details in `<Docs>/Standard/App/README.md`, How the design rules apply.
- Epics are built on main. A worktree only for a second epic beside it, after <Designer>'s yes, and never two: `git worktree add ../<project>-wt/<nnn>-<short-name> -b epic/<nnn>-<short-name>` until the project has its own tool (`<Docs>/Standard/Core/01-Tasks.md`, Branches and Parallel work).
- `<Docs>/Standard/App/README.md` lists what this stack has not decided yet; a decision made here goes back into the standard.
