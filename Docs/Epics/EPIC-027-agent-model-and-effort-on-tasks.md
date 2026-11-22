# EPIC-027: Agent, model and effort on tasks

Status: Active
Goal: Every task for Claude says which agent builds it, on which model and at which effort, in fields of its own, and a task for a human shows none of it.
Design: Design.md, sections Tasks (Who builds it) and The CLI

## Tasks

- [x] T-027.1 A task carries agent, model and effort, kept in its task file (done when: npm test passes with new tests: add and update store the three fields, a bad effort is refused, owner human and back keeps them, a task file without them loads)
- [x] T-027.2 CLI: add and set take agent, model and effort; show and list --json return them (done when: npm test passes with new CLI tests: add flags, set keys, effort check exits 1, plain show hides the line for owner human, --json carries the values for both owners, help names them)
- [ ] T-027.3 Detail pane: agent, model and effort editable on a Claude task, not shown on a human one (done when: npm test passes with new pane tests, and in the page a Claude task shows the three controls and saves them, a human task shows none, and owner flipped to Me and back shows the same values (Check in play))

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

## Close audit

## For the standard
