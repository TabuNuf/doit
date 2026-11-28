# EPIC-032: Column picker

In short: every list with column headers in Doit lets Tabu hide and show its columns, from a right click on the headers or a small button in their top left corner.
Why it exists: on 2026-11-28 Tabu found the Games list too crowded (seven columns, genres wrapping to three lines) and asked for column choice as a default for every table in Doit.

Status: Done
Closed: 2026-11-28
Design: Design.md, section Look (Columns)

## Specification

- Decided: one shared module, `web/columnPicker.js`, owns the dropdown, the saved choice and the grid template. Each list hands it its columns (id, label, width); a list built later uses it the same way.
- Decided: lists covered now: Contacts, Games, and the task table on the epic page.
- Decided: right click on the header row, or the columns button in its top left corner, opens a dropdown with one checkbox per column. Escape or a click outside closes it.
- Decided: the first column (Name, Title, Task) cannot be unticked; its checkbox shows greyed.
- Decided: hidden columns leave the header and every row; the grid template is built from the visible columns' widths, so the rest widen.
- Decided: the choice is kept per list in localStorage (`doit.columns.<list>`), as the sort is; every column shows when nothing is saved or storage is off.
- Proposed: sorting by a column that is then hidden keeps that sort; the header just no longer shows the arrow.

## Findings

## Tasks

- [x] T-032.1 Shared column picker module (done when: test/columnPicker.test.js passes: visible columns from a saved choice, the first column cannot be hidden, grid template from visible widths, unreadable storage shows all; no web file over 300 lines)
- [x] T-032.2 Contacts and Games lists use the picker (done when: tests pass: right click on the header row and the corner button open the dropdown; unticking Genre removes it from the Games header and rows; Contacts the same; the choice survives a reload)
- [x] T-032.3 Epic page task table uses the picker (done when: tests pass: the task table on the epic page hides Who or Model and effort when unticked, and Task stays)
- [x] T-032.4 Design, architecture and standard note (done when: Architecture.md names columnPicker in web with its users; Docs/Standard App notes that a list with column headers uses the shared picker)
- [x] T-032.5 Check in play: column picker (done when: Tabu has hidden and shown columns in Contacts, Games and an epic's task table, and each works or has a bug task)
- [x] T-032.6 Close audit: Architecture.md and the file headers say which column modules read the saved choice and the open dropdown (done when: Architecture.md no longer calls columnPicker.js, gameColumns.js and epicParts.js pure, and each file's header names what it reads; npm test passes)

## Test plan

- Batch 1 (T-032.1 to T-032.4): `npm test` passes, under 2 minutes, without starting the app.
- Close: `npm run test:audit`, then T-032.5 in play.

## Notes

Decisions and deviations, newest first.

## Close audit

Closed 2026-11-28. Development (494) and Audit (495) tests pass on main. Read: the four task commits (`9c4ab28`, `2653428`, `dce0ebe`, `d1dc447`) against `Architecture.md`, `Core/03-Design.md`, `App/README.md` and `Design.md`, section Look. No forbidden import, the grid template and the cells come from the same column list in all three lists, and every list with column headers has the picker.

Fix now (T-032.6, docs and header comments only):

- `Docs/Architecture.md`: it called `columnPicker.js`, `gameColumns.js` and `epicParts.js` pure. The picker reads and writes the saved choice in `localStorage`, and the other two read the open dropdown (`S.colMenu`) and the saved choice. Rule: the module list matches the code. Corrected, and the headers of `gameColumns.js`, `contactColumns.js` and `epicParts.js` now say what they read.

Fix before release (EPIC-022):

- `web/columnEvents.js`, `web/columnPicker.js`, `web/epicParts.js`, `web/contactColumns.js`, `web/gameColumns.js`: the shared module imports every list's columns, a list left out of `LISTS` half works, the task table builds its own header row, and `COLUMNS` and `GM_COLUMNS` have no reader. T-022.19.
- `web/style.css`: 310 lines against the 300-line rule; the guard counts only `.js`. T-022.20.
- `web/columnPicker.js`, `web/resize.js`: the key prefix `doit.columns.<list>` is shared with the pane widths, a tick does nothing with storage off, and each row reads the saved choice again. T-022.21.

Deliberate: the task table's last, unnamed column is always shown and is not in the picker. Written in `Architecture.md` and in the code by T-032.3.

## For the standard

`App/README.md`, Lists with column headers, went in with T-032.4. Nothing new at the close.
