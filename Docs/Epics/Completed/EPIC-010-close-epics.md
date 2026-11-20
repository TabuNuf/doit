# EPIC-010: Close epics

Status: Done
Closed: 2026-11-20
Goal: Tabu closes an epic from the board; it shows under Closed, then after the keep setting under a folded Archived section.
Design: Design.md, section Epics.

## Scope

- Decided: Close epic sits in the epic document's header, for open epics only, behind a confirmation. It runs the same path as `epic close`.
- Decided: closing writes `Closed: <YYYY-MM-DD>` under the status line, so the date travels with the file.
- Decided: Closed and Archived are two views of `Epics/Completed/`, split by the `Closed:` date against the keep setting (14 days, shared with tasks). No file moves between them. A completed epic with no `Closed:` line is Archived.
- Decided: the CLI's `epics` stays open-only.

## Tasks

- [x] T-010.1 (dc4239c) Closing writes the `Closed:` date, and the board view returns closed epics with their date and whether they are archived (done when: a domain test closes an epic and sees it as closed, then as archived 15 days later; an epic in Completed/ without the line comes back archived)
- [x] T-010.2 (497a5d8) `POST /api/epics/<project>/<EPIC-nnn>/close` closes an epic (done when: a server test closes an epic through the API and a second call is refused)
- [x] T-010.3 (see T-010.4 commit) Close epic button in the epic document's header, with a confirmation, open epics only (done when: a web test finds the button on an open epic and not on a closed one; in play, closing an epic moves it to Closed)
- [x] T-010.4 Closed and Archived sections under each project's open epics, Archived folded until clicked (done when: a web test renders both sections from view data; in play, an archived epic opens its document)

## Test plan

- Batch A: T-010.1 to .4 (domain, store, server, web): development
- Performance: none
- Touches: none (source and docs only)

## Check in play

- T-010.3: close a throwaway epic; it leaves the open list, shows under Closed, its tasks are in the Archive tab.
- T-010.4: unfold Archived; EPIC-001 to EPIC-008 are there and open their documents.
- Checked by Claude on a throwaway copy of these docs at 1400 px: Archived unfolds with six epics and EPIC-008 opens its document; Close epic on EPIC-010 asked for confirmation (dialog answered by script, not by hand), the epic moved to Closed, and its document stayed shown with Status Done, `Closed: 2026-11-20` and no Close button. Not checked: the confirm dialog itself, dark mode, the stacked layout.

## Notes

Decisions and deviations, newest first.

- 2026-11-20: an epic closed in its worktree counts as closed before the merge: the source reads open/closed from the copy it reads (worktree or main), so it leaves the open list and shows under Closed at once.

- T-010.3 and T-010.4 share one commit: both edit events.js, state.js and web.test.js, and the pieces were not separable without interactive staging.
- Closed epics come from `source.closedEpics`, a new port method, because `load` reads Completed/ only when tasks are loaded with the archive. `view` returns them as `closedEpics`, newest first, each with `closed` and `archived`.
- Not handled: an epic closed inside its worktree stays in the open list (read from main) until the branch merges; `closedEpics` reads the main checkout only.

## Close audit

- `src/domain/board.js`, Core/03-Design.md (split a class past about 300 lines): 239 lines after this epic. Fix before release: no rule broken yet; split it before the next feature lands in it. No conformance epic is open, so it is recorded here, not as a task.
- `src/store/source.js` `#epics`: every board read now parses the epic files in `Completed/` as well, twice per `view` (load and `closedEpics`). Deliberate: a few dozen small files cost nothing measurable; revisit if a project collects hundreds of closed epics.
- Boundaries test passes; the class diagram and module list match the code.

## For the standard

- `Core/01-Tasks.md`, Branches: a tool that writes an epic's files in its worktree reads the epic's state from there too. CHANGELOG line added.
