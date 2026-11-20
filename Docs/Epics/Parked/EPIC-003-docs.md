# EPIC-003: Docs view

Status: Parked
Goal: Each project's docs folder (design, specs, art bible) is readable and editable in Doit, with Confluence pages moved in.
Design: not written yet. Wireframe: Docs/Design/wireframe.html, Docs view.

## Scope

- Decided: documents stay as Markdown in each project's own docs folder, read in place; Doit keeps no copy.
- Decided: Claude edits docs as files, as it does today; the page is for Tabu.
- Proposed: a Docs view with three panes: the folder tree, the document, and Linked (tasks that cite the document).
- Proposed: the tree shows the docs folder except `Archive/`, `Epics/Tasks/` and `Standard/`; Completed epics are listed but folded.
- Proposed: Edit swaps the rendered page for a plain text box; saving writes the file and shows who changed it last from git.
- Proposed: a one-time import turns a Confluence space export into Markdown files under `<docs>/Confluence/`, each with its original URL as a note at the top.

Open before planning: which Confluence spaces move, and whether pictures in them come along.

## Tasks

- [ ] T-003.1 Docs API: list a project's docs tree and read one document, with paths kept inside the docs folder (done when: tests read a document and refuse `../` and absolute paths)
- [ ] T-003.2 Docs view: tree and rendered document, using the epic view's markdown renderer, plus tables (done when: picking a file shows it rendered; a table in Design.md renders as a table)
- [ ] T-003.3 Edit and save a document from the page (done when: a test saves a document through the API; in the page, Edit then Done writes the file and the change shows in git diff)
- [ ] T-003.4 Linked pane: open tasks whose description or done-when names the document (done when: a task that mentions Design.md is listed when Design.md is open)
- [ ] T-003.5 Confluence import: a CLI command turns a space export into Markdown files (done when: `doit docs import <project> <export.zip>` on a sample export writes one file per page with its source URL, and nothing existing is overwritten)

## Test plan

- Batch A: T-003.1 to .4 (server, store, web): development
- Batch B: T-003.5 (CLI, a new import module): development
- Performance: reading the tree of a docs folder with 500 files stays under 200 ms

## Check in play

- T-003.2: open Design.md and Architecture.md; headings, lists and tables read well at text size 15 and 20.
- T-003.3: edit a line, press Done, see it in the file.
- T-003.5: import one real space and spot-check three pages against Confluence.

## Notes

Decisions and deviations, newest first.

## Close audit

## For the standard
