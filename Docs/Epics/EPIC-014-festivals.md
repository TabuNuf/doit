# EPIC-014: Festivals

Status: Active
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
- [ ] T-014.5 Server and web: a Festivals pane in the Marketing view: per game, matching events by deadline, with days left, cost and state; a click opens the festival as a contact (done when: web tests render the pane from a fixture; in the app a festival past its deadline is not in the list)
- [ ] T-014.6 Gathering run: `launcher/festivals-run.md`, the scheduled task's prompt: which sources, how to read criteria, `festival upsert` per event, a summary line in the activity log (done when: one run by hand adds the Steam events of the next three months and the log shows the summary)

## Test plan

- Batch A: T-014.1 to .4 (docs, domain, store, cli): development
- Batch B: T-014.7, T-014.5, T-014.6 (web, server, launcher): development; T-014.7 comes first because the Festivals pane is one of its tabs
- Performance: none

## Check in play

- T-014.7: open Marketing, see Contacts, Drafts and Festivals where the projects were; Board still shows the projects.
- T-014.5: open Festivals, pick a game, see only matching events by deadline.
- T-014.6: run the gathering prompt by hand and see the new events in the pane.

## Notes

Decisions and deviations, newest first.

- T-014.4: added `doit festivals --state <s>` (not in the plan): festivals in state `past` are hidden by default and this is how to list them. `--fits` also drops events past their deadline. `festival upsert` takes `--url` (a website channel) so the gathering run can keep the source link.
- T-014.2: an event is stored per contact as `event` (null for other contacts); the table column for `where` is `place`, since `where` is an SQL keyword.

- T-014.7 added 2026-11-21 from design input (Design.md, Marketing); worked before T-014.5. T-014.3 now migrates from version 2, since EPIC-013 moved `marketing.db` there.

- Open: whether Tabu has paid access to the howtomarketagame.com festival list; the run reads only what is public otherwise.

## Close audit

## For the standard
