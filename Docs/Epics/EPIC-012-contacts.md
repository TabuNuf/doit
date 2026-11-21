# EPIC-012: Contacts

Status: Active
Goal: Every marketing contact lives in Doit, filtered by the game it fits, with its history, so Tabu can see who to contact next and Claude can research and link contacts through the CLI.
Design: Design.md, section Marketing (steps 1 and 2)

## Scope

- Decided: contacts are stored in SQLite, `marketing.db` in the app's data folder, through Node's built-in `node:sqlite`. Tables: contacts, channels, fit, touches.
- Decided: a contact has one or more types (influencer, blogger, press, publisher/distribution, tester, festival, conference with a topic), a reach (a follower count, replacing the A to E band on 2026-11-21), a status (active, dormant, archived) and a next contact date.
- Decided: fit links a contact to a game with a one-line reason; touches are dated (mail sent, reply, video posted), optionally tied to a game.
- Decided: the first import is the sheet's New Streamers tab as CSV; BB1 and BB2 are not imported; Replied and Posted Video become touches dated by Last Contact.
- Decided: game profiles live as `Docs/Profiles/<game>.md` in the Polyspice Marketing project, one file per game and one for Hidden by Design, so a game needs no Doit project of its own to be marketed.
- Decided: Claude only reaches contacts through the CLI, as with tasks.
- Out of this epic: mail, festivals, campaigns, the research itself. Importing Tabu's real sheet, filling the profiles and the first fit batch are marketing work, planned as tasks in the Polyspice Marketing project after this epic merges.

## Tasks

- [x] T-012.1 Architecture and design: marketing modules in the layer table, module list and class diagram; `node:sqlite` allowed in the store; `engines` raised to Node 24; Design.md's Data section names `marketing.db` and its personal data (done when: the boundaries test allows `node:sqlite` in `src/store/` only and passes)
- [x] T-012.2 Domain: the `Contact` value (types, reach band, status, next contact) and the `ContactBook` facade over a `ContactSource` port: list with filters (type, game fit, status, due by date), get, add, update, set fit, add touch (done when: domain tests over an in-memory source cover each filter and refuse an unknown type or reach band)
- [x] T-012.3 Store: `SqliteContacts`, the `ContactSource` port on `marketing.db`: schema with `user_version` for later migrations, created on first open (done when: a test on a temporary `DOIT_HOME` writes a contact with channels, fit and touches, reopens the file and reads them back)
- [x] T-012.4 Game profiles: `ProfileShelf` reads `Docs/Profiles/*.md` from the marketing project (name, genres, platforms, stage, release date, needs) and creates a profile from a template; fit refers to a profile by its file name (done when: a test reads two profiles and refuses a fit to a game with no profile)
- [x] T-012.5 CSV import: `doit contacts import <file>` maps the New Streamers columns (name, links, reach, genre, email, notes, platform), turns Replied and Posted Video into touches, skips BB1 and BB2, and reports added, updated and skipped rows; a re-import updates by email or YouTube link instead of duplicating (done when: a test imports a five-row fixture of made-up contacts twice and gets five contacts and the right touches)
- [x] T-012.6 CLI: `doit contacts [--type] [--fits <game>] [--status] [--due] [--reach C+] [--json]`, `doit contact show|add|set <id>`, `doit fit <id> <game> <reason>`, `doit touch <id> <kind> [--game] [--date]`, `doit profiles` (done when: CLI tests cover each command, and `contacts --fits` prints one line per contact)
- [x] T-012.7 Server: `/api/contacts` routes for list with filters, show, update, fit and touch, and `/api/profiles` (done when: server tests cover each route and a refused value returns 400)
- [x] T-012.8 Web: a Marketing view beside Board, Docs and Claude: contacts list with filters for game, type, reach and status, due contacts on top (done when: web tests render the list from a fixture; the view shows in the app with filters working)
- [x] T-012.9 Web: contact detail pane: channels as links, fit per game with reason, touches newest first, edit status, next contact date and notes, add a touch (done when: web tests cover the edits; a status change in the app persists after reload)
- [x] T-012.10 Reach as a number: the A to E bands go; reach is a follower count in domain, store, import, CLI (--reach <n> means at least n), server and web (a Reach at least filter, the count on rows and detail, editable in the detail pane) (done when: tests refuse a negative or non-number reach, filter by at least n, sort largest first with unknown last, and import a count as is and a band letter into notes; no A to E left in src or web)

## Test plan

- Batch A: T-012.1 to .4 (docs, domain, store): development
- Batch B: T-012.5 to .7 (domain, cli, server): development
- Batch C: T-012.8 to .9 (web): development
- Performance: none

## Check in play

- T-012.8: open Marketing, filter by a game and by reach, see due contacts first.
- T-012.9: open a contact, change its status and next contact date, add a touch, reload and see them kept.

## Notes

Decisions and deviations, newest first.

- T-012.10: a reach cell reads as a count when it is digits with space or comma thousands separators, or a number with k or M ("12k", "1.2M"); anything else (a band letter) leaves reach empty and adds `Sheet reach: <cell>` to the notes. A re-import with an empty notes cell keeps the old notes, so an old `Sheet reach:` line stays when the sheet later gives a count. The reach filter takes the same number formats; an empty filter is no filter. The schema stays at version 1, changed in place.
- 2026-11-21: reach is a follower count, not a band (Design.md Changelog). T-012.10 replaces the bands in domain, store, import, CLI, server and web; the T-012.2, .5, .6 and .8 notes on bands are history.

- T-012.9: fit is shown per game with its reason but not edited on the page (the plan asks for display only); a touch's game picker lists the profiles. Channel urls link only as http(s) (a bare host gets https://); other schemes show as text.
- T-012.9: its code and tests were built together with T-012.8 and are in that commit (`web/contactDetail.js`, `test/marketing.test.js`); this commit ticks the task.
- T-012.8: the Marketing view has three columns like the Claude view: filters, list, detail. Filters go to the server (`fits`, `type`, `reach`, `status`); reach options are A, then B to E "and larger". Contact rows are buttons, not `.row`, so the Board's row keys do not touch them. The view has its own column widths (`doit.columns.marketing`). A reload is held while the add-touch form is open.
- T-012.7: no route adds a contact (the plan lists none); the page edits, fits and touches existing ones. PATCH takes name, types, topic, email, reach, notes, status, next and channels; other keys are ignored. `HttpServer` takes the `ContactBook` as a seventh argument; without it the contact routes are absent.
- T-012.6: `contact add` takes the types from `--type a,b` and channels from `--channels kind=url,kind=url`; `contact set` takes `channels=kind=url,...` the same way. `--due` is a flag with no value. The commit trailer of T-012.5 names Opus (the brief's line); later ones name Sonnet 5.5, the attribution given for this session.
- T-012.5: `SqliteContacts` now opens `marketing.db` on first use, not in the constructor, so `makeCli` can always build the contact book without creating the file. The CSV file is read by `readText`, passed from the root to `Cli` (the root has `node:fs`; the CLI tier does not). A genre or platform cell is kept as `Genre:` and `Platform:` lines in notes. A reach cell is a band letter or a follower count mapped through the band floors. Last Contact is read as YYYY-MM-DD only; other text counts as empty, so the touch is dated the import day. A re-import adds a touch only if the contact has none of that kind on that date (any date when Last Contact is empty). The test memory source moved to `test/memoryContacts.js`.
- Batch A: development 115 of 115.
- T-012.2: reach bands are A over 10 000, B over 5 000, C over 1 000, D over 200, E over 50 (B to D picked here; check against the sheet). A contact carries a `topic` for conferences. `list` puts due contacts first, then largest reach.
- T-012.4: the marketing project is the `marketingProject` setting, default `polyspice-marketing`. A profile is `# Name` and lines `Genres:`, `Platforms:`, `Stage:`, `Release:`, `Needs:`.
- T-012.1: `node:sqlite` prints no ExperimentalWarning on Node 24.19, so `bin/` is unchanged.

- Supersedes the parked EPIC-002 (Marketing), whose plan (fit score in settings, contacts as Markdown, Reddit through Day Drop) predates the Marketing section of Design.md.

## Close audit

## For the standard
