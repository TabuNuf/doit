# Working

How any project is kept, tested and released, whatever its stack. The stack layer adds how each part is done there (Unity: `Unity/02-Project.md`).

## Repo and commits

The commit rules themselves are in `01-Tasks.md`, Commits.

- When the designer has uncommitted edits in a file a task must change (a config asset tuned in the editor), commit only the task's lines: build the file from `HEAD` plus the task's edit, `git hash-object -w` it and stage it with `git update-index --cacheinfo`, and make the same edit in the working copy. Never commit, stash or revert the designer's edits.
  Why: in Box Trainer the config asset held the designer's tuning mid-epic; committing the file would have published half-finished values, and leaving the task's values out would have shipped wrong defaults.
- A package or plugin upgrade is its own commit, never inside a task. Its `.meta` and manifest churn would hide the task's change.

## Versions and releases

- The version is `major.minor` in a `VERSION.txt` file at the repo root, mirrored by the release tool into wherever the stack keeps a version (in Unity, Player Settings' Version). Edit the file, never the mirror.
  Why: one plain file is readable by scripts, CI and people, and a stack's own version field is buried in its settings (Unity's in a YAML file).
- Work goes towards the next major. Every release before it is a minor release: 0.5, 0.6, 0.7. When the major is ready, a major release ships 1.0, and minor releases go on from 1.1.
- Stable branches are records, not places to work. A fix to a released version ships as the next minor from main.
- A release is cut from main in the main checkout with no epic branch half merged, and not while the conformance epic has open tasks unless `<Designer>` ships around it (`01-Tasks.md`, The conformance epic).
  Why: architecture drift found at each epic's close must be paid before players get the version, or "later" never comes.

How a release is built and shipped is the stack layer's (Unity: `Unity/02-Project.md`, Versions and releases).

## Tests

Testing comes in two kinds. **Development testing** keeps the iterations fast and only checks that everything still works. **Shipping testing** is thorough and may take as long as it needs. Each test category is named for when it runs, and each has a budget.

| Category | What runs | Budget | When |
|---|---|---|---|
| Task check | Build, read the errors, the tests of the code the task touched | Seconds | Every task |
| Development | Every rule and every guard, without starting the game or app | Under 2 minutes wall clock, about 60 s inside tests | End of each batch, and before any commit on main |
| Audit | Development, then whole-system tests (whole levels or flows, saves, end to end), then the architecture audit (`01-Tasks.md`, Closing an epic) | About 10 minutes of tests | When an epic closes |
| Performance | Measurements, long simulations, balance, and the frame-time or response-time check | Each test under 15 minutes | In the release and in away runs. A task that changes a measurement or its bar runs that measurement's tests only; an epic close runs the category only when the epic changed what it measures |
| Release | Every category, Behaviour (a learning system's behaviour), every build target built and checked | As long as it takes; it may collect data. No single run over 15 minutes | Prepare release |

Why: Bunny Bunker's sessions played the game in the editor for 5 to 15 minutes at a stretch, often, and held the editor so the designer could not play or try anything; judging its AI thoroughly by play would have taken about a month of play time. The names say when a test runs, which "light", "deep" and "slow" did not.

The stack layer names the test assembly or suite for each category and how each runs (Unity: `Unity/02-Project.md`, Tests).

- **No test and no play run lasts more than 15 minutes, in any category.** A check that would take longer is redesigned before it is written: run the simulation headless at full speed instead of in play, replay recorded inputs, shorten the scenario to the moment that matters, use fewer seeds, compare a state dump instead of screenshots, assert the mechanism instead of a behaviour bar. What still cannot fit goes to the designer's playtest.
  Why: a gameplay check that needs Claude to play for hours or weeks never finishes inside a working day, and it holds the editor the whole time.
- **Away runs.** When `<Designer>` says they are away and gives the time ("I'm out, you have 3 hours"), the run may test more: Audit at each batch's end instead of Development, Performance where the epic touches what it measures, and a Behaviour run if one is due, finished inside the time given. Only the designer's words start an away run; it ends when they are back or the time is up.
  Why: thorough tests cost nothing while nobody waits on them, and nobody else can tell whether someone is waiting.
- Guard tests keep Development inside its budget: in Box Trainer, any edit-mode test that trains more than 50 runs fails the build, and so does any Development test that takes longer than 1.5 s.
  Why: in Box Trainer the per-batch check grew from 52 s to 224 s in three weeks and the slow measurements ran in most batches, so one batch of three tasks waited 19 minutes on tests; 70 of 1711 fast tests took 147 of its 180 s.
- Rules that matter are guard tests, not prose. The stack layer lists its own (Unity: `ModuleRulesTests`, `UIStructureTests`, `NoColourLiteralsTests`, readable-text and token tests).
- A refactor's done-when is the Performance tests' logged numbers unchanged, plus a throwaway fingerprint test run before and after each task: a few seeded runs on several levels, hashing every frame's position and heading into one number. The fingerprint is not committed; it only has to match.
  Why: Box Trainer's nine-task brain refactor kept every number; the fingerprint checked each task in seconds, while the Performance tests take about five minutes.
- A test never asserts a tunable's current number from the config asset; it reads the number from the config, or builds its own rules with the number it needs. The designer tunes the asset on the Balancer at any time.
  Why: two tests broke in one round, one on a heal wind-up the designer had tuned from 18 to 5 ticks, one on a damage number a new full-charge multiplier changed.
- When a Performance test fails at an epic's close, run it on the branch the epic was cut from before treating a failure as the epic's: only a bar that passes there and fails on the branch is the epic's; the rest go to the designer as older failures.
  Why: Box Trainer's first Learning run in five days failed five bars at a close; four failed the same way, to the digit, on main, and only one came from the epic.
- **Removing one random draw shifts every seeded stream, so pick test seeds by scanning a range and write the pass rate beside the seed.** Run 30 or more seeds, choose one in a group that passes, and note "passes 14 of 17 seeds".
  Why: after one draw was removed, several seed-pinned tests flipped at once, and a fight scene passed only 4 of 17 seeds with nothing to say the pinned seed was a lucky one.

## Claude setup

What carries over so a new project's sessions start with the same habits:

- **`CLAUDE.md`** from `Core/CLAUDE.core.md` followed by the stack's template (`Unity/CLAUDE.unity.md`, `App/CLAUDE.app.md`), filled in.
- **Project skills** in `.claude/skills/`, tracked, from the stack's Starter (Unity: `playtest-video`). A workflow repeated three times becomes a skill.
- **Shared permissions** in `.claude/settings.json`, tracked: the read-only calls a build or test run makes, so it does not stop for approval (Unity's list: `Unity/02-Project.md`, Claude setup in Unity). Personal ones stay in `settings.local.json`.
- **The read guard and the build agent**: `.claude/settings.json` wires `Tools/Claude/read_guard.py` from `Core/Starter/`, and `.claude/agents/batch-builder.md` from the stack's Starter is the agent type every task handed to a sub-agent goes to (Session cost, below). A stack without one yet writes it from `Unity/Starter/.claude/agents/batch-builder.md`, with that stack's build tools.
- **Memory is per machine and per project.** Notes that hold for any project belong in this standard instead, where git keeps them. When a memory note turns out to be general, move its rule here and shorten the note to a pointer.
- **Working agreements** (from Box Trainer, each in `01-Tasks.md`): build a whole epic in one go and stop only for the designer's decisions; one question at a time with a recommendation; commit and push per task during unattended runs; stage explicit paths only.

## Session cost

A session's cost is its turns times its context: every tool call re-sends the whole conversation. Reading files is a small share.
Why: a week of logs (2026-11) showed file reads at about 0.5% of the tokens; the average turn re-sent 145K, 88K of it fixed at the start.

- Few turns: send independent tool calls in one message; read a source file under about 30 KB whole, once, never in slices. Large documents are read by section, after a `grep -n` of their headings.
  Why: each extra call costs about as much as 60 KB of new text.
- One task or one batch per session. A session running an epic coordinates: it holds the brief and the reports, plans and closes, and hands each task or batch to the build agent. A new session for the next epic or for unrelated work.
  Why: context grows with every turn, so a long session pays for its own history again on each call.
- Builds go to the `batch-builder` agent type (the stack's `Starter/.claude/agents/`): the cheaper model, only the tools a build needs, a brief that names the files and sections to read.
  Why: measured over four days after the switch, a sub-agent's first turn fell from 66K to 18K and a typical sub-agent session from 5.5M to 2.6M tokens. A general sub-agent loads every tool and connector schema before it starts.
- The read guard hook refuses a whole read of a text file over 40 KB, by `Read` or `cat`, and names the way out; it skips Claude's own saved output and scratchpad.
  Why: a large file read whole rides along in every later turn. Refusing Claude's saved output only cost a turn, since that file is already a cut.
- Keep the fixed start small: rarely needed rules move out of `CLAUDE.md` into files read on demand (releases, the bridge setup), deny rules keep generated folders out, and unused connectors are switched off.
  Why: the first turn's context is paid on every turn of the session. The main session's share fell from 88K to 82K, and a typical main session from 6.3M to 5.0M tokens: smaller than the sub-agent gain, since main sessions stayed long.
- Measure before and after a change to these rules with `Tools/Claude/usage_by_context.py` (from `Core/Starter/`): first-turn context, turns per session, tokens per session, main and sub-agents apart.
  Why: the first guess (thin reads) was wrong, and only the session logs showed it.
