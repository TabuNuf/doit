# EPIC-031: Games tab

In short: Marketing gets a Games tab where every game a contact has covered is one entry with its stores, tracker links, facts, success numbers and coverage, compared against Tabu's own games.
Why it exists: covered games were only lines inside a contact's pane (EPIC-030), so there was nothing to compare Tabu's games with: no description, no numbers, no view across contacts.

Status: Active
Design: Design.md, section Marketing, step 6 (Games)

## Specification

- Decided: one entry per covered title, matched without case. It is created by a contact's covered game or by `doit game add <title>`, and stays when its last coverage is removed.
- Decided: the entry owns scale and genres. Schema v9 moves them from the contact's covered-game rows (union per title); contacts read them back from the entry, so the relevance rule of EPIC-030 is unchanged.
- Decided: fields are identity (title, developer, publisher, release, stage, platforms), stores, trackers, what it is (description, hook, genres, keywords, scale, modes, look), success (price, launch price, reviews, sales, revenue, sales source, peak players, followers, playtime), ratings (rating, rating label, metacritic, opencritic), how it got there (team, dev time, demo, festivals, early access, languages, what worked), notes, sources and checked.
- Decided: stores and trackers are one link per kind. Stores: steam, epic, gog, itch, playstation, xbox, switch, appstore, googleplay, humble, other. Trackers: gamalytic, steamdb, vgchartz, steamspy, steamcharts, metacritic, opencritic, howlongtobeat, igdb, other.
- Decided: sales and revenue come from a tracker and are refused without `sales_source`. Without them the page shows reviews times `SALES_PER_REVIEW` (30) and sales times price, each marked as an estimate with how it was reached.
- Decided: the tab has the Contacts layout (filters, sortable list, pane). Columns: Title, Genre, Scale, Rating, Reviews, Est. sales, Covered by. Filters: genre, keyword, scale, stage, store, rating at least, reviews at least, covered by at least, Comparable to, Similar to, Not researched.
- Decided: the pane compares the entry with each game profile (shared genres and keywords, scale, platforms). Comparable to marks an entry for a profile with a one-line reason.
- Decided: the facts are filled by a Claude run through the CLI (`Marketing-Claude.md`, Research a batch of covered games), never by code in the app.
- Proposed: `SALES_PER_REVIEW` is 30, a rule of thumb not yet checked against current figures.
- Proposed: Tabu's own games are not rows; they are the comparison target only.

## Findings

## Tasks

- [x] T-031.1 Design, epic, architecture and the research run for covered games (done when: Design.md step 6, Architecture.md (modules, class diagram), the epic's Specification and Marketing-Claude.md name the same fields and commands)
- [x] T-031.2 Game entries in the domain: vocabulary, checks, estimates and compare (done when: test/gameEntries.test.js passes: an unknown key, store kind or stage is refused, sales without a sales source is refused, estimates fall back to reviews x 30)
- [x] T-031.3 Schema v9: game_entries and comps, and covered games read scale and genres from the entry (done when: test/sqliteGames.test.js passes: a v8 file migrates with one entry per distinct title holding the union of scales and genres; npm test passes)
- [x] T-031.4 GameCatalog facade with coverage, filters and comps, wired in the root (done when: test/gameCatalog.test.js passes: list gives coverage and estimates, each filter narrows, a comp to an unknown game is refused; test/boundaries.test.js passes)
- [x] T-031.5 CLI: games, game show, add, set and comp (done when: test/gamesCli.test.js passes: games lists with each flag, game set writes a store and a tracker link, game comp adds and removes; doit help prints the commands)
- [x] T-031.6 Routes: /api/games, /api/game-tags and comps (done when: test/gameRoutes.test.js passes: list with filters, get, post, patch, comp add and remove; a refused value is 400, a missing entry 404)
- [x] T-031.7 Games tab: tab, filter column and sortable list (done when: test/gamesTab.test.js passes: the tab sits after Contacts, the list has seven sortable columns, each filter is in the list request; no web file is over 300 lines)
- [x] T-031.8 Game pane: every field editable, with Stores, Trackers and Covered by (done when: test/gameDetail.test.js passes: each field builds its PATCH, a store and a tracker are set and removed, Covered by lists each contact with kind, date and source link)
- [x] T-031.9 Compare block and Comparable to in the game pane (done when: test/gameCompare.test.js passes: the block lists per profile the shared tags, scales and platforms, the form builds the comp request, Remove builds the delete)
- [x] T-031.10 Links between a contact's covered games and the entries (done when: tests pass: a covered game in the contact pane carries the control that opens its entry in the Games tab, and a Covered by name opens the contact in the Contacts tab)
- [ ] T-031.11 Check in play: the Games tab (done when: Tabu has tried the four items under Check in play in the epic and each works or has a bug task)
- [x] T-031.12 Game pane groups and filter labels follow the design (done when: tests pass: Price, Launch price and Playtime sit under Success, Demo and Languages under How it got there; the filters read Comparable to and Not researched)

## Test plan

- Batch A: T-031.1 to .4 (docs, domain, store, root): development
- Batch B: T-031.5 to .7 (cli, server, web): development
- Batch C: T-031.8 to .10 and .12 (web): development
- Performance: none
- Check in play: T-031.11

## Check in play

- The Games tab lists the 25 covered games; a header click sorts, a filter narrows (T-031.7).
- An entry's pane saves an edited field, a store link and a tracker link (T-031.8).
- The Compare block names what an entry shares with each of Tabu's games; Comparable to adds and removes a mark (T-031.9).
- A name under Covered by opens the contact; a covered game in a contact's pane opens its entry (T-031.10).

## Notes

Decisions and deviations, newest first.

- 2026-11-26, page check after Batch C, on a copy of the data on port 4399 (never the real data folder): the tab lists the 25 entries; a store link, a tracker link, reviews (`1.2k` read as 1200) and price were saved from the pane; the estimates showed (reviews x 30, sales x price); a comp to Bunny Bunker was saved and found by the Comparable to filter; a Covered by name opened the contact and a covered game opened its entry; no console errors. Found: fields under the wrong headings and two filter labels off the design's words, fixed in T-031.12.
- 2026-11-26: Development ran after each batch: 464, 476 and 485 tests, all passing. Audit has not run; it belongs to the close, which waits for T-031.11.
- 2026-11-26, deviations kept: `parse` moved out of `cli.js` into `cli/parse.js` to hold the 220-line guard; `game comp` takes the title as one quoted argument; an entry is matched to covered games by a key computed in JS, since SQLite's `lower()` is ASCII only; `checkEntry` refuses a title change that would change the key; a profile sharing nothing shows its name over one muted line.
- 2026-11-26: the real `marketing.db` was copied to `marketing.db.before-v9` before schema v9 ran on it. After the migration it holds 25 entries and the 25 covered-game rows read back with their scales and genres.
- 2026-11-26: built on main beside EPIC-026, 028, 029 and 030, which are Active and wait only on their Check in play tasks. Tabu was told and said to start.

## Close audit

## For the standard
