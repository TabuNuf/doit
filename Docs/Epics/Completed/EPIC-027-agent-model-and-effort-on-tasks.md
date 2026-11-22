# EPIC-027: Agent, model and effort on tasks

Status: Done
Closed: 2026-11-22
Goal: Every task for Claude says which agent builds it, on which model and at which effort, in fields of its own, and a task for a human shows none of it.
Design: Design.md, sections Tasks (Who builds it) and The CLI

## Tasks

- [x] T-027.1 A task carries agent, model and effort, kept in its task file (done when: npm test passes with new tests: add and update store the three fields, a bad effort is refused, owner human and back keeps them, a task file without them loads)
- [x] T-027.2 CLI: add and set take agent, model and effort; show and list --json return them (done when: npm test passes with new CLI tests: add flags, set keys, effort check exits 1, plain show hides the line for owner human, --json carries the values for both owners, help names them)
- [x] T-027.3 Detail pane: agent, model and effort editable on a Claude task, not shown on a human one (done when: npm test passes with new pane tests, and in the page a Claude task shows the three controls and saves them, a human task shows none, and owner flipped to Me and back shows the same values (Check in play))

## Specification

- `Decided` A task has three optional fields: agent, model and effort, kept in the task file's front matter.
- `Decided` Effort is one of low, medium, high, xhigh, max; any other value is refused.
- `Decided` Agent and model are free text. The page suggests the four models the standard names today.
  Why: twelve projects share the board and model names change with each release; a fixed list would refuse a valid task until Doit itself was changed. Effort is a fixed scale the standard defines, so it is checked.
- `Decided` On a task owned by a human the detail pane and the CLI's plain text leave the three out. The stored values are never changed by a change of owner, and `--json` always carries them.
- `Decided` The + Task form and the list rows do not show the fields.

## Test plan

- Batch A: T-027.1 to .3 (domain task and taskEdit, store markdown, cli, web detail pane): development
- Performance: none
- Close: Audit (`npm run test:audit`)

## Check in play

- T-027.3: a task owned by Claude shows Agent, Model and Effort under Type in the detail pane; typing an agent, picking a model and an effort saves them (they are still there after a reload).
- T-027.3: switching the owner to Me removes the three rows; switching back to Claude shows the same values.

## Notes

Decisions and deviations, newest first.

- 2026-11-22, close: Audit 370 of 370. Checked in the running page on T-027.3: the three rows show under Type, Effort changed to high saved, owner Me removed the rows, owner Claude brought back batch-builder, Sonnet 5.5 and high unchanged. Checked in the CLI: `effort=huge` exits 1 with the list; plain `show` drops the line for owner human while `list --json` and the task file keep the values.
- 2026-11-22, T-027.3: `.kv input[list]` added to the text-input rule in `web/style.css` so the Model input matches the others.
- 2026-11-22, T-027.2: the plain-text line is built by a new `src/cli/assignmentLine.js`, since `cli.js` sits at 215 of 220 lines.
- 2026-11-22, T-027.1: `addTask` checks the three fields before it writes the checklist line, so a refused effort leaves no line without a task.
- 2026-11-22: the three tasks were built by one `batch-builder` run (Sonnet 5.5, medium) from their descriptions; their `For:` lines were the stopgap this epic replaces, and their fields were set once the fields existed.

## Close audit

Diff read from `bf1c50a` to the last task commit against `Architecture.md` and `Core/03-Design.md`.

- `web/assignment.js`: its own `EFFORTS` list beside the domain's in `src/domain/task.js`. A value written twice. Fix before release: T-022.10.
- Nothing else found: the checks live once in `task.js` (`checkAssignment`), used by add and update; no import crosses a boundary; `board.js` 218 and `cli.js` 215 lines, under their guards; no class added, so the class diagram stands.

## For the standard

- `Core/01-Tasks.md`, Epic rules and Template, and `Core/CLAUDE.core.md` step 2: a Claude task's agent, model and effort are the board's three fields (`doit add --agent --model --effort`, `doit set <project>/<T-id> agent= model= effort=`), replacing the `For:` line in the description. `CHANGELOG.md` has the line.
