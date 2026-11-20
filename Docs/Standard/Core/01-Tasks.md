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

## The flow

1. **Design input arrives.** Update `GameDesign.md` and add a Changelog line (date, what changed, which epic).
2. **Plan.** Break the work into an epic: small tasks, each with a checkable "done when", and a Test plan (below). When it is set `Active`, first update the standard: from the main checkout on main, `python3 <central>/Tools/sync_standard.py update <Docs>/Standard` (`<central>` from `<Docs>/Standard/Subscription.txt`). When it pulled, resolve any conflict markers, commit it on main as `Standard: pull <short commit>`, and read the pulled changelog lines for rules that change how this epic is planned or built. Then the stack's worktree tool makes its worktree and branch (Branches, below): `python3 Tools/Worktree/worktree.py new <nnn>-<short-name>` in Unity, `git worktree add` where the stack has no tool.
   Why: the branch is cut from main, so a pull made after it reaches the epic only at its close; an epic built on an old copy breaks rules every other game already follows.
3. **Before coding a task.** Update the class diagram for every class added or changed. Check the task against "Keeping the boundaries" in `Architecture.md`. A task that would need a view to call a domain service, an event to carry a live object, or a hub class to grow is re-planned first.
4. **Implement one task at a time.** A task is finished when it builds with zero errors (in Unity: compiles with zero console errors) and is committed as `T-<epic>.<n>: <summary>` on the epic's branch and pushed.
5. **Test per batch.** The batch's last task runs the Development tests only (Audit in an away run). Audit runs when the epic closes, and every category in the release (`02-Working.md`, Tests). A failing batch is fixed before the next batch starts; the suspects are that batch's commits.
6. **Close the task.** Tick it in the epic file. Any deviation from the plan goes under Notes, newest first.
7. **Update the standard.** Before the epic is set to `Done`, read its Notes for anything the next game would need, move it into `<Docs>/Standard/` with a `CHANGELOG.md` line, and fill the epic's "For the standard" section. Writing "nothing" is a valid answer; leaving the section empty is not. Rules in `<Docs>/Standard/README.md`, Keeping it current.
8. **Close the epic.** After its last task, follow Closing an epic (below): merge main in, run the Audit tests, audit the epic against the architecture, fix what must be fixed, then `worktree.py close` merges it to main.
9. **Rebuild generated docs** (structure map, class lists) when a task added, moved or removed a class or changed a module's boundary (in Unity, an asmdef), and commit them with the task.

## Epic rules

- One file per epic: `EPIC-<nnn>-<short-name>.md`. Numbers only go up.
- At most two epics are `Active` at a time, each in its own worktree (Branches, below); the conformance epic counts as one. An epic's tasks are worked top to bottom.
  Why: the docs merge as text, but a scene or asset that both epics change merges badly, and a designer can follow two queues of questions at most.
- A second epic's plan has a **Touches** list: the files it will change that merge badly as text, which the stack layer names (in Unity: scenes, prefabs, UXML and USS, config assets and asmdefs). An item that is also on the first epic's Touches list, or already changed on its branch (`git diff main...epic/<first> --name-only`), blocks the second epic until the first closes. Design docs, the class diagram and source code files are not on the list.
  Why: text merges mechanically and a scene conflict costs more than a few days' wait; the check is one git command at planning time.
- Generated docs (the structure map, class lists) are never merged by hand: after a merge that touched them, rebuild and commit them (The flow, step 9).
  Why: two rebuilt copies of a generated file always conflict, and a hand merge of one is always wrong.
- A task fits in one sitting and ends in one commit.
- Every task has a "done when" that can be checked: a test that passes, or something visible in the running game or app, which goes on the epic's "Check in play" list for `<Designer>` (`02-Working.md`, Tests). "Works" is not a check.
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

- [ ] T-<nnn>.1 <what> (done when: <check>)
- [ ] T-<nnn>.2 ...

## Test plan

- Batch A: T-<nnn>.1 to .3 (<modules touched>): development
- Batch B: T-<nnn>.4 to .7 (<modules touched>): development
- Performance: <the measurements a task changes, or "none">

## Check in play

What `<Designer>` checks by hand in the epic's worktree editor: each item with its task. "Nothing" is a valid answer.

## Notes

Decisions and deviations, newest first.

## Close audit

Filled when the epic closes: each finding with its file, the rule it breaks, and its kind (fix now, fix before release, deliberate) with where it went. Or "nothing found".

## For the standard

Filled when the epic closes: what moved into <Docs>/Standard (file and rule), or "nothing".
```

## Branches

- The main checkout stays on main, always. Each epic is built in its own worktree at `<projects>/<game>-wt/<nnn>-<short-name>/` on its own branch `epic/<nnn>-<short-name>`, cut from main by the stack's worktree tool (The flow, step 2) when the epic is set `Active`, even when it is the only epic in flight. Every task commit goes on that branch and is pushed, unattended runs and Speed mode included. What a worktree needs beyond git (in Unity its own Library, editor and MCP binding) is in the stack layer (`Unity/02-Project.md`, Worktrees).
  Why: main stays releasable while an epic is half built, and the epic lands as one unit that can be read or reverted whole. Several sessions share one checkout, so a branch switch there switches it under all of them and the editor reimports; a worktree is a checkout nobody else switches.
- Work outside an epic is committed on main in the main checkout: `Quick:` commits, the rolling bug epic's tasks, `Standard: pull` commits and releases.
  Why: these are small and checked at once; on a branch they would wait for a close that may be weeks away.
- When main has changed, merge it into the epic's branch at the start of the next batch, not only at the close.
  Why: scenes and prefabs merge badly as text; a conflict found early has one batch of changes on each side instead of a whole epic.
- The branch merges to main with `git merge --no-ff` from the main checkout (`worktree.py close`), never a squash or a rebase; the worktree is removed, then the branch is deleted locally and on the remote.
  Why: one commit per task is how a failing batch finds its suspects, and a squash throws them away; the merge commit and the epic file in `Completed/` are the record. Git refuses to delete a branch a worktree has checked out, so the worktree goes first.
- A tool that writes the project's tracked docs (a task board, a generator) writes an active epic's files in that epic's worktree, never in the main checkout, and finds the worktree from its branch name.
  Why: a tick written in the main checkout while the branch ticks the same line collides at the merge, and the main checkout must stay clean for the merge to run.
- Stable branches are not epic branches: see `02-Working.md`, Versions and releases.

## Closing an epic

1. **Merge main in.** After the last task, merge main into the branch and commit any conflict resolution as `EPIC-<nnn>: merge main`; rebuild the generated docs if the merge touched them.
2. **Run the Audit tests** (`02-Working.md`, Tests: Development, then Audit; Performance only when the epic changed what it measures; never Behaviour) on the merged branch, under the test lock when the stack has one (`Unity/02-Project.md`, Worktrees). A failure becomes a task in this epic, fixed before the next step. The frame-time check is asked for and never a gate: when the machine is busy, it goes under Notes as outstanding.
   Why: the tests must prove what main will be after the merge, not the branch as it was cut.
3. **Audit the epic.** Read the epic's whole diff (`git diff main...HEAD`) against `Architecture.md` (Keeping the boundaries, the class diagram, the known hubs), `03-Design.md`, the stack layer's module rules (`Unity/02-Project.md`), its UI file when UI changed (`Unity/01-UI.md`), and the game's `Deviations.md`. Every finding goes in the epic's Close audit section as one of three kinds:
   - **Fix now:** a guard test fails, a boundary rule is broken (a view calling a domain service, an event carrying a live object, a forbidden reference), or the class diagram disagrees with the code. It becomes a task in this epic and is fixed before the merge.
   - **Fix before release:** drift that breaks no rule outright: a hub growing towards its limit, a helper written twice, a name that slid from the design's words. It becomes a task in the conformance epic (below).
   - **Deliberate:** the code leaves the architecture on purpose. It goes to `<Designer>` as a question with a recommendation: change `Architecture.md` to match the code, or keep the departure as a row in its Departures table with its reason and an end. It is never left silent.
   An epic branch cut from another epic's branch audits its own diff (`git diff <parent tip>...HEAD`), since the parent's was audited at its own close and reading it again hides the child's findings.
   Why: the check before each task sees one task; drift away from the architecture only shows across a whole epic, and a game that slides a little each epic ends far from its design.
4. **Update the standard** (The flow, step 7).
5. **Merge.** Set status `Done` and `git mv` the file into `Completed/` in one commit on the branch and push it. Quit the worktree's editor, if the stack has one, then from the main checkout run `python3 Tools/Worktree/worktree.py close <nnn>-<short-name>` (or its steps by hand where the stack has no tool): it merges `--no-ff` into main, pushes main, removes the worktree and deletes the branch locally and on the remote. It refuses when main has moved since step 1: merge main in again and start over from step 2.
   Why: the Audit run proved the branch with main in it; a main that moved since makes a different merge, and a second epic closing in between is the usual way it moves.

## The conformance epic

One open epic per game, `EPIC-<nnn>-conformance`, collects every "fix before release" finding as a task, numbered like the rolling bug epic's. It stays `Planned` while it collects. Before a release it is set `Active`, in a worktree like any epic and counting towards the two, and built and closed like any epic; findings of its own close audit are fixed in it, never passed on. The next finding opens a new one.

A release does not start while a conformance epic has open tasks, unless `<Designer>` ships around it, which the release report names.
Why: drift left for "later" piles up across releases; a list that must be empty before a release puts a date on later.

## Running an epic

- When `<Designer>` asks for an epic, all its tasks are built in one go. Work stops only for a decision that is theirs.
- A question goes in the epic file and in chat, one question at a time, with a recommendation.
- During an unattended run, every task is pushed as soon as it is committed, so progress is visible remotely.
- A run blocked on a decision ends with `BLOCKED: EPIC-<nnn>` and the question; a finished one with `DONE: EPIC-<nnn>`.
- The chat is named after the task (the branch after the epic, Branches above): `T-015.2: Island style guide`, so past work is easy to find. A session on an epic is started in the epic's worktree, never in the main checkout.
  Why: a session works on the files of the folder it starts in, and in Unity its MCP binding, and so the editor it drives, comes from that folder too (`Unity/02-Project.md`, Worktrees).
- `<Designer>` tries an epic's work in that epic's worktree editor or a build from it until it merges: playtest rounds on the epic, the epic's "Check in play" list, tuning a config asset. The main editor shows main.
  Why: the work exists nowhere else until the merge, and the main editor stays on what players have.
- **Speed mode**, when `<Designer>` asks for it: one `batch-builder` sub-agent per test batch (`02-Working.md`, Session cost), strictly one after another, each from one shared brief in the scratchpad (rules to read, the epic, the boundaries, how to compile (in Unity, through the bridge), the commit format, a code map of the epic's areas). Each task is still one commit. Agents do not ask; an unclear point gets the simplest choice that fits the epic and a Notes line. No play screenshots: a "done when" that asks for one is covered by tests that run without the game or app (in Unity: EditMode tests and a UXML load check) and noted "unchecked in play". Agents run only their own classes' tests; the coordinator runs Development after each batch, under the test lock, and Closing an epic before Done. The close copies every "unchecked in play" item to the epic's "Check in play" list for the designer's playtest.
  Why: a per-task agent rereads the docs every time and play captures cost 10 to 20 minutes per UI task; the designer playtests the result anyway, and the code map saves each agent the search.
- **Quick implement**, when `<Designer>` asks for it by name: write the change, build once and read the errors (in Unity: refresh and read the console), commit and push it as `Quick: <summary>`. No epic, no docs, no tests, no play check; the designer checks it by hand. The next batch's Development run and the next epic catch up on docs and tests, found through the `Quick:` commits.
  Why: for small changes the designer will try at once, the workflow's waits cost more than the checks find; a compile check stays because a broken editor stops the hand check too.

## Playtest rounds

A playtest produces a findings epic, not fixes.

1. `<Designer>` plays (an active epic in its worktree editor or a build from it, a release from main) and reports, loosely and often by voice.
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

Bugs `<Designer>` meets while playing outside a playtest round go into one open-ended bug epic, not an epic each. Each report becomes a task with the next number: what was seen, the cause once found, a "done when". It is its own test batch and gets a domain test that fails without the fix. A bug that turns out to be the design working as written gets the designer's answer in the task before code changes. The epic closes only when `<Designer>` ends it.
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
