# How tasks are done

Work exists only in the epic queue. A design idea, a playtest finding or a review result that is not in an epic file gets lost between sessions.

## The documents

| File | Job | Who changes it |
|---|---|---|
| `<Docs>/Design/GameDesign.md` | What the game is now. Source of truth for what gets built. Ends with a Changelog. | Updated first whenever design input arrives |
| `<Docs>/Design/<Later>.md` | Ideas for a later iteration. Context only, never built from. | `<Designer>` |
| `<Docs>/Architecture.md` | Module rules, folder structure, class diagram, "Keeping the boundaries" | Before coding any task that adds or changes a class |
| `<Docs>/Epics/` | Planned and active epics, one file each | Planning and closing tasks |
| `<Docs>/Epics/Parked/` | Unscheduled epics. Never planned or built until `<Designer>` asks for one to be interviewed and moved back. | |
| `<Docs>/Epics/Completed/` | Done, merged or dissolved epics | `git mv` on close |
| `<Docs>/Playtest.md` | How to play the build, what to watch for, known limits, side effects of testing | When a feature changes how a playtest goes |
| `<Docs>/UIRules.md` | UI structure rules on top of the stack layer's UI file | When a UI rule is decided |

Code and design doc never disagree silently. When they differ, one of them is changed in the same commit, and the Changelog says which.

## The board

Every project on the standard is registered on Doit, the local board that shows every project's epics and tasks to `<Designer>` and Claude. It reads and writes the files above in place and keeps no copy, so the files stay the record and git keeps their history.
Why: one board shows what Claude is doing in each project and what is left for the designer, without opening each repo's epic files.

- **Register** on adoption: `node <doit>/bin/doit.js project add <Name> <project folder> --docs <Docs>`. A project already on the standard that `doit projects` does not list is registered at its next standard pull.
- **Claude reaches tasks through the CLI only**: list, add, change state, comment, close an epic (`node <doit>/bin/doit.js help`). It never reads task files or the epic checklist directly.
  Why: the CLI returns the slice asked for (one project, one epic, open tasks) and keeps the checklist, the task files and their timestamps in step; a hand edit to one leaves the others wrong.
- **Epic text is written as a file**: the goal, Test plan, Notes, Close audit and For the standard sections are edited in the epic file like any doc. The tasks in its checklist are added with `doit add`.
- **The archive is never read** (`<Docs>/Archive/`, archived tasks, closed epics) unless `<Designer>` asks.
  Why: it is history, and reading it costs a session's context for nothing it will act on.
- An epic in a worktree is read and written in that worktree by the board and the CLI alike, so ticks land on the epic's branch.

## The flow

1. **Design input arrives.** Update `GameDesign.md` and add a Changelog line (date, what changed, which epic).
2. **Plan.** Break the work into an epic: small tasks, each with a checkable "done when", and a Test plan (below). When it is set `Active`, first update the standard: from the main checkout on main, `python3 <central>/Tools/sync_standard.py update <Docs>/Standard` (`<central>` from `<Docs>/Standard/Subscription.txt`). When it pulled, resolve any conflict markers, commit it on main as `Standard: pull <short commit>`, and read the pulled changelog lines for rules that change how this epic is planned or built. Then build it on main in the main checkout (Branches, below). Only an epic that runs beside another one, after `<Designer>`'s yes, gets a worktree from the stack's tool (Parallel work, below).
   Why: an epic built on an old copy of the standard breaks rules every other game already follows.
3. **Before coding a task.** Update the class diagram for every class added or changed. Check the task against "Keeping the boundaries" in `Architecture.md`. A task that would need a view to call a domain service, an event to carry a live object, or a hub class to grow is re-planned first.
4. **Implement one task at a time.** A task is finished when it builds with zero errors (in Unity: compiles with zero console errors) and is committed as `T-<epic>.<n>: <summary>` on main, or on the epic's branch when it runs in a worktree. Claude does not push it (Branches).
5. **Test per batch.** The batch's last task runs the Development tests only (Audit in an away run). Audit runs when the epic closes, and every category in the release (`02-Working.md`, Tests). A failing batch is fixed before the next batch starts; the suspects are that batch's commits.
6. **Close the task.** `doit set <doit-id>/T-<nnn>.<n> state=done`, which ticks it in the epic file. Any deviation from the plan goes under Notes, newest first.
7. **Update the standard.** Before the epic is set to `Done`, read its Notes for anything the next game would need, move it into `<Docs>/Standard/` with a `CHANGELOG.md` line, and fill the epic's "For the standard" section. Writing "nothing" is a valid answer; leaving the section empty is not. Rules in `<Docs>/Standard/README.md`, Keeping it current.
8. **Close the epic.** After its last task, follow Closing an epic (below): run the Audit tests, audit the epic against the architecture, fix what must be fixed, then close it on the board. An epic in a worktree also merges main in first and is merged to main by `worktree.py close`.
9. **Rebuild generated docs** (structure map, class lists) when a task added, moved or removed a class or changed a module's boundary (in Unity, an asmdef), and commit them with the task.

## Epic rules

- One file per epic: `EPIC-<nnn>-<short-name>.md`. Numbers only go up.
- One epic is `Active` at a time, built on main. A second runs beside it only on `<Designer>`'s yes, in a worktree (Branches and Parallel work, below), and never a third; the conformance epic counts as one. An epic's tasks are worked top to bottom.
  Why: the docs merge as text, but a scene or asset that both epics change merges badly, and a designer can follow two queues of questions at most.
- A second epic's plan has a **Touches** list: the files it will change that merge badly as text, which the stack layer names (in Unity: scenes, prefabs, UXML and USS, config assets and asmdefs). An item that is also on the first epic's Touches list, or already changed by its task commits (`git log --format= --name-only --grep='^T-<first>\.'`), blocks the second epic until the first closes. Design docs, the class diagram and source code files are not on the list.
  Why: text merges mechanically and a scene conflict costs more than a few days' wait; the check is one git command at planning time.
- Generated docs (the structure map, class lists) are never merged by hand: after a merge that touched them, rebuild and commit them (The flow, step 9).
  Why: two rebuilt copies of a generated file always conflict, and a hand merge of one is always wrong.
- A task fits in one sitting and ends in one commit.
- Every task has a "done when" that can be checked: a test that passes, or something visible in the running game or app, which goes on the epic's "Check in play" list for `<Designer>` (`02-Working.md`, Tests). "Works" is not a check.
- A task's title is one short line, under about 90 characters, saying what changes. The spec (what was seen, the cause, the files, the source and its time in a recording) goes in its description: `doit add <project> <EPIC-nnn> "<title>" --description "<spec>" --done-when "<check>"`, or `doit set <project>/<T-id> description=...` later. The "done when" stays in its own field.
  Why: across twelve projects, the ones whose rules named no description packed the whole spec into the title (39 of 47 titles over 90 characters in one game, no descriptions at all), which makes the checklist line, the board's rows and the commit subjects unreadable.
- A task that turns out bigger than planned is split in the file before work continues.
- An epic merged into another or dissolved goes to `Completed/` with a status saying where its scope went.
- An epic is written as a specification: each item says what the game does when done, tagged `Decided` or `Proposed`. No quotes from sessions, no "X said".

### Test plan

Tasks are grouped into batches of 3 to 5 consecutive tasks that touch the same modules. A docs-only task joins the batch next to it. Each task is still one clean commit; only the test run waits for the batch's end.

Why batches: running the full suite per task cost a 25-task epic 20 minutes of test time; per batch it costs about 6, and a failure still points at 3 to 5 commits.

**Build all, then test once** is an option for a findings round, when `<Designer>` asks for it: every task is built with zero errors and committed with its tests written but not run, then one test pass runs Development at the end, and the play checks go on the "Check in play" list. Each task's note says what it left for the pass ("tests written, not run", "the screenshot in play is left for the test pass"), and the pass is logged in Notes with each check, its result and its capture, and every bug found with the commit that fixed it.

**A removal finds its tests in the same task.** In a build-all round, a task that removes, retires or renumbers something (a palette entry, a skill, a button, a lesson step) searches the test folders for its name and updates those tests in its own commit.
Why: with tests unrun until the end, an old test that asserts the removed thing fails only at the pass; in one findings round, seven of ten failures at the close were of this kind.
Why: a round of fifteen small, mostly independent findings was built in one sitting and tested in one pass, which found three bugs and two tests made stale by a changed number. The cost is that suspects are the whole round: a per-character animation copy made in one task left every character on the wrong clips for four tasks, found only at the pass. Use it when tasks touch different systems; keep batches when a task builds on the one before.

### Template

```markdown
# EPIC-<nnn>: <Name>

Status: Parked | Planned | Active | Done
Goal: <one sentence, player-facing outcome>
Design: GameDesign.md, section <name>

## Tasks

- [ ] T-<nnn>.1 <what, short> (done when: <check>)   (the spec goes in the task description, Epic rules)
- [ ] T-<nnn>.2 ...

## Test plan

- Batch A: T-<nnn>.1 to .3 (<modules touched>): development
- Batch B: T-<nnn>.4 to .7 (<modules touched>): development
- Performance: <the measurements a task changes, or "none">

## Check in play

What `<Designer>` checks by hand in the editor (the epic's worktree editor when it runs in one): each item with its task. "Nothing" is a valid answer.

## Notes

Decisions and deviations, newest first.

## Close audit

Filled when the epic closes: each finding with its file, the rule it breaks, and its kind (fix now, fix before release, deliberate) with where it went. Or "nothing found".

## For the standard

Filled when the epic closes: what moved into <Docs>/Standard (file and rule), or "nothing".
```

## Branches

- An epic is built on main in the main checkout: no branch, no worktree. Every task commit goes on main, unattended runs and Speed mode included.
  Why: one epic at a time is the usual case. A worktree per epic cost a second editor, a cloned Library, its own binding, a merge-in before the close and a merge at it, for a safety only parallel work needs.
- A worktree is made only for an epic that runs beside the one on main, after `<Designer>`'s yes (Parallel work, below). The stack's tool cuts it at `<projects>/<game>-wt/<nnn>-<short-name>/` on the branch `epic/<nnn>-<short-name>`. The main checkout stays on main, always. What a worktree needs beyond git (in Unity its own Library, editor and MCP binding) is in the stack layer (`Unity/02-Project.md`, Worktrees).
  Why: several sessions share the main checkout, so a branch switch there switches it under all of them and the editor reimports; a worktree is a checkout nobody else switches.
- **Claude commits; only `<Designer>` pushes.** Claude never runs `git push` (a branch, main, a tag, deleting a remote branch) unless `<Designer>` asks for that push in the session. Claude may fetch and pull whenever a step needs the checkout current: `git pull --ff-only` on main in the main checkout, and merging main into an epic's branch. A turn that leaves commits the remote lacks ends by naming the branches and the push commands. The release tool, which `<Designer>` starts, pushes as its stages say.
  Why: the designer wants a human look between a commit and the remote. A pull changes only the local checkout and is undone with a reset, so it needs no such stop.
- Work outside an epic is committed on main in the main checkout, between the epic's task commits: `Quick:` commits, the rolling bug epic's tasks, `Standard: pull` commits and releases.
  Why: these are small and checked at once; on a branch they would wait for a close that may be weeks away.
- An epic in a worktree: when main has changed, merge it into the epic's branch at the start of the next batch, not only at the close.
  Why: scenes and prefabs merge badly as text; a conflict found early has one batch of changes on each side instead of a whole epic.
- An epic's branch merges to main with `git merge --no-ff` from the main checkout (`worktree.py close`), never a squash or a rebase; the worktree is removed, then the branch is deleted locally. `<Designer>` pushes main and deletes the remote branch, if one was pushed.
  Why: one commit per task is how a failing batch finds its suspects, and a squash throws them away; the merge commit and the epic file in `Completed/` are the record. Git refuses to delete a branch a worktree has checked out, so the worktree goes first.
- A tool that writes the project's tracked docs (a task board, a generator) writes an active epic's files in that epic's worktree, never in the main checkout, and finds the worktree from its branch name.
  Why: a tick written in the main checkout while the branch ticks the same line collides at the merge, and the main checkout must stay clean for the merge to run.
- Such a tool reads an epic's state (status, open or closed) from the same copy it writes, the worktree's while there is one.
  Why: an epic closed in its worktree but read from the main checkout stayed in the open list until the merge, which is when the close was already over.
- Stable branches are not epic branches: see `02-Working.md`, Versions and releases.

## Parallel work

Two things in flight at once are allowed, but only when `<Designer>` knows and has said yes.
Why: worktrees hide work from each other. Each session sees only its own checkout, so a second epic or a Quick fix started beside an unfinished one was found only at the merge, as a conflict.

- Every session starts with the list of open work: each epic `Active` on main with the age of its last task commit, each epic worktree with its commits not on main and its uncommitted files, epic branches not merged and without a worktree, and uncommitted files in the main checkout. A SessionStart hook prints it (`Tools/Claude/open_work.py`, from `Core/Starter/`). Where the hook is missing, run the script before starting anything.
  Why: a hook runs whether or not a session remembers the rule.
- Before starting new work while that list shows work other than this session's own, Claude names it to `<Designer>`: what is open, where, how old, and which files the new work would touch that the open work also changed. The new work starts only on `<Designer>`'s yes. New work is a new epic set `Active`, a Quick implement, a rolling bug epic task, a `Standard: pull` or a release.
  Why: the designer follows two queues at most and needs to know when they are following two.
- One yes covers the session. Work that appears on the list later in the session asks again.
  Why: a question on every Quick fix gets answered without being read.
- Continuing the work this session was started for needs no yes: the next task of the epic it was asked to build.
- Work with no commit for over a week, or uncommitted files in the main checkout that no session claims, is named the same way as leftover. `<Designer>` decides whether to finish it, park it or drop it.
  Why: an abandoned epic still counts towards the limit, and an abandoned worktree still conflicts at the next merge.
- The stack's worktree tool enforces the limit: it makes a worktree only when told which epic on main the designer said yes to running beside (Unity: `worktree.py new <nnn>-<short-name> --beside <first nnn>`), and refuses a second worktree always. Claude passes that flag only after the yes.

## Closing an epic

1. **Merge main in**, for an epic in a worktree only. After the last task, merge main into the branch and commit any conflict resolution as `EPIC-<nnn>: merge main`; rebuild the generated docs if the merge touched them.
2. **Run the Audit tests** (`02-Working.md`, Tests: Development, then Audit; Performance only when the epic changed what it measures; never Behaviour) on main, or on the merged branch for an epic in a worktree, under the test lock while a worktree exists (`Unity/02-Project.md`, Worktrees). A failure becomes a task in this epic, fixed before the next step. The frame-time check is asked for and never a gate: when the machine is busy, it goes under Notes as outstanding.
   Why: the tests must prove what main is, or will be after the merge, not the branch as it was cut.
3. **Audit the epic.** Read the epic's whole diff: on main from the commit before its first task (`git diff <first T-<nnn> commit>^ HEAD`, which also holds the Quick commits made beside it), in a worktree `git diff main...HEAD`. Read it against `Architecture.md` (Keeping the boundaries, the class diagram, the known hubs), `03-Design.md`, the stack layer's module rules (`Unity/02-Project.md`), its UI file when UI changed (`Unity/01-UI.md`), and the game's `Deviations.md`. Every finding goes in the epic's Close audit section as one of three kinds:
   - **Fix now:** a guard test fails, a boundary rule is broken (a view calling a domain service, an event carrying a live object, a forbidden reference), or the class diagram disagrees with the code. It becomes a task in this epic and is fixed before the merge.
   - **Fix before release:** drift that breaks no rule outright: a hub growing towards its limit, a helper written twice, a name that slid from the design's words. It becomes a task in the conformance epic (below).
   - **Deliberate:** the code leaves the architecture on purpose. It goes to `<Designer>` as a question with a recommendation: change `Architecture.md` to match the code, or keep the departure as a row in its Departures table with its reason and an end. It is never left silent.
   Why: the check before each task sees one task; drift away from the architecture only shows across a whole epic, and a game that slides a little each epic ends far from its design.
4. **Update the standard** (The flow, step 7).
5. **Close.** `doit epic close <doit-id> EPIC-<nnn>` sets status `Done`, archives its task files and moves the epic into `Completed/`; commit those moves in one commit, staged by path. On main that ends the close.
   An epic in a worktree commits them on its branch, quits the worktree's editor if the stack has one, then from the main checkout runs `python3 Tools/Worktree/worktree.py close <nnn>-<short-name>` (or its steps by hand where the stack has no tool): it merges `--no-ff` into main, removes the worktree, deletes the branch locally and prints the push commands for `<Designer>`. It refuses when main has moved since step 1: merge main in again and start over from step 2.
   Why: the Audit run proved the branch with main in it; a main that moved since makes a different merge.

## The conformance epic

One open epic per game, `EPIC-<nnn>-conformance`, collects every "fix before release" finding as a task, numbered like the rolling bug epic's. It stays `Planned` while it collects. Before a release it is set `Active`, built like any epic and counting towards the limit, and built and closed like any epic; findings of its own close audit are fixed in it, never passed on. The next finding opens a new one.

A release does not start while a conformance epic has open tasks, unless `<Designer>` ships around it, which the release report names.
Why: drift left for "later" piles up across releases; a list that must be empty before a release puts a date on later.

## Running an epic

- When `<Designer>` asks for an epic, all its tasks are built in one go. Work stops only for a decision that is theirs.
- A question goes in the epic file and in chat, one question at a time, with a recommendation.
- An unattended run commits each task and pushes nothing; its `DONE` or `BLOCKED` line names the branch (main, unless the epic runs in a worktree) and how many commits wait for a push.
- A run blocked on a decision ends with `BLOCKED: EPIC-<nnn>` and the question; a finished one with `DONE: EPIC-<nnn>`.
- A session on an epic names its chat `EPIC-<nnn>: <what it is about>` as its first step: the epic number, then fewer than 7 plain words a reader understands without opening the epic, such as `EPIC-015: Island style guide`. Never the number alone, never a task id or the branch's short name. Claude sets it itself with the app's rename tool (`set_session_title` in the Claude desktop app); where the session has none, it gives `<Designer>` the line to paste into `/rename`. A session started on one task of the epic is named the same way.
  Why: chats named only with an epic number could not be told apart in the session list without opening each one.
- A session on an epic that runs in a worktree is started in that worktree, never in the main checkout.
  Why: a session works on the files of the folder it starts in, and in Unity its MCP binding, and so the editor it drives, comes from that folder too (`Unity/02-Project.md`, Worktrees).
- `<Designer>` tries an epic's work in the main editor or a build from it. An epic in a worktree is tried in its worktree's editor until it merges: playtest rounds on it, its "Check in play" list, tuning a config asset.
  Why: a worktree's work exists nowhere else until the merge.
- **Speed mode**, when `<Designer>` asks for it: one `batch-builder` sub-agent per test batch (`02-Working.md`, Session cost), strictly one after another, each from one shared brief in the scratchpad (rules to read, the epic, the boundaries, how to compile (in Unity, through the bridge), the commit format, a code map of the epic's areas). Each task is still one commit. Agents do not ask; an unclear point gets the simplest choice that fits the epic and a Notes line. No play screenshots: a "done when" that asks for one is covered by tests that run without the game or app (in Unity: EditMode tests and a UXML load check) and noted "unchecked in play". Agents run only their own classes' tests; the coordinator runs Development after each batch, under the test lock while a worktree exists, and Closing an epic before Done. The close copies every "unchecked in play" item to the epic's "Check in play" list for the designer's playtest.
  Why: a per-task agent rereads the docs every time and play captures cost 10 to 20 minutes per UI task; the designer playtests the result anyway, and the code map saves each agent the search.
- **Quick implement**, when `<Designer>` asks for it by name: write the change, build once and read the errors (in Unity: refresh and read the console), commit it as `Quick: <summary>`. No epic, no docs, no tests, no play check; the designer checks it by hand. The next batch's Development run and the next epic catch up on docs and tests, found through the `Quick:` commits.
  Why: for small changes the designer will try at once, the workflow's waits cost more than the checks find; a compile check stays because a broken editor stops the hand check too.

## Playtest rounds

A playtest produces a findings epic, not fixes.

1. `<Designer>` plays (the main editor, a build, an epic's worktree editor when it runs in one, or a release) and reports, loosely and often by voice.
2. Each report becomes a numbered finding in that round's epic: tag `[bug]` or `[design]`, a proposed fix, and open questions asked in chat.
3. The epic file is committed after each batch of findings, so nothing is lost.
4. Nothing is fixed until `<Designer>` closes the list. Then `GameDesign.md` is updated, tasks are planned and the whole round is built.
5. Everything from one round stays in that round's epic, even a feature-sized item.

Why: fixing while the reports come in breaks the play session and fixes things that the next report changes.

When `<Designer>` asks to build a closed list without naming a mode, it is built in **Quick build** unless the round's items touch the save format, the release or another game's shared code: each task a commit that compiles, no tests, docs or play checks until the close, which writes the tests owed and runs the tiers. Ask once in the first message when unsure, never mid-run.
Why: in Box Trainer a ten-item playtest list built in the full process (docs and tests per task, a tier per batch) took about 40 minutes for two batches before the designer asked why the iteration was slow; the designer checks a playtest round by playing it.
The first batch run after a quick build starts with the light tier and expects failures: tests that held the old rules, and any that asserted a trained agent's behaviour. The first are moved to the new rules; the second move to the Behaviour category (`02-Working.md`, Tests; in Unity also `Unity/02-Project.md`, Learning agents), not into a bug hunt.
Why: in Box Trainer one quick build of eleven tasks left twelve light failures, ten of them tests of rules the round had changed on purpose, two seed-tuned behaviour bars.

A finding that looks like a bug is reproduced headless against the design before any code changes: run the case in the editor or a test with the tester's saves or data (not saved back), find what the game did and why, and check that against `GameDesign.md`. When the design caused it, or an actor the player could not see, the finding becomes a test that holds the rule and a question for `<Designer>`, not a fix.
Why: in Box Trainer two of one round's five bugs were not bugs: a clear strip was ground the agent had walked, which the design keeps known all run, and a flee with no rival on screen was a rival only heard under the fog. Fixing either would have broken the design.

## Rolling bug epics

Bugs `<Designer>` meets while playing outside a playtest round go into one open-ended bug epic, not an epic each. Each report becomes a task with the next number: a short title, what was seen and the cause once found in its description, a "done when" (Epic rules). It is its own test batch and gets a domain test that fails without the fix. A bug that turns out to be the design working as written gets the designer's answer in the task before code changes. The epic closes only when `<Designer>` ends it.
Why: in Box Trainer three single bugs would have been three epics with three test plans; one of them, water doing no damage, was the rule as written, and the designer's answer changed the rule instead.

## Reviews

A review (coupling, performance, UI) is finished only when it has:

- an epic that fixes what it found, and
- a rule that stops a recurrence, in `CLAUDE.md` and `Architecture.md`, preferably as a guard test, and in `<Docs>/Standard/` when the next game would need it too.

A review document alone is not the deliverable.

## Commits

- One commit per task, message `T-<epic>.<n>: <summary>`. Work outside an epic says what it does in plain words.
- The message states the result in the game's own words, and ends with the test counts per category when tests ran (`development 868 of 868`).
- Stage explicit paths only. Never `git add -A` or `git add <folder>`: another session or the designer's open editor may have unrelated changes in the tree.
- Run `git status --short` before each commit and leave files you did not create alone.
