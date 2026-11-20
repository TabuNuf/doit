# EPIC-014: Festivals

Status: Planned
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

- [ ] T-014.1 Architecture and design: event fields and the matching rule in the class diagram and Design.md (done when: Architecture.md lists `EventMatch` and its tests' names)
- [ ] T-014.2 Domain: event fields on a contact and `EventMatch`, pure: profile and festival in, match or the reason it fails (done when: domain tests match on genre, refuse on stage and platform, and mark a festival without criteria)
- [ ] T-014.3 Store: the event fields in `marketing.db` with a `user_version` migration from EPIC-012's schema (done when: a test opens an EPIC-012 database, migrates it and reads an event back)
- [ ] T-014.4 CLI: `doit festivals [--fits <game>] [--deadline-within <days>] [--json]`, `doit festival upsert` (by name and year, so a rerun updates instead of duplicating), `doit festival set <id> state=<state>` (done when: CLI tests cover each command and an upsert twice gives one festival)
- [ ] T-014.5 Server and web: a Festivals pane in the Marketing view: per game, matching events by deadline, with days left, cost and state; a click opens the festival as a contact (done when: web tests render the pane from a fixture; in the app a festival past its deadline is not in the list)
- [ ] T-014.6 Gathering run: `launcher/festivals-run.md`, the scheduled task's prompt: which sources, how to read criteria, `festival upsert` per event, a summary line in the activity log (done when: one run by hand adds the Steam events of the next three months and the log shows the summary)

## Test plan

- Batch A: T-014.1 to .4 (docs, domain, store, cli): development
- Batch B: T-014.5 to .6 (server, web, launcher): development
- Performance: none

## Check in play

- T-014.5: open Festivals, pick a game, see only matching events by deadline.
- T-014.6: run the gathering prompt by hand and see the new events in the pane.

## Notes

Decisions and deviations, newest first.

- Open: whether Tabu has paid access to the howtomarketagame.com festival list; the run reads only what is public otherwise.

## Close audit

## For the standard
