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

## Test plan

## Notes

Decisions and deviations, newest first.

## Close audit

## For the standard
