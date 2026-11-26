# EPIC-030: Covered games and league relevance

In short: a contact's covered games decide relevance beside fit and scale, and Tabu's games get their scale.
Why it exists: Tabu (2026-11-26): scale alone must not decide fit; creators who play games in the same league as ours are a fit too, shown by a list with sources.

Status: Active
Design: Design.md, section Marketing (covered games, why relevant)

## Findings

## Tasks

- [x] T-030.1 Design, architecture and class diagram for covered games (done when: Docs list the games table, the rule and the constant)
- [x] T-030.2 Covered games: domain, store and v7 migration (done when: Tests: round trip, update by title, migration keeps data)
- [x] T-030.3 Relevance by covered games and now-relevant list (done when: Tests: 2 games no, 3 games yes, scale mismatch no, now-relevant lists parked only)
- [x] T-030.4 CLI, routes and help for covered games (done when: Tests on CLI and routes)
- [x] T-030.5 Board: covered games block (done when: Pure-function tests pass)
- [ ] T-030.6 Check in play: covered games on the board (done when: Tabu confirms)

## Test plan

Batch 1 (T-030.2 to T-030.5): Development tests. Covered game round trip and update by title; v6 file migrates to v7 keeping data; 2 games not relevant, 3 are; scale mismatch not counted; --relevant shows why; --now-relevant lists parked only; entry without date or source refused; board block.
Check in play: T-030.6

## Notes

Decisions and deviations, newest first.

- 2026-11-26: built by the session itself, in one commit for T-030.2 to T-030.5. A covered game needs a date and an http(s) source URL or it is refused. Genre overlap only ranks `campaign suggest` (within the picked contacts) and names the games; `pickContacts` still needs a fit. `--now-relevant` lists any parked contact that is relevant; nothing is unparked.

## Close audit

Not closed: T-030.6 (Check in play) waits for Tabu. Audit tests green 2026-11-26.

## For the standard
