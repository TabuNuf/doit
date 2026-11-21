# Project standard

How a project is built with Claude at Polyspice, taken from the projects that taught it. The source is this folder in the ClaudeStandards repo; each project keeps its own copy at `<Docs>/Standard/` and syncs it both ways with `Tools/sync_standard.py` (Syncing, below).

## Layers

The standard is a core that every project follows, and one stack layer on top of it. A project's copy holds `Core/` and its own stack's folder, never another stack's.

| Layer | For | Holds |
|---|---|---|
| `Core/` | Every project | How work moves, how code is shaped, testing, versions, Claude setup |
| `Unity/` | Unity games | UI Toolkit, asmdefs, the Unity MCP bridge, builds, releases, the Starter and Netplay kits |
| `App/` | Everything else: web, desktop and mobile apps, services, tools | Nearly empty until the first app project fills it; `App/README.md` lists what that project decides |

Which layer a project uses is its profile (`profile: unity` or `profile: app` in `Subscription.txt`). The `claude-standards` skill (`Skills/claude-standards/`, linked into `~/.claude/skills/`) reads it from the project: a project with `ProjectSettings/ProjectVersion.txt` is Unity, any other is an app, and an empty folder is asked about.

| File | Covers |
|---|---|
| `Core/01-Tasks.md` | How work moves: design doc, epics, tasks, batches, commits, playtests |
| `Core/02-Working.md` | Repo and commits, versions, test categories and budgets, Claude setup and session cost |
| `Core/03-Design.md` | How code is shaped: objects, modules, low coupling, the composition root, which patterns to use and when, the boundaries |
| `Core/CLAUDE.core.md` | The first part of a project's `CLAUDE.md`; the stack's template is appended below it |
| `Core/Templates/` | A project's `Deviations.md`, and the `Marketing/` profile and pitch |
| `Core/Starter/` | Files every project copies: the read guard, the open-work list, the `.claude/settings.json` that wires both, and the usage script |
| `Unity/01-UI.md` | How UI Toolkit is set up: documents, components, styles, state, examples, guard tests |
| `Unity/02-Project.md` | The rest of a Unity game: file structure, new project checklist, repo setup, releases, naming, asmdefs, config, Unity tests, saves, Unity MCP pitfalls |
| `Unity/CLAUDE.unity.md` | The Unity part of a game's `CLAUDE.md` |
| `Unity/Templates/` | Skeletons for `GameDesign.md`, `Architecture.md`, `Playtest.md`, `StyleGuide.md`, `UIRules.md`, and the bridge prompt |
| `Unity/Starter/` | The code and files to copy: EventBus, UI helpers, guard tests, build and structure tools, playtest skill, git files. See `Unity/Starter/README.md` |
| `Unity/Netplay/` | An optional rollback kit for online play, with its tests on a toy simulation. See `Unity/Netplay/README.md` |
| `App/` | `README.md`, `CLAUDE.app.md`, templates for `Design.md` and `Architecture.md`, and a Starter with the build agent |
| `CHANGELOG.md` | Every change to the standard, per version and per project it came from |

In a game's copy, three more files belong to the game and are never overwritten by a sync:

| File | Covers |
|---|---|
| `BASE.txt` | The ClaudeStandards commit the copy was last synced from |
| `Deviations.md` | The rules this game does not follow, each with its reason |
| `Subscription.txt` | Whether the game pulls the standard by itself at each epic's start (`auto-pull: on` or `off`), where ClaudeStandards is checked out (`central:`, relative to the game's repo root), and its stack layer (`profile: unity` or `app`; missing means `unity`, since every project before the layers was a Unity game) |

## Placeholders

- `<Game>`: the root namespace and assembly prefix (`BoxTrainer`). In `Core/` it stands for any project.
- `<Docs>/`: the docs folder at the repo root, `Docs/` in every project. A project that still has its own name (`BB-Docs/`) renames it when no work is in progress in it.
  Why: one name lets every file, tool and the Doit board point at `Docs/` the same way. Obsidian no longer needs each vault's folder named apart.
- `<doit>`: the Doit board's repo, `~/Repos/doit` on the designer's machine. Its CLI is `node <doit>/bin/doit.js`.
- `<doit-id>`: the project's id on the board, as `doit projects` lists it (`box-trainer`).
- `<Designer>`: the person who owns design decisions and edits the UI in UI Builder.
- `<Builder>`: whoever writes the code (Claude, or a programmer).

## Where it came from

The standard started from Box Trainer on 2026-10-18; ClobberBop copied it the same day, and the two copies were merged into ClaudeStandards on 2026-10-30. On 2026-11-20 it split into `Core/` and the `Unity/` and `App/` layers, so projects that are not Unity games can follow it too. Each rule was added after something went wrong in one of the games. The reason is kept next to the rule, so a later reader can tell when one no longer applies. A rule without a reason is a candidate for deletion.

## Adopting it

**A new project:** in the project's folder, ask Claude to use the Claude standards. The `claude-standards` skill picks the profile, then does what follows. By hand, from the ClaudeStandards root:

1. Run `python3 Tools/sync_standard.py adopt <project>/<Docs>/Standard [unity|app]`. It copies `Core/` and the profile's folder, writes `BASE.txt`, a blank `Deviations.md` and a `Subscription.txt` with the profile. Without a profile it reads one from the project, and stops when the folder says nothing.
2. Register the project on the board: `node <doit>/bin/doit.js project add <Name> <project> --docs <Docs>` (`Core/01-Tasks.md`, The board). It makes `Epics/` with `Tasks/`, `Parked/` and `Completed/`, and the rolling bug epic as `EPIC-001` when there are no epics yet.
3. Write `CLAUDE.md` at the repo root from `Core/CLAUDE.core.md` with the stack's template (`Unity/CLAUDE.unity.md` or `App/CLAUDE.app.md`) appended, filled in.
4. A Unity game: work through `Unity/02-Project.md`, New project checklist. It copies `Unity/Starter/` into place and sets up the scene. An app: work through `App/README.md`, What the first app project decides, as far as day one needs.
5. Copy `Core/Starter/` into place (a Unity game takes `.claude/settings.json` from `Unity/Starter/` instead; an app also copies `App/Starter/` and fills the build agent's commands), fill the stack's `Templates/` into the project's own docs, and write the first epic before the first feature.
6. A Unity game keeps the guard tests from `Unity/Starter/` passing from the first commit. Retrofitting them later cost Box Trainer an epic each. A Unity game also works through "Missing in Box Trainer" at the end of `Unity/02-Project.md`: each item is either built in the first epics or moved into `Deviations.md`, with the reason.

**A game already under way** (its own folders, Assembly-CSharp, its own rules files):

1. Adopt the copy as above, register it on the board, and add the standard's pointers to its existing `CLAUDE.md` rather than replacing it.
2. Take `Core/01-Tasks.md`, `Core/02-Working.md` and, in Unity, the MCP setup at once; they need no code change.
3. Apply `Core/03-Design.md`, `Unity/01-UI.md` and the module rules of `Unity/02-Project.md` to new code only.
4. Write each rule the game will not follow into `Deviations.md` with its reason. An old rules file of the game (a `UI_RULES.md`) is read for what the standard lacks, which is pushed up, and what stays the game's own goes into its docs.

## Keeping it current

The standard is a living document. Every game that uses it feeds it, and every game pulls what the others learned. Nothing learned in a game should exist only in that game's docs if another game would need it too.

### When the standard is checked

- **When an epic closes.** Its Notes and deviations are read for anything general. The epic's "For the standard" section (template in `01-Tasks.md`) records what was moved over, or "nothing".
- **When something costs time twice.** A mistake, a pitfall or a workaround that came up a second time becomes a rule.
- **When a review ends.** Its recurrence rule goes into the standard as well as the project's `Architecture.md`, if it is not specific to this game.
- **When a rule turns out wrong.** It is changed or deleted, with the reason. A rule that was ignored for a whole epic without harm is a candidate for deletion.
- **When Unity or a package changes version.** Anything marked "measured in" is checked again.

### What goes in, and where

The test is: **would another game need this, with a different design?**

- Yes: it goes in the standard, written without this game's names (use the placeholders). Then a second question picks the layer: would it hold outside this stack too? Yes, `Core/`; no, the stack's folder. A rule with a general half and a stack half goes in both, the stack's pointing at Core's.
  Why: a rule left in a stack's folder never reaches the other stacks, and a stack's detail in `Core/` is noise to every other one.
- No: it stays in the project's own docs (`Architecture.md`, `UIRules.md`, `Playtest.md`).
- Both: the general rule goes in the standard, the game's instance of it in the project docs, and the project doc points at the standard.
- A standard rule this game will not follow: a line in its `Deviations.md`, never an edit to the rule in its copy.
  Why: an edit to the rule would be pushed to every game; a deviation stays with the one game.

Every new rule has a **why** on the line after it: what went wrong without it, or what it costs. A rule without a reason cannot be judged later, so it does not go in.

### How a change is made

1. In the game's copy, edit the right file, in `Core/` or the stack's folder.
2. Add a line to `CHANGELOG.md` under the open version: date, project, file, what changed and why.
3. Commit it in the game with the task that taught it, or alone as `Standard: <summary>`.
4. Push it to ClaudeStandards when the epic closes (Syncing, below).

### Syncing

Both directions merge per file against the commit in `BASE.txt`, so edits made on both sides since then are kept. Run from the ClaudeStandards root:

```bash
python3 Tools/sync_standard.py status <game>/<Docs>/Standard
```

- **Push** (game to ClaudeStandards) when an epic closes: `push` writes the game's changes since its base into ClaudeStandards, uncommitted. Read the diff, resolve any conflict markers, commit it as `<Game> EPIC-<n>: <summary>`, then pull in the game.
- **Pull** (ClaudeStandards to game) at the start of an epic, and after a push: `pull` merges what other games pushed into the copy and moves `BASE.txt` forward. Read the diff, resolve any conflict markers, commit it in the game as `Standard: pull <short commit>`.
- **Update** is the pull a game runs by itself when an epic is set `Active` (`01-Tasks.md`, The flow, step 2), from its main checkout: `python3 <central>/Tools/sync_standard.py update <Docs>/Standard`, with `<central>` from `Subscription.txt`. It does nothing when the copy is subscribed off or `BASE.txt` already names the last commit that changed the standard; otherwise it lists the commits it brings and pulls. It refuses, exit code 1, when the copy has uncommitted edits, since the pull commit would sweep them up. `pull` and `adopt` write a subscribed `Subscription.txt` when a game has none; a game turns it off by setting `auto-pull: off`.
  Why: games pulled only when someone remembered, so an epic was planned and built on rules other games had already changed.
- A conflict is written with markers into the file and listed by the script; nothing is committed by it in either repo.
- Push before pull when both have changes, so the game's lines reach the central changelog under its own date.
- Every command works on `README.md`, `CHANGELOG.md`, `Core/` and the profile's folder only. A Unity game's push never removes `App/` files, and a pull never brings them.
- **A copy from before the layers** (`03-Project.md` at its top) is moved into the layered paths by the first `pull` or `update`, which then merges as usual: `01-Tasks.md` to `Core/`, `02-UI.md` to `Unity/01-UI.md`, `03-Project.md` to `Unity/02-Project.md`, `CLAUDE.template.md` to `Unity/CLAUDE.unity.md`, `Templates/Deviations.md` to `Core/Templates/`, the other templates, `Starter/` and `Netplay/` under `Unity/`. Rules that moved from `03-Project.md` into `Core/` arrive as removed there and added in Core; a local edit to one of them is a conflict to resolve by hand. `push` and `status` refuse such a copy until it has pulled, so a copy with unpushed edits pulls first, this once, against the rule above: each conflict keeps the game's lines in the new file, and the next push carries them up, where they are sorted into `Core/` or the stack's folder.
  Why: the merge matches files by path, so without the move every file would look removed on one side and added on the other.
- **The same first pull points the game's own files at the new paths**: every tracked text file outside the copy (`CLAUDE.md`, `Architecture.md`, open epics, tools, code comments) that names an old file of the standard is rewritten and listed, and a reference to a section that moved to `Core/` (Session cost, Claude setup, Design hooks) follows it there. Epics in `Completed/` are records and stay as written. Read the list and commit it with the pull.
  Why: all five games' `CLAUDE.md` named `03-Project.md` or `02-UI.md`, so after the move every session would have been sent to a file that no longer exists.

### Versions

The open version collects changes from every game. A version closes, with its date, when the designer decides it is a set worth naming (before a new game starts is a good moment): read its changelog for anything that turned out game-specific, check that no file names a game's classes, folders or people outside "Where it came from" and the changelog, close it in `CHANGELOG.md`, open the next, and tag the commit `v<n>` in ClaudeStandards.
