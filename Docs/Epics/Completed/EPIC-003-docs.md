# EPIC-003: Docs view

Status: Done
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
- [x] T-003.2 Docs view: tree and rendered document, using the epic view's markdown renderer, plus tables (done when: picking a file shows it rendered; a table in Design.md renders as a table)
- [x] T-003.3 Edit and save a document from the page (done when: a test saves a document through the API; in the page, Edit then Done writes the file and the change shows in git diff)
- [x] T-003.4 Linked pane: open tasks whose description or done-when names the document (done when: a task that mentions Design.md is listed when Design.md is open)

## Test plan

- Batch A: T-003.1 to .4 (domain, store, server, web): development
- Performance: reading the tree of a docs folder with 500 files stays under 200 ms (new `test/performance/`, `npm run test:performance`)

## Check in play

- T-003.2: open Design.md and Architecture.md; headings, lists and tables read well at text size 15 and 20.
- T-003.3: edit a line, press Done, see it in the file.
- Checked by Claude on a throwaway project at 1400 px and the stacked layout: tree with Epics/Completed folded, Design.md and Architecture.md rendered with the Layers table, last change from git, Edit then Done wrote the file (git diff showed it), the draft survived the 10-second reload, a Linked card opened its task on the Board. Text size 20 not checked.

## Notes

Decisions and deviations, newest first.

- 2026-11-20: close. A saved document keeps the text box's ending as typed; no newline is added at the end of the file.

- 2026-11-20: the library's save and linked, the store's write and the PUT and linked routes went in with the page's Docs view (T-003.1 and .2), so T-003.3 and .4 add their tests and tick; the page's Edit/Done and Linked pane are unchecked in a browser.
- 2026-11-20: activated. Proposed scope taken as Decided. T-003.5 (Confluence import) moved to EPIC-009: the export format is decided once the app is set up for it; pictures come along.
- Touches: no other epic is Active.

## Close audit

- `src/store/docsFolder.js` `#inside`: a path in a missing folder was resolved against the docs root's parent and refused as "outside the docs folder" instead of 404. Fix now: fixed at the close, with a test.
- `web/docsView.js`: the 10-second reload redraws the Docs panes, so a click landing during a redraw can miss. The Board view does the same. Deliberate: no change unless it shows in use.
- Nothing else: the boundaries test passes, `DocsLibrary` and `DocsFiles` are in the class diagram and the Layers table, and no web file is over 300 lines.

## For the standard

- `App/README.md`, Pages over local files: the two-step path check, the reload that never redraws an open edit box, and Performance tests in their own folder and script. One `CHANGELOG.md` line.
