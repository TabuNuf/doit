# EPIC-032: Column picker

In short: every list with column headers in Doit lets Tabu hide and show its columns, from a right click on the headers or a small button in their top left corner.
Why it exists: on 2026-11-28 Tabu found the Games list too crowded (seven columns, genres wrapping to three lines) and asked for column choice as a default for every table in Doit.

Status: Active
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
- [ ] T-032.5 Check in play: column picker (done when: Tabu has hidden and shown columns in Contacts, Games and an epic's task table, and each works or has a bug task)

## Test plan

- Batch 1 (T-032.1 to T-032.4): `npm test` passes, under 2 minutes, without starting the app.
- Close: `npm run test:audit`, then T-032.5 in play.

## Notes

Decisions and deviations, newest first.

## Close audit

## For the standard
