# EPIC-021: Review 2026-11-21: docs on the board, contacts and marketing

Status: Planned
Goal: Docs live in each project's board, every warning says how to fix it, contacts carry everything the sheet held and can be edited in the page, and Marketing works from projects rather than profiles.
Design: Design.md, sections Docs, Claude view, Projects and Marketing (T-021.1 updates them first)
Source: review video Bandicam_20261121_111550.mp4, narrated by Tabu; times in each task's description

## Tasks

- [ ] T-021.1 Design.md: this epic's decisions in sections Docs, Claude view, Projects and Marketing, with a Changelog line (done when: Design.md says each rule below and the Changelog has a 2026-11-21 line; Tabu has read it)
- [ ] T-021.2 Board: per project, toggles Epics and Docs at the top of the left pane; with Docs on, the doc tree shows under the epics; the Docs button leaves the top bar (done when: a web test turns Docs on and sees the tree under the epics, turns Epics off and sees only the tree, and finds no Docs button in the top bar; the choice is kept per project)
- [ ] T-021.3 Board: opening a doc gives the document the wide middle and right columns, with Linked tasks beside it; selecting a task brings the task list and Detail back (done when: a web test opens a doc from the left pane and sees the document in the wide layout with Edit and Linked, then opens a task and sees the task layout)
- [ ] T-021.4 Claude view: the due badge and each Waiting-on-you card say what is wrong, why, and what to do (done when: the badge tooltip names the due tasks; each card shows why it is listed (due in n days, or blocks T-x) and what to do (the task's done-when, else the first line of its description); a web test checks both)
- [ ] T-021.5 Contact import reads every column of the New Streamers sheet (done when: a test with the sheet's real header row maps: Contact to email; Linktree, Youtube, Twitch, Steam, Discord, Bluesky (also a bare @handle), X, Instagram, Facebook and WWW to channels; Reach buckets (A - Tiny >50 ... E - Huge >10.000) to their lower bound; dates like 16-Sep-2025; Last Contact to a dated mail touch. Re-importing the CSV in Downloads updates the 224 contacts in place (2Dkiri: reach 5000, email and channels filled))
- [ ] T-021.6 Contacts have genres: a field set in the contact pane and with doit contact set genres=a,b, imported from the Genre column, and a Genre filter in Contacts (done when: domain, CLI and web tests set, show and filter by genre; the import moves Genre out of the notes)
- [ ] T-021.7 Contact pane: add, edit and remove channels; an About field for who the contact is and what they cover (done when: a web test adds a Twitch channel, edits its URL, removes it, and saves an About text, and each change is in marketing.db)
- [ ] T-021.8 Contact history: the pane lists every mail, reply, video and sent draft to the contact, newest first, with date and game; the list and pane show Last contact (done when: a web test sees a contact's sent draft and touches in date order and its Last contact date in the list row and pane)
- [ ] T-021.9 Contacts list: arrow up and down move the selection; the Contacts tab shows every contact whatever game is picked, with those that fit the game marked (done when: a web test moves the selection with the arrow keys and sees the pane follow; with a game picked, the list still holds all contacts and fitting ones carry a mark)
- [ ] T-021.10 A project's settings: kind and marketing profile (genres, platforms, stage, release date, what it needs now) set on the project from the top bar, written to its Profile.md; the Marketing picker only picks, with no (no profile) mark (done when: a web test opens Box Trainer's settings from the top bar, sets genres and stage, and sees them in its Marketing/Profile.md and in the Marketing view; the picker labels have no (no profile))
- [ ] T-021.11 Campaigns: + Campaign in the page takes a project of any kind, a name and an optional event, as doit campaign add does; empty states are plain text in the pane's font with a button, never a CLI command (done when: a web test creates a campaign for an application from the page and sees it listed; no empty state in Marketing shows a code span)
- [ ] T-021.12 Festivals and events: platform events (Steam, Epic, GOG, itch fests and sales) show under Events, festivals under Festivals; selecting one shows its event fields (dates, deadline, cost, where, criteria, state), editable, not reach and email (done when: a web test sees Steam Next Fest under Events and its deadline and state in the pane, and changes its state from the pane)
- [ ] T-021.13 Festivals run reads howtomarketagame.com/festivals (Upcoming and New) and logs which festivals are new since the last run (done when: a hand run adds or updates festivals from that page and its activity-log line names the new ones; no source is skipped without a reason and a next step)
- [x] T-021.14 Decide where the marketing scan lives: Polyspice Marketing or Doit (done when: Tabu picks one and T-021.1 records it in Design.md)

## Test plan

- Batch A: T-021.1 to .4 (design, Board docs, Claude view): development
- Batch B: T-021.5 to .9 (contacts): development, plus a re-import of the real CSV into a copy of marketing.db
- Batch C: T-021.10 to .13 (projects, campaigns, festivals): development, then the Audit tests at close
- T-021.14 is Tabu's and can land any time before T-021.1 is ticked

## Notes

Decisions and deviations, newest first.

- 2026-11-21, Tabu: the marketing scan lives in Polyspice Marketing (T-021.14); BB1 and BB2 are imported as dated Bunny Bunker mail touches (T-021.5); EPIC-018 runs and closes first.
- Not taken from the video: 07:51 'split this into' trails off with no target.
- Board.js is at 245 of 250 lines (T-018.2): T-021.2 and .3 need its room first, so EPIC-018 goes before or with Batch A.

## Close audit

## For the standard
