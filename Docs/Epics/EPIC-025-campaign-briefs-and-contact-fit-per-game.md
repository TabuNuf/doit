# EPIC-025: Campaign briefs and contact fit per game

Status: Active
Goal: a campaign says what it is for and what it must achieve, suggests who to contact, and Claude can create and fill one; each contact shows which games it fits and was contacted about.
Design: Design.md, section Marketing (Contacts, Campaigns, The Marketing top bar)
Source: Tabu's recording 2026-11-21 (Bandicam_20261121_183943), 4:38

## Tasks

- [x] T-025.1 Remove a fit: store, book, route and CLI (done when: a test removes a fit through ContactBook and DELETE /api/contacts/:id/fit/:game; doit fit <id> <game> --remove prints the contact without it)
- [x] T-025.2 Contacts filter by contacted-about, not-contacted-about and no-about (done when: contactFilter tests: contacted=g keeps contacts with a touch for g, notContacted=g those without, noAbout those with empty about; doit contacts --contacted/--not-contacted/--no-about and GET /api/contacts?contacted=&notContacted=&noAbout=1 pass them)
- [x] T-025.3 Contacts tab filters: Fits and Contacted, replacing the top-bar pick (done when: the filter pane has Fits (Any, each profile) and Contacted (Any, About <game> per profile, Not yet about <game> per profile) selects; contactPath sends fits/contacted/notContacted; Clear filters clears them; web tests for contactPath and filterPane pass)
- [x] T-025.4 Contact pane: one block per game with fit, last contact and Remove; + Fit form (done when: detailPane shows a block per game the contact fits or has a touch for (name, fit reason or 'no fit', 'contacted <date>' or 'not contacted yet', Remove on a fit); + Fit opens a form (game select, reason) that posts to /api/contacts/:id/fit; Remove sends DELETE; web tests pass)
- [x] T-025.5 Campaign brief: header lines parsed, written and exposed on the board (done when: markdown tests: parseEpic reads Occasion, Goal (not the <placeholder>), Change, Measure, Audience, Message, Ask, Channels, Starts, Ends, Budget from the header; setHeader(text, key, value) adds, replaces or removes one line; board view epics carry brief; Board.setEpicHeader(project, epicId, key, value) writes it and logs activity)
- [x] T-025.6 Campaign CLI: add with brief flags, set, show, suggest (done when: tests: doit campaign add with --occasion --goal etc writes the lines; campaign set <p> <EPIC> measure=... and game=a,b change them (games checked against profiles); campaign show prints brief, games, event, done/total; campaign suggest prints contacts (id, name, reach, fit reason, last contacted about the game) and fitting open festivals)
- [x] T-025.7 Campaign routes: brief edit, suggestions, add one contact (done when: server tests: PATCH /api/campaigns/:project/:epic with brief keys saves them (400 on a bad value); GET /api/campaigns/:project/:epic/suggest returns {contacts, festivals}; POST /api/campaigns takes occasion; POST .../contact adds one Reach out task)
- [ ] T-025.8 Marketing top bar without the game picker; Festivals and Events get a game filter (done when: the top bar shows only the tabs; the Festivals and Events left pane has a Fits select that filters the list; Overview shows every game; each festival and event pane has + Campaign around this; web tests updated)
- [ ] T-025.9 Campaigns tab: list, editable brief with suggestions, contact pane; fixed form (done when: left pane lists campaigns (open first) with + Campaign; a selected campaign shows its brief as editable fields saved via PATCH, Open on Board, Add contacts, and Suggestions (contacts with fit reason and last contacted, Add per row, a row opens the contact pane; fitting festivals and events); the + Campaign form shows each project checkbox on one line with its label; web tests pass)
- [ ] T-025.10 Docs: Claude's playbook for contact research and campaign filling (done when: Design.md Marketing (or Docs/Design/Marketing-Claude.md) lists the CLI steps Claude follows to research a batch of contacts and to create and fill a campaign from a release or an event; doit help shows every new command; Architecture.md current)

## Test plan

- Batch A: T-025.1 to .4 (contacts: store, book, routes, CLI, contact pane, filters): development
- Batch B: T-025.5 to .7 (campaign brief: markdown store, board, outreach, CLI, routes): development
- Batch C: T-025.8 to .10 (Marketing page: top bar, festivals, campaigns tab; docs): development
- Performance: none

## Check in play

- T-025.3: Contacts tab, Fits and Contacted filters narrow the list.
- T-025.4: a contact's Games block, + Fit and Remove.
- T-025.8: no dropdown in the top bar; Festivals and Events filter by game; + Campaign around this.
- T-025.9: Campaigns tab: + Campaign form layout, editing a brief, Suggestions with Add.

## Notes

Decisions and deviations, newest first.

## Close audit

## For the standard
