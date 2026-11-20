# EPIC-003: Docs view

Status: Active
Goal: Each project's docs folder (design, specs, architecture) is readable and editable in Doit, beside the board.
Design: Design.md, section Docs. Wireframe: Docs/Design/wireframe.html, Docs view.

## Scope

- Decided: documents stay as Markdown in each project's own docs folder, read in place; Doit keeps no copy.
- Decided: Claude edits docs as files, as it does today; the page is for Tabu.
- Decided: a Docs view with three panes: the folder tree, the document, and Linked (tasks that cite the document).
- Decided: the tree shows the docs folder except `Archive/`, `Epics/Tasks/` and `Standard/`; Completed epics are listed but folded.
- Decided: Edit swaps the rendered page for a plain text box; saving writes the file and shows who changed it last from git.
- Moved: the Confluence import (formerly T-003.5) is EPIC-009, parked until the app is set up for it.

## Tasks

- [x] T-003.1 Docs API: list a project's docs tree and read one document, with paths kept inside the docs folder (done when: tests read a document and refuse `../` and absolute paths)
- [ ] T-003.2 Docs view: tree and rendered document, using the epic view's markdown renderer, plus tables (done when: picking a file shows it rendered; a table in Design.md renders as a table)
- [ ] T-003.3 Edit and save a document from the page (done when: a test saves a document through the API; in the page, Edit then Done writes the file and the change shows in git diff)
- [ ] T-003.4 Linked pane: open tasks whose description or done-when names the document (done when: a task that mentions Design.md is listed when Design.md is open)

## Test plan

- Batch A: T-003.1 to .4 (domain, store, server, web): development
- Performance: reading the tree of a docs folder with 500 files stays under 200 ms (new `test/performance/`, `npm run test:performance`)

## Check in play

- T-003.2: open Design.md and Architecture.md; headings, lists and tables read well at text size 15 and 20.
- T-003.3: edit a line, press Done, see it in the file.

## Notes

Decisions and deviations, newest first.

- 2026-11-20: activated. Proposed scope taken as Decided. T-003.5 (Confluence import) moved to EPIC-009: the export format is decided once the app is set up for it; pictures come along.
- Touches: no other epic is Active.

## Close audit

## For the standard
