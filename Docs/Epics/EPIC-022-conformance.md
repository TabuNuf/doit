# EPIC-022: Conformance

Status: Planned
Goal: Drift found at EPIC-021's close is fixed before the next release.
Design: Architecture.md

## Tasks

- [ ] T-022.1 The store-event rule lives once: festival rows carry platform, and marketingView stops listing steam, epic, gog and itch itself (done when: marketingView.js reads row.platform; no store list in web/; npm test passes)
- [ ] T-022.2 checkProfile moves out of events.js to the profile checks in contacts.js (done when: events.js holds only event fields; npm test passes)
- [ ] T-022.3 One comma-list helper (split, trim, dedupe) in contacts.js replaces the four copies in events.js, contacts.js and contactImport.js (done when: grep finds one definition; npm test passes)
- [ ] T-022.4 The default marketing project id is written once, in the store's settings read; Outreach and the shelves take it from there (done when: "polyspice-marketing" appears once in src/; npm test passes)
- [ ] T-022.5 One "leaving the layout" predicate shared by web/events.js and docsView.js (done when: the condition is written once; npm test passes)
- [ ] T-022.6 One stage list in web/, imported by eventDetail.js and projectSettings.js (done when: the list is written once in web/; npm test passes)
- [ ] T-022.7 marketingView.js (235 lines) on the size guard, with the campaign form handlers moved to campaignsPane.js (done when: structure test holds marketingView.js under 220 lines and passes)
- [ ] T-022.8 One comma-list helper: splitGames in rules.js is a fifth copy of the comma-split helper; fold them into one (done when: one helper, used by rules.js, contactsCli.js and the others; npm test passes)
- [ ] T-022.9 Split Board: it sits at its 220-line guard after EPIC-025 compressed it (done when: board.js is under 200 lines with its comments restored, a piece moved to its own module; structure test passes)
- [ ] T-022.10 One effort list: web/assignment.js keeps its own copy of the domain's EFFORTS (done when: npm test passes and grep finds the five effort names in one source file only)
- [ ] T-022.11 Contact pane shows Last active, as Design.md says: since T-030.9 nothing reads ContactBook's active fact (done when: The contact pane shows the newest reply or video date with a test, or Tabu drops the line from Design.md and the fact from ContactBook)
- [ ] T-022.12 The parked-and-relevant rule lives once: ContactBook #facts and contactFilter in contacts.js each write it (done when: One function in contacts.js answers nowRelevant and both callers use it; npm test passes)
- [ ] T-022.13 Split ContactBook: 278 lines, 22 under the 300-line mark, after EPIC-030 added covered games and the dead flag (done when: The festival methods live in their own class, the class diagram matches, npm test passes)
- [ ] T-022.14 One header sort and one arrow-key step for lists: contactColumns.js and gameColumns.js each hold clickSort and the ordering, marketingView.js nextContact and gameColumns.js nextGame the same step One module holds the sort click, the ordering with empty values last and the next-row step; the Contacts and Games lists use it; npm test passes
- [ ] T-022.15 The game lists live once in web/: gameFilters.js GM_STORES and gameLinks.js STORE_KINDS are the same list, beside the stage, scale and tracker lists One web module exports the store, tracker, stage and scale lists and the Games files import them; npm test passes
- [ ] T-022.16 One key=value reader in the CLI: contactsCli.js (contact set) and gamesCli.js (changesOf) each write the loop with its repeated-key refusal One function in cli/parse.js reads key=value words with the keys that may repeat; both commands use it; npm test passes
- [ ] T-022.17 Domain helpers once: gameEntries.js count and contactImport.js reachOf both read 12k and 1.2M, and line() is written in gameEntries.js and gameCatalog.js One count reader and one line() in the domain, used by contacts and games; npm test passes
- [ ] T-022.18 A covered game carries its entry key from the server: web/state.js entryKey repeats the rule of domain/gameEntries.js The contact's covered games come with key, contactCovered.js uses it, entryKey is gone from web/state.js; npm test passes
- [ ] T-022.19 A list registers its columns with the picker once: columnEvents.js imports every list's columns, a list left out half works, the task table builds its own header row, and COLUMNS and GM_COLUMNS have no reader A list hands its columns to the picker in one place, the shared module imports no list, headerRow serves the task table too, the two unread exports are gone; npm test passes with a test of columnEvents.js
- [ ] T-022.20 style.css is 310 lines against the 300-line rule, and the guard in test/web.test.js counts only .js The guard counts the page's CSS too and style.css is split under the line; npm test passes
- [ ] T-022.21 Column picker storage: its key prefix doit.columns.<list> is shared with resize.js pane widths, a tick does nothing with storage off, and each row reads the saved choice again The picker's keys cannot meet the pane widths' keys, a tick holds for the visit when storage is off, and a redraw reads the choice once per list; npm test passes
- [ ] T-022.22 profile set on a project with no Profile.md fails on its empty stage instead of saying add one first A new test runs profile set scale=indie on a project with a kind and no Profile.md and gets the add-one-first refusal; npm test passes
- [ ] T-022.23 Arrow keys in the Contacts list ignore the open Parked rows: with a parked row selected either arrow jumps to the top of the main list A new test selects a parked row with the section open and moves up and down through both lists; npm test passes
- [ ] T-022.24 Channel kinds and contact statuses are written in the domain and again in web/ with no parity test, and the kinds also in ContactBook PERSONAL and contactImport KIND_OF A test fails when a kind or status is in one list and not the other, and each further list says in a comment why it differs; npm test passes
- [ ] T-022.25 The iii alias for triple-i is written twice: contacts.js checkScales and profileShelf.js parseProfile The store reads a Scale line through checkScales; npm test passes
- [ ] T-022.26 Remove the one-off migrate-scale once Tabu confirms it has run: ContactBook.migrateScale, scaleNotes.js, the CLI command, its help and the apply switch Tabu has confirmed the migration ran on the real data, the five places are gone, Architecture.md and the class diagram follow; npm test passes
- [ ] T-022.27 Project page build order: an epic placed after an epic that is itself moved lands at the end of the list A new test with 030 after 031 and 031 after 029 gives 029 031 030; npm test passes
- [ ] T-022.28 A completed epic's page reads 0 of 0 tasks done and shows its checklist as checkboxes A completed epic's page shows its done count and task list from the epic file or the archive; a new test holds it; npm test passes
- [ ] T-022.29 Open file is missing on an epic page until the project's Docs tree has loaded Opening an epic in All projects with Docs off shows Open file; a new test holds it; npm test passes
- [ ] T-022.30 Epic page facts: an epic id inside a link or inline code is turned into a button, which breaks the markup A new test with a fact holding a link whose URL has an epic id, and one with an id in backticks, gives valid HTML; an id with no epic file opens nothing; npm test passes
- [ ] T-022.31 Epic page: a second section whose heading starts with Findings shows the first section's findings A new test with two Findings sections shows each one's own text; npm test passes
- [ ] T-022.32 The .chip rule in detail.css overrides the top bar's project chips and the Marketing tabs The Detail column's chip has its own class or scope, the top bar chips keep the border, padding and size style.css gives them, and Tabu has looked at both; npm test passes
- [ ] T-022.33 Project page rules live in web/: waiting, activeEpic, buildOrder and afterOf, and the page finds the Check in play task by its title while the domain reads the Test plan line The board view sends each epic's check task and the rules sit in the domain with their tests; the page only draws; npm test passes
- [ ] T-022.34 Detail column helpers once: the placeholder test (epicDoc.js and campaignBrief.js, already different), the template sentences (epicParts.js and store/markdown.js), isOpen three times, the progress bar three times, the docs tree request twice Each has one home and the others use it; npm test passes
- [ ] T-022.35 Detail column loose ends: findDoc lives in projectPage.js and the epic view imports it, S.pp and S.ppParkedOpen are missing from state.js, a finding's fold key can repeat, Board's port comment lacks check and after, and the Owner and Type toggles are not as wide as the dropdowns Each of the five is corrected, with a test for the fold key; npm test passes
- [ ] T-022.36 Close epic shows on a parked epic's page; Design.md says it is for open epics only A parked epic's page has no Close epic button, and a test holds it beside the completed case; npm test passes
- [ ] T-022.37 Is this epic open is written twice with two answers: epicIsOpen in task.js reads the folder and the Status, placeOf in epicMoves.js and the view split in board.js read the folder only One function answers it and all three use it; an epic left in Epics/ with Status Parked by hand is listed and hidden the same way; npm test passes
- [ ] T-022.38 Leave hidden tasks out is written four times: Board.view, and on the page dueSoonTasks, visible and waiting, because /api/board sends hidden tasks The page asks one helper for the tasks a list may show, and a test fails when a page list reads S.data.tasks past it; npm test passes
- [ ] T-022.39 Design.md names two things hiding changed and nobody decided: a hidden task of a parked epic no longer blocks a designer's task on the waiting list, and a document's Linked tasks leave hidden tasks out Tabu's answer to each is in Design.md, section Epics, with a test that holds it; npm test passes

## Test plan

## Notes

Decisions and deviations, newest first.

## Close audit

## For the standard
