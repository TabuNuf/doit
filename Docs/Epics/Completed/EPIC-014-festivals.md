# EPIC-014: Festivals

Status: Done
Closed: 2026-11-21
Goal: Tabu sees the festivals, events and conferences that fit each game, with their deadlines, and never the ones that do not.
Design: Design.md, section Marketing (step 4)

## Scope

- Decided: festivals and conferences are contacts of those types, with event fields: event dates, application deadline, cost, where (Steam, Epic, GOG, itch, physical, online), criteria (genres, required stage such as a demo or unreleased game, platforms) and a watching state (watching, applied, accepted, declined, past).
- Decided: a festival shows for a game only when its criteria match the game's profile: genre overlap, the game's stage allowed, the platform offered. A festival with no criteria shows for every game, marked "criteria unknown".
- Decided: a past festival is not deleted; it moves to past and is kept for next year's edition.
- Decided: events are gathered by a scheduled Claude task, not code in the app: it reads the Steam, Epic, GOG and itch event pages and howtomarketagame.com/festivals and adds or updates festivals through the CLI.
- Decided: conferences carry a topic (game dev, podcast, design), so Hidden by Design gets its own events.
- Proposed: the gathering run is weekly, Monday 07:00, beside the morning run.

## Tasks

- [x] T-014.1 Architecture and design: event fields and the matching rule in the class diagram and Design.md (done when: Architecture.md lists `EventMatch` and its tests' names)
- [x] T-014.2 Domain: event fields on a contact and `EventMatch`, pure: profile and festival in, match or the reason it fails (done when: domain tests match on genre, refuse on stage and platform, and mark a festival without criteria)
- [x] T-014.3 Store: the event fields in `marketing.db` with a `user_version` migration from version 2, EPIC-013's schema (done when: a test opens a version 2 database, migrates it and reads an event back)
- [x] T-014.4 CLI: `doit festivals [--fits <game>] [--deadline-within <days>] [--json]`, `doit festival upsert` (by name and year, so a rerun updates instead of duplicating), `doit festival set <id> state=<state>` (done when: CLI tests cover each command and an upsert twice gives one festival)
- [x] T-014.7 Marketing tabs: in the Marketing view the project chips and Projects menu give way to Marketing's own tabs (Contacts, Drafts, then Festivals) (done when: web tests render the Marketing top bar with Contacts, Drafts and Festivals tabs and no project chips; the Board, Docs and Claude views still show the projects)
- [x] T-014.5 Server and web: a Festivals pane in the Marketing view: per game, matching events by deadline, with days left, cost and state; a click opens the festival as a contact (done when: web tests render the pane from a fixture; in the app a festival past its deadline is not in the list)
- [x] T-014.6 Gathering run: `launcher/festivals-run.md`, the scheduled task's prompt: which sources, how to read criteria, `festival upsert` per event, a summary line in the activity log (done when: one run by hand adds the Steam events of the next three months and the log shows the summary)

## Test plan

- Batch A: T-014.1 to .4 (docs, domain, store, cli): development
- Batch B: T-014.7, T-014.5, T-014.6 (web, server, launcher): development; T-014.7 comes first because the Festivals pane is one of its tabs
- Performance: none

## Check in play

- T-014.7: open Marketing, see Contacts, Drafts and Festivals where the projects were; Board still shows the projects.
- T-014.5: open Festivals, pick a game, see only matching events by deadline.
- T-014.6: run the gathering prompt by hand and see the new events in the pane.
- Unchecked in play (Speed mode): the look of the Marketing tabs and the Festivals pane was not opened in a browser; tests render both.

## Notes

Decisions and deviations, newest first.

- T-014.6: run by hand 2026-11-21 for Steam only (partner.steamgames.com upcoming events, next three months): 7 festivals added, a rerun updated instead of adding, the summary line is in the activity log. Epic, GOG, itch and howtomarketagame were not read in this run. Next Fest's cost was set to "free", which the page does not state. No game profiles exist yet in Polyspice Marketing, so `--fits` and the pane's game picker have nothing to match in the app; matching is covered by tests.
- T-014.6: added `doit log <name> <text>` (not in the plan): no command wrote a plain activity-log line, so the run's summary needed one. `ClaudeView.note` writes it under a name that is not a task. The prompt is written and tested, not yet run by hand with web access; the task stays todo for that.
- T-014.5: the route is added to `HttpServer`'s route list beside `contactRoutes` (one line in `server.js`), not in `root.js`, since the server builds its routes. `ContactBook.festivals` got an `open` option so a list without a game also leaves out events past their deadline.
- T-014.4: added `doit festivals --state <s>` (not in the plan): festivals in state `past` are hidden by default and this is how to list them. `--fits` also drops events past their deadline. `festival upsert` takes `--url` (a website channel) so the gathering run can keep the source link.
- T-014.2: an event is stored per contact as `event` (null for other contacts); the table column for `where` is `place`, since `where` is an SQL keyword.

- T-014.7 added 2026-11-21 from design input (Design.md, Marketing); worked before T-014.5. T-014.3 now migrates from version 2, since EPIC-013 moved `marketing.db` there.

- Open: whether Tabu has paid access to the howtomarketagame.com festival list; the run reads only what is public otherwise.

## Close audit

Diff `main...epic/014-festivals` read against Architecture.md, Core/03-Design.md and App/README.md. Development and Audit tests: 214 pass.

- Fix now: none. The domain (`events.js`, `eventMatch.js`, `ContactBook`) imports nothing from store, server or page; the class diagram lists `EventMatch`, `FestivalsCli`, `FestivalRoutes` and the new `ContactBook` and `ClaudeView` methods; no file over 300 lines (`contactBook.js` 182, `cli.js` 230).
- Fix before release: none.
- Deliberate: `ContactBook` creates its `EventMatch` itself instead of taking it from the root. It is a pure rule with no port, like the other domain helpers it imports, so no question for Tabu.
- Known limit, by design: an event with no deadline stays listed after its end date until a run (or Tabu) sets it to `past`.

## For the standard

- `Core/02-Working.md`, Claude setup: scheduled runs keep their prompt in the repo, use only the CLI with exact flags, log one summary line, and a test runs the commands the prompt names.
