# EPIC-028: Detail column

Status: Done
Closed: 2026-11-28
Goal: A project, an epic or a task opened in the Detail column can be judged in a few seconds: what it is for, how far it is, and what waits on the designer.
Design: Design.md, sections Projects, Epics, Tasks and Look (T-028.1 brings them up to date)

## Tasks

- [x] T-028.1 Design.md: the Detail column's project, epic and task pages (done when: Design.md sections Projects, Epics, Tasks and Look match the Specification of EPIC-028, and its Changelog has the line)
- [x] T-028.2 Colour tokens for select, You and Claude in a new detail.css (done when: style.test.js passes over every css file in web/ and finds the six new tokens in the light block and both dark blocks)
- [x] T-028.3 epicDoc.js: read an epic's text into header, findings and sections, old shapes too (done when: epicDoc.test.js passes on the new shape and on one fixture per old shape, and every line of each fixture is in the result)
- [x] T-028.4 Epic page: status and progress header, In short block and facts grid (done when: epicPage.test.js passes: status chip, progress text, both counts, In short, Why it exists and one grid row per fact, and an epic that has none of them shows none)
- [x] T-028.5 Epic page: findings folded, tasks table, test plan and folded end sections (done when: epicPage.test.js passes: one folded row per finding with the count line, an opened finding shows its detail, one table row per task, a batch grid, and each empty end section shows its note)
- [x] T-028.6 Task page: Properties box, every value a control, assignment greyed on a designer task (done when: taskProps.test.js and assignmentPane.test.js pass: every control renders for both owners, the three assignment controls are disabled and keep their stored values for owner human, and the doit set line names the task)
- [x] T-028.7 Owner chip on the task page, slate selected fill on every pane, story lines bold (done when: web.test.js and style.test.js pass with new tests: the owner chip carries its class for each owner, a description opening with As, I want, so that renders the three openers bold, and no selected rule in style.css fills with ink)
- [x] T-028.8 Project page: opens from the project's name; header, three cards, Waiting on you (done when: projectPage.test.js passes: the three cards and the waiting list hold the right counts for a fixture board, a task that an open task blocks is not waiting, the left pane renders the name as a button, and one selected project with nothing chosen shows its page)
- [x] T-028.9 An open epic carries the epic its Order line puts it after (done when: npm test passes with new tests: parseEpic reads after from an Order line and gives null without one, and the board view carries it on open and parked epics)
- [x] T-028.10 Project page: In short line, epics in build order, parked row, document links (done when: projectPage.test.js passes: build order for a fixture with two Order lines and an epic without tasks, the parked row folded and open, one link per document that exists, and In short read from the design doc)
- [x] T-028.11 doit epic add writes the new epic header: In short and Why it exists above Status (done when: npm test passes: a new epic's file opens with In short and Why it exists placeholder lines, a blank line, then Status and Design, and a campaign epic is written as today)
- [x] T-028.12 Closing an epic waits for its open Check in play task (done when: npm test passes with new tests: a close by CLI and by move is refused with the task named while the Check in play task is open, nothing is archived by the refused close, and it goes through once the task is done or the epic has no such line)
- [x] T-028.13 Check in play (done when: Every check in the description is confirmed in the running board, or its failure is a task in EPIC-028)
- [x] T-028.14 A sibling notes file is not listed as an epic (done when: npm test passes with a new test: a file EPIC-<nnn>-<name>.notes.md whose heading reads '# EPIC-<nnn>: <name>, notes' is in no epic list (doit epics, the board's epic cards, the project page), in Epics/, Parked/ and Completed/, and the epic's own file still is)
- [x] T-028.15 Epic page reads easily: facts as rows with inline code, paragraph and list spacing, one text size (done when: npm test passes and the Ghosts epic's page shows facts as rows with code styled, a blank line between paragraphs and list items, and code at body size)
- [x] T-028.16 Close audit: Architecture.md names taskProps.js and describes assignment.js, projectPage.js and epicView.js as they are (done when: The web line names taskProps.js, says assignment.js serves both owners, lists what the project page shows and that loadProjectPage fetches, and names Open file on the epic view)

## Specification

`Decided` covers the designer's six decisions, what the agreed wireframes show, and the fifteen open questions of the first draft, all answered as recommended on 2026-11-22. `Proposed` is a small reading of this draft that no question covered. Fourteen are left, each marked; the designer sees them in the Check in play task.

### Scope

- `Decided` Only the Detail column changes. The top bar, the left pane, the list column, the Claude view, Marketing and the Docs view keep their layout.
- `Decided` One thing in the left pane changes: a project's name becomes a button that opens the project page.
- `Decided` Documents keep their current format and open in the existing Docs view.
- `Decided` The wireframes fix layout, content and the colours under Colour. Type, corners, pane headers and the sheet stay Blueprint (Design.md, Look).
- `Decided` One colour changes outside the Detail column: the selected fill (Colour).

### Project page

- `Decided` A click on a project's name in the left pane shows the project page in the Detail column. Doit has no place to see a project today.
- `Decided` The click clears the selected task and the epic filter. Choosing a task or an epic replaces the page.
- `Decided` With one project selected in the top bar and nothing chosen, the Detail column shows that project's page in place of "Select a task." In All projects that line stays until a name is clicked.
- `Decided` Top to bottom: a header line (`PROJECT · <id> · <kind>` and a Settings button that opens the project's settings, as the gear does), the project's name, the In short block, three cards, Waiting on you, Epics, the Parked row, Documents.
- `Decided` In short block: the project's In short line.
- `Decided` The line is the first `In short:` line of the project's design doc (`Design/GameDesign.md`, else `Design/Design.md`), with an optional `Now testing:` line under it, as the wireframe shows.
- `Proposed` A project without the line gets a line saying where to write it.
- `Decided` Three cards. Active epic: its name, id and "n of m done". Waiting on you: the count of the designer's open tasks and the epics they are in, in the designer's warm colours. Planned next: the count of `Planned` epics, and "n parked".
- `Proposed` With no `Active` epic the first card reads "None active". An `Active` epic whose only open task is its Check in play task does not take the card.
- `Decided` Waiting on you: the designer's open tasks, one row each: id, bold title, a You chip. A row opens the task.
- `Decided` A designer task that an open task blocks is not waiting yet. This is how a Check in play task stays off the list until the build is done: the planner sets `blocks` on the last build task.
- `Decided` Epics in build order, one row each: id, name, status, a progress bar and "done/total", or "no tasks". A row opens the epic.
- `Decided` Build order: the `Active` epic first, then `Planned` epics, each after the epic its `Order: after EPIC-<nnn>` line names, by number where no line says otherwise, and epics without tasks last.
- `Decided` Parked epics are folded to one row that lists their names. Opened, it shows one row each.
- `Decided` Document links that open in the Docs view.
- `Decided` The links are the documents the standard names, where the project has them: the design doc, `Architecture.md`, `Playtest.md`, `UIRules.md`.

### Epic page

- `Decided` The pane header keeps `EPIC · <id> · <STATUS>`, Close epic on an open epic and Add contacts on a campaign. It gains Open file.
- `Decided` Open file shows the epic's file in the Docs view, where it can be edited.
- `Decided` Under the title: a status chip, a progress bar with "n of m tasks done", a count of tasks for Claude and a count for the designer.
- `Proposed` The two counts are of open tasks.
- `Decided` The designer's count adds "after .n" while an open task blocks it (the wireframe's "1 for you, after .15").
- `Decided` In short block: the In short sentence in larger type, the Why it exists line under it.
- `Decided` A facts grid, label then value: Design, Order, Source, related epics.
- `Decided` A campaign epic's `Goal:` line is its In short text, and its other brief lines show in the facts grid. Nothing in Marketing changes.
- `Proposed` Every other `Key: value` line of the header shows in the grid too, in file order. An epic id in a value opens that epic.
- `Decided` Findings under the heading "What changes" with a count line ("16 findings · 14 decided · 2 proposed"). One folded line each: number, kind tag, bold title, a Decided or Proposed chip. A click opens the labelled detail (Seen, Cause, Decided).
- `Proposed` All findings start folded. What is open stays open while the epic shows.
- `Decided` Tasks as a table: id, title, who (You or Claude), model and effort. The checklist is no longer shown as checkboxes.
- `Decided` A designer's row shows in the last column where it stands: the day it was done, or "after .n". A done row is muted.
- `Proposed` A row opens the task.
- `Decided` Test plan: each batch line of the template's form (`Batch A: T-<nnn>.1 to .4 (<modules>)`) as a row of batch, task range and modules, with the Performance and Close lines under it.
- `Decided` Notes, Close audit and For the standard are folded to one row each, with a note when empty ("none yet", "filled at close").
- `Decided` The Notes row shows what the section holds. Notes kept in a sibling file (`EPIC-<nnn>-<name>.notes.md`, a practice of one project and not of the standard) are out of this epic.
- `Decided` Such a notes file is never listed as an epic: not by `doit epics`, not as an epic card, not on the project page. It stays a document in the Docs tree (T-028.14).
- `Decided` The page has no Check in play section. The checks are a task (companion document, section 3).

### Task page

- `Decided` Doit's current task layout stays: id line, title, chips, properties box, Description, Done when, Comments. It is the same for both owners. Only the description text differs, and that is a writing rule.
- `Decided` The properties box shows every value as a control that can be changed:
  - State: a dropdown.
  - Owner (Me, Claude) and Type (Task, Bug): toggles as wide as the dropdowns, their two buttons equal halves.
  - Deadline: a date picker, and "Archive when passed".
  - Blocks: the task this one holds up.
  - Agent, Model and Effort: live when Claude owns the task. While the designer owns it they are greyed with "used when Claude owns it", and the stored values stay.
- `Decided` Created and Updated are read-only and marked "set by the board".
- `Decided` A line in the box says: "Change any value here. Claude changes the same fields with `doit set <project>/<T-id> key=value`."
- `Proposed` The rows the wireframe leaves out stay as today, shown when set and after Updated: Contact, Completed, Source, Archived.
- `Decided` Where the wireframe's controls differ from today's board, today's stay: State keeps its five options, Model stays free text with the four suggestions, Effort keeps `max`.
  Why: EPIC-027 decided Model is free text because model names change with each release, `max` is the level only the designer sets and this is the designer's control, and Archived is a state a task can hold.
- `Decided` "Archive when passed" keeps today's meaning, with no new field: it is ticked while a date is set, and unticking it clears the date. The date picker always shows.
- `Decided` The description renders as markdown, with Edit.
- `Proposed` A description that opens with the three story lines gets "As", "I want" and "so that" in bold. The stored text is not changed.
- `Decided` Comments keep the text box, its placeholder and a Comment button.

### Colour

- `Decided` No black for selected states or emphasis chips.
- `Decided` One muted slate blue, `#3D5677` with white text, for selected toggles, Decided chips, progress fills and the Comment button.
- `Decided` The designer and Claude are told apart by a warm chip and a cool chip with different marks. In light mode the wireframe's values: warm `#FCEFE3` with `#8F3F05`, cool `#E8EEFA` with `#1A449E`.
- `Decided` A Proposed chip is white with a dashed outline.
- `Decided` Dark mode: slate `#8FA9CC` with `#0b2545` text (6.4 to 1), warm `#4A2E14` with `#FFC89A` (8.3 to 1), cool `#1D3F73` with `#BBD4FF` (7.0 to 1). The ratios are computed, not seen on screen. Both dark chip fills sit close to the pane colour and may need an outline; check 5 of the Check in play task is where they are judged.
- `Decided` The marks stay 🧑 and 🤖, as on the list rows.
- `Decided` The selected fill outside the Detail column moves from ink to the slate blue too: the view buttons, the list's owner filter, the In progress pill and the open document in the tree.
  Why: two selected colours on one page read as two meanings. It is a colour swap with no layout change.
- `Proposed` Six tokens carry these colours, each defined for light and dark, in a new `web/detail.css`.
- The wireframe draws the project page's progress fills in black. The slate blue decision wins.

### Old formats

- `Decided` The board renders epics and descriptions written the old way without breaking. The fallback is plain markdown.
- `Proposed` No text of an epic file is hidden. What the page cannot place is shown as markdown, in file order.
- `Proposed` Per part:
  - No `In short:` line: the `Goal:` line is the In short text. Neither: the block is left out.
  - A placeholder value (`<...>`) reads as not written.
  - A Status line with words after the first: the chip shows the word, and the rest shows as a line under the header.
  - Free text in the header: shown as markdown under the facts grid.
  - A finding written as one paragraph: its folded line is its tag and bold title, its chip comes from the first `Decided:` or `Proposed:` in the text, and the paragraph shows when it is opened. A numbered section that has no bold titles shows as markdown.
  - A `## Check in play` section, and any section the page does not know (`Specification`, `Touches`, `Classes`): shown as markdown where it stands.
  - A Test plan line that is not a batch line: shown as markdown.
  - A description in any shape, a `For:` line included: rendered as markdown, as today.
- `Proposed` The markdown renderer learns one level of nesting, so a finding's labelled lines also read right in the Docs view. Today each nested line gets its own number (checked on 2026-11-22).

### Closing an epic

- `Decided` Closing an epic waits for its Check in play task. `doit epic close`, the Close epic button and a drag onto Completed or Archived are refused while that task is open, with a message that names the task.
  Why: the close archives every task of the epic, so an unchecked epic would leave the designer's waiting list at the close.
- `Proposed` The task is the one the Test plan's `Check in play: T-<nnn>.<n>` line names. An epic without that line closes as today.
- `Proposed` Once the task is done or archived it no longer holds the close.

### New epics

- `Decided` `doit epic add` and + New epic write the header the standard asks for: `In short:` and `Why it exists:` placeholder lines, a blank line, then `Status:` and `Design:`. The sections are Findings, Tasks, Test plan, Notes, Close audit and For the standard.
- `Decided` A campaign epic keeps its Game, Event and brief lines under Status, and gets no `In short:` line while it has a `Goal:` line.

## Test plan

- Batch A: T-028.1 to .5 (Design.md; web: detail.css, epicDoc, markdown, chips, epicPage, epicView): development
- Batch B: T-028.6 to .8 (web: taskProps, assignment, render, style.css, events, leftPane, projectPage): development
- Batch C: T-028.9 to .12 (store markdown, domain board and epicMoves; web: projectPage, epicPage): development
- Batch D: T-028.14 (store projectFiles): development
- Performance: none. The project page is built from data the page already holds, plus one document read.
- Check in play: T-028.13
- Close: Audit (`npm run test:audit`)

## Check in play

Moved to the planned task T-028.13, as decision 3 of the companion document asks. This conflicts with Doit's current copy of the template (`Docs/Standard/Core/01-Tasks.md`), which still has this section. Until the rule lands and Doit pulls it, the section stays with this one line. After that it is deleted.

## Notes

Decisions and deviations, newest first.

- 2026-11-22: T-028.14 added on the designer's word ("this should not be an epic in the epic list"). Box Trainer's `EPIC-144-player-objectives.notes.md` showed as a second EPIC-144 card, "Player objectives, notes" 0/0, because its heading has the form of an epic title. It blocks T-028.13. Built the same day (7b4c09f): `epicFiles` passes over names ending in `.notes.md`. Development 412 of 412. The new test reads the board view only; the CLI and the project page read the same `epicFiles` and have no test of their own for this. `doit epics box-trainer` shows one EPIC-144 row.
- 2026-11-22: Build of T-028.1 to .12 done. Batches A 392 of 392, B 401 of 401, C 411 of 411 (development); Audit 412 of 412. A smoke look at the running board (project page, epic page, a task page) showed no console errors. T-028.13 waits on the designer. A stray `doit epic close doit EPIC-028 --dry-run` by the coordinator was refused by T-028.12's rule ("EPIC-028 waits for T-028.13"), so nothing was archived.
- 2026-11-22: Readings the builders took where the Specification was silent, for T-028.13 to judge:
  - T-028.12: a Check in play task the board cannot find (archived or gone) does not hold the close.
  - T-028.11: `## Findings` is written into campaign epics too.
  - T-028.10: Open file shows only once the Docs tree is loaded and holds the epic's file. `S.pp` and `S.ppParkedOpen` are created lazily, not declared in web/state.js. `test/helpers.js` fixtures (T-028.9) gained `Order:` lines.
  - T-028.8: the Active card skips an epic whose only open task is titled "Check in play" (a title match, not the Test plan's `check` line, which came later in T-028.12). `test/docsBoard.test.js` regex changed for the name button.
  - T-028.7: the story openers match case-insensitively; one CSS line was added to detail.css for the Comment button (it had no rule).
  - T-028.6: "Archive when passed" keeps today's handler: ticking with no date sets one 7 days out. The "Change any value here" line sits above the box.
  - T-028.5: opened findings stay open per epic across visits (`S.epicOpen` keyed by epic id), not only while the epic shows. An empty end section cannot be opened. Code split into web/epicParts.js.
  - T-028.4: "done" counts done and archived tasks.
  - T-028.3: a whole placeholder value reads as null; Status takes the first word ("In progress" shows "In" with "progress" under it); an old `Why:` key goes to the facts grid; old findings with no Decided or Proposed marker get no chip.
  - T-028.1: Design.md does not mark Decided and Proposed per item; its Changelog points to this Specification. "The existing Docs view" is written as "opens as a document (section Docs)", since documents open on the Board since EPIC-021.
- 2026-11-22: Added from the draft of 2026-11-22 (ClaudeStandards, Docs/Requirements/doit-detail-column.md). Its "Before this is added from a Doit session" section, its line saying it is not on the board, and Planned tasks are left out: the first two were instructions for this step, the third became the tasks under Tasks.

## Close audit

Closed 2026-11-28. Development (495) and Audit (496) tests pass on main. Read: the fourteen task commits against `Architecture.md`, `Core/03-Design.md`, `App/README.md` and `Design.md`, then every touched file whole at HEAD. No forbidden import, `web/` only talks HTTP, no event carries a live object, and the class diagram needs no change (the epic added no class or public method in `src/`). Four of the bugs below were reproduced on made-up data; none was checked in a browser.

Fix now (T-028.16, docs only):

- `Docs/Architecture.md`, the `web/` line: `taskProps.js` was not named; `assignment.js` was described as only for a Claude task while it serves both owners; `projectPage.js` was called pure and lacked the In short line, the build order, the parked row and the document links, while `loadProjectPage` fetches and writes page state; `epicView.js` lacked Open file. Corrected.

Fix before release (EPIC-022), bugs:

- `web/projectPage.js` (`buildOrder`): an epic placed after an epic that is itself moved lands at the end. T-022.27.
- `web/epicPage.js`: a completed epic's page reads 0 of 0 tasks done and shows its checklist as checkboxes, since the close archives the tasks and the page counts from the board's tasks. T-022.28.
- `web/epicView.js`: Open file is missing until the project's Docs tree has loaded. T-022.29.
- `web/epicPage.js` (`factValue`): an epic id inside a link or inline code becomes a button and breaks the markup. T-022.30.
- `web/epicPage.js`, `web/epicDoc.js`: a second section whose heading starts with Findings shows the first one's findings. T-022.31.
- `web/detail.css`: its `.chip` rule overrides the top bar's project chips and the Marketing tabs. T-022.32.

Fix before release (EPIC-022), drift:

- `web/projectPage.js`, `web/epicPage.js`: `waiting`, `activeEpic`, `buildOrder` and `afterOf` are board rules in a view, and the page finds the Check in play task by title while the domain reads the Test plan line. T-022.33.
- The placeholder test, the template sentences, `isOpen`, the progress bar and the docs tree request are each written two or three times. T-022.34.
- `findDoc` in `projectPage.js`, `S.pp` outside `state.js`, a fold key that can repeat, `Board`'s port comment, the toggle width. T-022.35.

Deliberate, both already written down, so no Departures row:

- `web/epicDoc.js` is a parser in the interface tier and a second reader of the epic header beside `parseEpic` in the store. `Architecture.md` names it as a pure web module with its own tests.
- `web/detail.css` holds the six Detail column tokens in a second file. `Design.md`, section Look, says so and `test/style.test.js` pins it.

## For the standard

The rule changes that go with this epic are specified in `standard-readable-board-pages.md` (ClaudeStandards, `Docs/Requirements/`). They have not landed: Tabu decided on 2026-11-28 to close the epic first and land them in a session of their own in ClaudeStandards, where the four items still marked Proposed are put to Tabu. The reason they were tied to this close, that the board must draw the new shapes first, is met. Nothing else from the close.
