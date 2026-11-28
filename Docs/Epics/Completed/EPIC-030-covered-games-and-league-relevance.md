# EPIC-030: Covered games and league relevance

In short: a contact's covered games decide relevance beside fit and scale, and Tabu's games get their scale.
Why it exists: Tabu (2026-11-26): scale alone must not decide fit; creators who play games in the same league as ours are a fit too, shown by a list with sources.

Status: Done
Closed: 2026-11-28
Design: Design.md, section Marketing (covered games, why relevant)

## Findings

## Tasks

- [x] T-030.1 Design, architecture and class diagram for covered games (done when: Docs list the games table, the rule and the constant)
- [x] T-030.2 Covered games: domain, store and v7 migration (done when: Tests: round trip, update by title, migration keeps data)
- [x] T-030.3 Relevance by covered games and now-relevant list (done when: Tests: 2 games no, 3 games yes, scale mismatch no, now-relevant lists parked only)
- [x] T-030.4 CLI, routes and help for covered games (done when: Tests on CLI and routes)
- [x] T-030.5 Board: covered games block (done when: Pure-function tests pass)
- [x] T-030.6 Check in play: covered games on the board (done when: Tabu confirms)
- [x] T-030.7 Dead flag on a channel (done when: Tests: syntax, round trip, v7 file migrates, pane greys it)
- [x] T-030.8 Several channel= keys in one contact set (done when: Test: three channel= keys all land; a repeated key writes nothing)
- [x] T-030.9 Contacts list: Next contact column replaces Last active (done when: Tests pass)
- [x] T-030.10 Close audit: Architecture.md and Design.md follow the code (done when: Architecture.md names the dead flag on a channel, the games table, the contact game commands, the games routes, contactCovered.js and ContactBook.setChannel in the class diagram; Design.md describes the dead flag and repeated channel= with a Changelog line; npm test passes)

## Test plan

Batch 1 (T-030.2 to T-030.5): Development tests. Covered game round trip and update by title; v6 file migrates to v7 keeping data; 2 games not relevant, 3 are; scale mismatch not counted; --relevant shows why; --now-relevant lists parked only; entry without date or source refused; board block.
Check in play: T-030.6

## Notes

Decisions and deviations, newest first.

- 2026-11-26: built by the session itself, in one commit for T-030.2 to T-030.5. A covered game needs a date and an http(s) source URL or it is refused. Genre overlap only ranks `campaign suggest` (within the picked contacts) and names the games; `pickContacts` still needs a fit. `--now-relevant` lists any parked contact that is relevant; nothing is unparked.

## Close audit

Closed 2026-11-28. Development (493) and Audit (494) tests pass on main. Read: the five task commits (`cb9d939`, `4486aef`, `a43e6c0`, `e748bf1`, `0de6028`) against `Architecture.md`, `Design.md` and `Core/03-Design.md`. No boundary rule is broken and no event carries a live object.

Fix now (T-030.10, docs only):

- `Docs/Architecture.md`, class diagram: `ContactBook` lacked `setChannel(id, channel)`, the method the dead flag runs through. Rule: the class diagram matches the code. Added.
- `Docs/Architecture.md`, module lines: T-030.7 to T-030.9 were built without their doc step. The channel shape lacked `dead`, `SqliteContacts` lacked the `games` table, `ContactsCli` lacked `contact game`, `--now-relevant` and the repeated `channel=`, `contactRoutes` lacked the games routes, the web list lacked `contactCovered.js`, and two lines gave `user_version` as 4 and 5 while the code is at 9. Corrected; the version numbers are gone from the text.
- `Docs/Design/Design.md`, Per-channel facts: the dead flag and the repeated `channel=` were in the code and the CLI help but not in the design. Rule: design input updates the design doc and its Changelog. Added, with a Changelog line.

Fix before release (EPIC-022):

- `web/contactDetail.js`: `Design.md` says Last active is in the contact pane, but since T-030.9 removed the column nothing reads `ContactBook`'s `active` fact. T-022.11.
- `src/domain/contactBook.js` (`#facts`) and `src/domain/contacts.js` (`contactFilter`): the parked-and-relevant rule is written twice. T-022.12.
- `src/domain/contactBook.js`: 278 lines, 22 under the 300-line mark, about 30 of them from this epic. T-022.13.

Deliberate: none.

## For the standard

`Core/03-Design.md`, Code: a document names what the code holds, never its current number (a schema version, a migration list, a line count). From the two stale `user_version` lines above.
