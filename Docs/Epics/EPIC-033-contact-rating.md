# EPIC-033: Contact rating

In short: Each contact gets a rating per game, which picks this week's five contacts and orders campaign suggestions.
Why it exists: On 2026-11-28 the lists ordered 109 Bunny Bunker fits by reach, and nothing said how well each one suits the game. The rating replaces sorting by reach.

Status: Planned
Design: Design.md, section Marketing, step 7

## Findings

Measured on 2026-11-28 with `doit contacts --all --json` and `doit games --json`.

- 109 of 224 people fit Bunny Bunker. A fit is a yes or no with a reason, and the lists order the 109 by reach.
- Reach does not follow suitability: in a trial split of the 109, the median reach was 6K to 8K in every tier.
- Tags do not separate games: `doit games --similar bunny-bunker` returns 248 of 824 covered games, since one shared tag is enough.
- Comps by title are thin: the most covered game has 6 contacts, and Bunny Bunker has 2 comps.
- Six player-type scores alone do not tell types of game apart: in a trial of 14 games every distance to Bunny Bunker was 2 to 6 out of 18.
- 102 of the 109 have Next contact in May 2027, after Steam Next Fest (2027-02-22).
- 49 active people have no scales and no covered games, and they sit in the main list beside researched ones.

## Specification

What Doit does when the epic is done. `Decided` items come from Tabu; `Proposed` items are the planner's; T-033.4 settles the ones left.

- Decided: a covered game and a game profile carry one or two types of game from a fixed list, and each type names its neighbouring types.
- Decided: a covered game carries six player-type scores from 0 to 3: achiever, explorer, socialiser, killer, pressure, creation.
- Decided: a game profile carries one to three personas (name, who, types of game, six scores) and its beats (name, date).
- Decided: a rating has three parts: type of game 0 to 4, persona 0 to 3, comps 0 to 2. 7 or more is `strong`, 4 to 6 `good`, fewer `long shot`. Fewer than three counted games in 12 months stops at `good`.
- Decided: a rating shows as its tier, its three parts and the persona. Never a percentage.
- Decided: every person is shown, hidden or not researched, computed on read. Hidden people appear behind a switch.
- Decided: the weekly list and the campaign suggestions order by rating in place of reach.
- Decided: the list of types is `GameTypes.md` in the marketing project's docs, one line per type with its neighbours, so Tabu edits it as a doc.
- Proposed: type points come from the share of counted games in the profile's types, a neighbour counting half: 0.6 or more is 4, 0.4 is 3, 0.2 is 2, anything above 0 is 1.
- Proposed: persona points come from the summed difference between the creator's six averages and the persona's scores: up to 3 is 3 points, up to 5 is 2, up to 7 is 1.
- Decided: the rating alone decides who a list offers. A fit is not required; a tier set by hand on a fit wins over the computed one.
- Decided: the weekly list ignores Next contact. The eight-week rule paces it, and Next contact stays as the due mark in the Contacts list.
- Decided: the weekly list leaves out anyone contacted in the last eight weeks, and offers only `strong` people until six weeks before a beat. Both are starting values.
- Proposed: a `Ratings` facade in the domain, over the `ContactBook`, the `GameCatalog` and the type list. Neither of the two knows it.
- Decided: personas and beats are written in `Profile.md` by Tabu or Claude. The page shows them read only.

## Tasks

- [x] T-033.1 Decide the rating's open points (done when: Each of the five points has an answer in a comment on this task.)
- [x] T-033.2 Draft the game type list and the player-type scoring guide (done when: `GameTypes.md` lists at most 25 types whose neighbours are all types in the list, and `Marketing-Claude.md` defines 0 to 3 for each of the six scores.)
- [ ] T-033.3 Trim the game type list (done when: `GameTypes.md` is as Tabu wants it, and a comment on this task names Bunny Bunker's one or two types.)
- [ ] T-033.4 Architecture and design for the rating (done when: `Architecture.md` names every new module with its port and its place in the class diagram, and Design.md step 7 has no open point that T-033.1 answered.)
- [ ] T-033.5 Read the game type list from GameTypes.md (done when: `npm test` passes with new tests for `parseGameTypes`, `checkTypes`, `typeWeight` and a missing file, and `doit game-types` prints the list.)
- [ ] T-033.6 Covered game entries carry types and player-type scores (done when: `npm test` passes with tests for the new keys, a refused score of 4, an unknown type, the migration on an old database and `games --no-types`.)
- [ ] T-033.7 Game profiles carry types, personas and beats (done when: `npm test` passes with a test that parses a profile with two personas and two beats, and one where a score of 5 lands in `problems`.)
- [ ] T-033.8 Rating: creator profile, points and tier (done when: `npm test` passes with tests for each part's steps, the tier limits, the stop at good under three counted games, a neighbour counting half and games older than 12 months left out.)
- [ ] T-033.9 Group people as shown, hidden or not researched (done when: `npm test` passes with tests for each group and reason and for the fit and special exceptions, and `doit contacts --hidden` lists only hidden people with their reason.)
- [ ] T-033.10 Ratings facade, wired in the root, with doit rating (done when: `npm test` passes, the boundaries test included, and `doit rating bunny-bunker --limit 5` prints five people with tier, parts and persona.)
- [ ] T-033.11 The weekly list picks its contacts by rating (done when: `npm test` passes with tests for the order, the 56-day rule, the beat window on both sides of 42 days and a campaign task staying first.)
- [ ] T-033.12 Campaign suggestions and Add contacts order by rating (done when: `npm test` passes with tests that a strong person with small reach comes before a good one with large reach, in `suggest` and in `addContacts`.)
- [ ] T-033.13 Contacts tab: Tier column, Show hidden and Not researched (done when: `npm test` passes with pane tests for the Tier column, the switch with its count and the Not researched section.)
- [ ] T-033.14 Rating in the contact pane, the Overview and the suggestions (done when: `npm test` passes with tests for the Rating block, computed and set by hand, and for the tier on Overview and suggestion rows.)
- [ ] T-033.15 Games pane and project settings show types, scores, personas and beats (done when: `npm test` passes with tests for the new fields, the two filters and the read-only persona list.)
- [ ] T-033.16 Draft Bunny Bunker's types, personas and beats (done when: `doit profiles` shows Bunny Bunker with its types and two personas and no `problems`, and `doit games --comp bunny-bunker` lists ten or more.)
- [ ] T-033.17 Type and score the covered games behind Bunny Bunker's contacts (done when: At least 70 of the people shown for Bunny Bunker have three or more counted games in `doit rating bunny-bunker --json`.)
- [ ] T-033.18 Check the Bunny Bunker ratings (done when: A comment on this task says the top ten and the weekly five read right, or lists what to change.)

## Test plan

- Batch A: T-033.1 to .4 (documents only): none
- Batch B: T-033.5 to .7 (`domain/gameTypes.js`, `domain/gameEntries.js`, `store/`, `cli/`): development
- Batch C: T-033.8 to .10 (`domain/rating.js`, `domain/contactGroups.js`, `domain/ratings.js`, `root.js`, `cli/`): development
- Batch D: T-033.11 to .15 (`domain/outreachPlan.js`, `domain/outreach.js`, `server/`, `web/`): development
- Batch E: T-033.16 to .18 (profile and game data, no code): none
- Performance: none. 224 contacts and 824 entries are rated on read.
- Check in play: T-033.18

## Check in play

- T-033.13: the Contacts tab shows a Tier column for the game in the Fits filter, the **Show hidden** switch with its count, and the Not researched section.
- T-033.14: a contact's pane shows its rating per game with the three parts and the persona.
- T-033.15: a covered game's pane edits its types and six scores.
- T-033.18: the ten highest ratings for Bunny Bunker read right to Tabu, and the Overview's five are people worth writing to this week.

## Touches

Files a second epic running beside this one must not change.

- `src/store/marketingDb.js`: a new migration step; two epics that each add a step collide.
- `src/root.js`, `src/cli/help.js` and `web/marketingView.js`: each gains lines in a shared block.

## Notes

Decisions and deviations, newest first.

- 2026-11-28, T-033.1: Tabu answered all five points "as proposed". The rating alone decides who a list offers, the weekly list ignores Next contact, the limits start as written, the type list is `GameTypes.md`, and personas and beats are edited in `Profile.md`. Design.md, Marketing step 7, still lists these as open until T-033.4.

## Close audit

## For the standard
