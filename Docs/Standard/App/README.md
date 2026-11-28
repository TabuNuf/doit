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

## Lists with column headers

- **A list with column headers uses one shared column picker, never its own.** A right click on the header row, or a corner button in it, opens a dropdown with a checkbox per column; the first column cannot be hidden; the choice is kept per list in the browser; every column shows until changed; the grid template is built from the shown columns, so rows and header drop the same cells.
  Why: each list that grew its own picker would differ in where it opens and what it keeps, and the first column is what tells rows apart.

## Versions

- The version source is the ecosystem's package file (`package.json`, `pyproject.toml`, `Cargo.toml`), in its own format, usually three parts. No `VERSION.txt` beside it. Minor releases lead to the next major as `Core/02-Working.md`, Versions and releases, says; the third number is for a release that only fixes.
  Why: the ecosystem's build and publish tools read the version from the package file, so a second file would be the drift the Core rule is there to stop.

## Styling

- **Every colour in a stylesheet is a token, defined for light and for dark; a test fails on a literal colour outside the token blocks.** Component rules use `var(--name)` only, and a script that sets colours picks from the same tokens.
  Why: a literal colour in a component rule looks right in the theme it was written in and wrong in the other, and nothing fails. Doit's restyle found seven such literals, among them the bug and task dots and the white text on warnings; a 30-line test reading the stylesheet now catches the next one.
- **The light and dark blocks redefine roles, never the palette** (`Core/03-Design.md`, Interface). The palette is defined once; each theme block points the roles at it.
  Why: two themes are the second tier's first use, and a theme block that wrote literals would be the one-tier file again.

## Pages over local files

- **An API that reads or writes files by a path from the page checks the path twice:** a pure check in the domain (relative, no `..` segment, no hidden name, no backslash, the one allowed extension), then the adapter resolves it, follows links, and refuses anything that lands outside the folder. Tests send `../x`, an absolute path, a hidden folder and a wrong extension, through the API.
  Why: the page is the user's, but a path is still text from a request; the string check alone misses a link out of the folder, and the resolve check alone gives poor messages.
- **A page over files that other tools change (a CLI, an agent, git) is told of changes, not polling for them.** The server watches the folders with a recursive `fs.watch`, debounces bursts into one message, and sends it as a server-sent event (`text/event-stream`, built in, no packages); the page's `EventSource` reloads, and the server sends one message on connect so a page that lost the server catches up when it reconnects. The folder list is rebuilt when the settings change and on a slow rescan, since a new folder makes no event in a watched one.
  Why: a 10-second poll that skipped whenever any control had focus left the page stale until a manual refresh, which the designer took for no live update at all; the event version shows a change within a second.
- **A reload is held only while it would destroy something: typing in a text field, a drag, an open menu or form.** A focused select, checkbox or button does not hold it. A held reload is one pending flag, run when the hold ends.
  Why: a select keeps focus after a choice until the next click elsewhere, so holding on any focused control held every reload after a filter change.
- **A page that reloads on its own never redraws an open edit box.** The draft lives in page state on every keystroke, and the reload skips the view while it is editing.
  Why: a reload that rebuilds the view throws away what was typed since the last save, and nothing fails in a test.
- **Data that is personal, shared across projects or queried by filters lives in one SQLite file in the app's data folder, through the runtime's built-in driver (`node:sqlite`), not in a project's git.** Only the store tier may import it (the boundary test's table says so), the schema carries a version (`PRAGMA user_version`) from the first table, and the file is opened on first use, so a command that never touches it creates nothing.
  Why: contact lists are personal data that must stay out of every repo and are read as filtered slices; the built-in driver keeps the app free of packages, and a version from day one makes the first migration a step instead of a guess.
- **A local server checks every write request: the Host header must be the loopback name, and an `Origin` header, when sent, must equal `http://<host>`.** Reads stay open. Tests send a foreign Origin and a foreign Host.
  Why: binding to 127.0.0.1 does not stop another site's page in the same browser from posting to it; once a route sent mail, one cross-site form could have sent a draft nobody approved.
- **A store client for a network protocol (SMTP, IMAP, any socket) takes its `connect` function as an argument.** Tests pass one that opens a plain socket to a scripted server on 127.0.0.1 and check the exact dialogue; nothing in the Development run reaches the real service.
  Why: a fake at the protocol level tests the parser and the error paths a mocked method would skip, with no account and no network.
- **A hand check against made-up data sets the data-folder override once for the whole shell or script, never as a prefix on each command.**
  Why: one command typed without the prefix opened the real data folder and created a database there; the next migration would have run on the designer's data.
- **Performance tests sit in their own folder with their own script** (`test/performance/`, `npm run test:performance`), so the Development run never includes them.
  Why: a measurement with a bar (a 500-file tree read under 200 ms) belongs to the Performance category, which runs only when a task changes what it measures.

## Page interaction

- **A page that dispatches clicks on `data-` attribute names gives each meaning its own name, and a test fails when two views' click handlers read the same one.**
  Why: a section header's fold attribute had the same name as another view's, whose handler runs first; the click did nothing, and unit tests that called the toggle directly passed.

- **A drop target that opens on hover opens only after the dragged item rests on it (about half a second), and a reload waits during any drag.**
  Why: a folded header that opened as a drag passed over it pushed the next target down, so the drop landed on nothing; a reload mid-drag redraws the page and ends the drag.

- **A scripted check of a page sets a select by assigning its value and dispatching a bubbling `change` event.** A browser tool's form fill can set the value without the event, and the page then looks as if its filter does nothing.
  Why: an epic's reach filter looked broken in the in-app check; the same choice with a dispatched `change` filtered correctly.

## Sign-in

- A session records how it began (a password, a mailed code, a platform ticket). A page guarded by the stronger way refuses a session begun by a weaker one, as it refuses a user without the right mark.
  Why: adding sign-in by a mailed code for players would otherwise open the admin page to anyone who reads an admin's mailbox.
- A code a person types (a sign-in code, a claim code) is kept only as its hash, works once, expires, and its rate limit counts every try before the code is checked, the right one included.
  Why: counting only wrong tries needs the check first, and a limit that runs after the check is one more guess for free.

## What the first app project decides

Each item becomes a rule here, with its why, or a line in that project's `Deviations.md`:

1. **How the design rules are enforced.** `Core/03-Design.md` is enforced in Unity by asmdefs and a guard test. An app needs its own for the rules above: import boundaries in the linter or a test that reads the imports, a check for exported mutable state, and where the composition root lives.
2. **The test categories as suites.** Which runner, and what Development, Audit and Performance are called and run (`Core/02-Working.md`, Tests).
3. **The worktree tool.** `git worktree add` may be enough; an app with local servers or ports may need a script like `Unity/Starter/Tools/Worktree/worktree.py`.
4. **The build agent's commands.** `Starter/.claude/agents/batch-builder.md` has placeholders for the build and the test of one file or suite; what the first project fills in, and any tool the agent turns out to need, comes back here.
5. **Release and deploy.** How a version is built, checked and shipped (`Core/02-Working.md`, Versions and releases, holds the version rules and the marketing update every release makes, which holds here before this item is decided).
6. **Where the gallery lives** (`Core/03-Design.md`, Interface): a page of the app that shows every component in each state, and the test that holds it to the component list.
7. **The rest of a Starter.** It holds only the build agent today; code and config the next app should copy on day one go beside it.

## Decided so far

From the first app project. Items 3 and 5 above are still open.

- **Boundaries (item 1):** one folder per tier under `src/`, and a Development test that reads every `import` and fails on a tier the architecture's table forbids, `node:` built-ins included (a pure domain may import none).
  Why: a test needs no linter set-up, runs in milliseconds, and its own test proves it catches a forbidden import.
  The test sees tiers, not facades: an interface that imports a domain helper past its facade passes it, so the close audit reads interface imports by eye.
  Why: a CLI called an import mapper directly instead of the facade's import, and only the audit found it.
- **Test categories (item 2):** the runtime's own test runner, no packages. Development is the unit and API tests; Audit adds a folder of whole-flow tests that start the real entry points (the CLI and the server) as processes.
  Why: with no dependencies the Development run took under half a second, and the whole-flow test is the one that proves two entry points share the same files.
- **Build agent (item 4):** `batch-builder` with Read, Edit, Write, Bash, Grep and Glob only, on the cheaper model, told the test command and never to start the server in the foreground.
  Why: an app has no editor bridge, so the agent needs no MCP tools.
- **Local apps the designer starts (item 6, Starter candidate):** no terminal. A stay-open AppleScript applet, built by a script that writes the project path into it, runs a start script: fast-forward pull when the tree is clean, start the server in the background, print its pid; the applet opens the page, stops the server on quit, and only opens the page when a server already answers.
  Why: the designer asked for a double-click start; the same applet worked unchanged across two local tools apart from names, port and paths.
- **List calls in an API:** every list pages with the same parameters (an offset, a limit capped by one page-size setting, and the total in the answer), checked by one class every list handler uses.
  Why: a client learns one scheme; a client's request for a second scheme (a cursor and a "more" flag) for a list of a few rows was answered with the existing one, and the check moved out of the first list's query class so both lists refuse a bad value the same way.
- **Data that grows with every play:** a collection a client writes to on every play (replays, runs, attempts) declares a cap per group of field values, applied in the same write: the oldest visible rows past the cap are deleted outright, the row just written is never one of them, and hidden rows are left for a person to judge. A plan with such a cap has a task that fills the table to its expected size and records the timings and the query plan of a list and a write.
  Why: a sort on read with a limit still reads and sorts every matching row when the index lacks the scope columns; a cap keeps each group to a few rows, one write removes one or two, no daily job has to catch up, and measured at 60 000 rows both calls stayed under 30 ms on the existing index.
- **A new kind of entry in an API answer:** it goes in a new key beside the existing list, never into that list with a marker that tells the two apart.
  Why: a released client that ignores the marker reads the new entries with the old meaning; a game asked for its player's replies inside the admin's `answers` with a `from` key, and old builds would have shown the player's words as the admin's, a change of meaning that needs a new API version.

Split this layer (into `Web/`, `Mac/` and so on) only when two kinds of app need rules that contradict each other.
