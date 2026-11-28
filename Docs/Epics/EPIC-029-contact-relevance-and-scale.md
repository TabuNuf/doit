# EPIC-029: Contact relevance and scale

In short: influencer contacts carry the fields the research routine needs, and contacts that suit none of Tabu's games sit in a parked list.
Why it exists: the first research run (contact 50, 2026-11-26) stuffed scale, check date and Reddit into `notes`, and every contact stays in the outreach pool. Quality over quantity: only creators that suit a game get worked.

Status: Active
Design: Design.md, section Marketing (scale labels, relevant, parked, per-channel facts)

## Findings

- Today all 268 contacts are active and none has a fit, so the relevance rule would park every influencer until fits exist. Nothing is parked automatically; the report command lists who would be.
- `pickContacts` already takes only active contacts, so parked ones are skipped without a change there; a test pins it.
- There is no `profile set` command; profiles are saved by the project settings page. The command is new.

## Tasks

- [x] T-029.1 Architecture and class diagram for scale and parked (done when: Architecture.md lists scales, channel facts, relevance and parked; diagram updated)
- [x] T-029.2 Scale vocabulary and new contact fields (done when: Tests: a contact round trips the fields; bad scale refused; old db opens with empty values)
- [x] T-029.3 Channel kinds and per-channel followers and last-active (done when: Tests: old channel rows survive the migration; new kinds accepted; syntax parsed; unknown host stays website)
- [x] T-029.4 Game profile scale and profile set (done when: Tests: scale parsed and saved; page save keeps an existing scale; profile set works)
- [x] T-029.5 Relevance rule and parked status (done when: Tests: fit only, scale overlap, both empty; filters; campaign picking skips parked)
- [x] T-029.6 CLI: filters, show, set and help text (done when: Tests on the CLI output; doit help documents every new flag and key)
- [x] T-029.7 API routes for the new fields (done when: Route tests pass)
- [x] T-029.8 Indie fit migration and relevance report (done when: Tests: dry run changes nothing; apply sets the fields and keeps other notes)
- [x] T-029.9 Board: parked section, scale and channel fields (done when: Pure-function tests pass)
- [x] T-029.10 Check in play: parked section and contact pane (done when: Tabu confirms the board)
- [x] T-029.11 The mail sweep files a reply from a parked contact: Mailroom lists contacts without parked ones since T-029 (done when: A new test parks a contact, puts its reply in the inbox and sees it logged and moved; npm test passes)
- [x] T-029.12 Close audit: Architecture.md names what EPIC-029 added to the CLI, the routes, the store, the profile shelf, the import and the page (done when: The ContactsCli, contactRoutes, SqliteContacts, ProfileShelf, ContactBook, contacts.js, contactImport and web lines name the commands, filters, fields and blocks the code has)

## Test plan

Batch 1 (T-029.2 to T-029.4): Development tests. Scale vocabulary and aliases; new contact fields round trip; channel kinds; `kind=url|followers|date` parsing; the v6 migration keeps old channel rows; importer still falls back to website.
Batch 2 (T-029.5 to T-029.7): Development tests. Relevance (fit only, scale overlap, both empty, profile scale empty); `--relevant`, `--irrelevant`, `--parked`, `--scale`, parked `--due`; default list hides parked; `campaign contacts`, `campaign suggest` and `outreach` skip parked; `profile set`.
Batch 3 (T-029.8 to T-029.9): Development tests. The Indie fit migration (dry run, apply, other notes kept); board pure functions for the parked section and channel fields.
Check in play: T-029.10

## Notes

Decisions and deviations, newest first.

- 2026-11-26: built in a worktree branch, not on main, because the main checkout held unrelated uncommitted changes. A third epic was `Active` beside 026 and 028, on Tabu's request. T-029.2 to T-029.8 went in one commit and were built by the session itself, not `batch-builder`, since it already held the sources.
- Default listing: parked contacts are hidden unless `--parked`, `--all` or `--status`. `--irrelevant` is added beside `--relevant`; it is the read-only report of who would be parked.
- Channel syntax `kind=url|followers|date`; `channel=` on `contact set` adds or updates one channel by url without replacing the list. JSON field is `scaleNote`, CLI key `scale_note`.
- `profile set` works on projects only; a profile kept as a file in the marketing project's `Profiles/` folder is read but not written by it.
- Parked contacts use `next` as the review date and show as due on it (`isDue` now covers active and parked).

## Close audit

Closed 2026-11-28. Development (495) and Audit (496) tests pass on main. Read: the three task commits (`738295b`, `44e1eee`, `38c9704`) against `Architecture.md`, `Core/03-Design.md`, `App/README.md` and `Design.md`, section Marketing, each finding confirmed at HEAD. No guard test fails, no tier imports a forbidden one, and no event carries a live object.

Fix now:

- `src/domain/mailroom.js` (bug, T-029.11): since this epic a contact list without a status leaves parked contacts out, and the mail sweep called it that way, so a reply from a parked contact was not searched for, logged or moved. Fixed with a test.
- `Docs/Architecture.md` (T-029.12): the module lines lacked what the epic added. `ContactsCli`: `profile add|set`, `contacts migrate-scale`, `--scale`, `--irrelevant`, `--parked`, `--all`. `contactRoutes`: the five new filters and four new fields. `SqliteContacts`: the four new columns. `ProfileShelf`: Scale. `ContactBook`: `setChannel`, `setProfile`, `migrateScale`, `relevant`. `contacts.js`: `countLabel`. `contactImport.js`: `reachOf`, `channelKind`, five more channel columns. The page: the Parked section, `parkedPath`, the followers and last-active inputs, the four new fields. Corrected.

Fix before release (EPIC-022):

- `src/cli/contactsCli.js`: it imports `reachOf` from the import mapper, past the `ContactBook` facade. By the Layers table this is a boundary break and so a fix-now; it is carried by T-022.17 instead, because the fix is that task's change (one count reader in `contacts.js`, the sheet bucket left in the mapper). Its unused imports go with it.
- `src/domain/contactBook.js` (bug): `profile set` on a project with no Profile.md fails on its empty stage instead of saying to add one. T-022.22.
- `web/marketingView.js` (bug): the arrow keys ignore the open Parked rows. T-022.23.
- `src/domain/contacts.js`, `web/contactChannels.js`, `web/contactDetail.js`, `src/domain/contactBook.js`, `src/domain/contactImport.js`: channel kinds and statuses are listed in several places with no parity test. T-022.24.
- `src/domain/contacts.js`, `src/store/profileShelf.js`: the `iii` alias is written twice. T-022.25.
- `ContactBook.migrateScale`, `scaleNotes.js`, the CLI command and its help: a one-off kept as standing surface. T-022.26, which waits for Tabu's word that the migration has run.
- Comments on T-022.12 (the event-is-never-relevant rule is written in the same two places), T-022.16 (the key lists are written three and four times) and T-022.17 (two writers of a short count).

Left as it is: `profile set` re-checks the whole stored profile, so a Profile.md with a free-text Release line refuses any change until the line is a date. The message names the line.

Deliberate: none.

## For the standard

`Core/03-Design.md`, Code: a task that narrows what a query returns by default reads every caller of that query. From T-029.11.
