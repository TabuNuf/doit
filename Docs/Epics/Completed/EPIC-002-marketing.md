# EPIC-002: Marketing

Status: Done (dissolved: superseded by the Marketing section of Design.md; contacts and profiles go to EPIC-012, mail, festivals and campaigns to later epics)
Goal: Events, Reddit threads and influencer outreach arrive as tasks in a Marketing project, with a weekly plan written by Claude.
Design: not written yet. Wireframe: Docs/Design/wireframe.html, Marketing view.

## Scope

- Decided: a Marketing view beside the Board, with three panes: This week, Fetched today, Influencers.
- Decided: Reddit threads come through Day Drop, not from Reddit directly.
- Decided: marketing work lands as ordinary tasks in a Marketing project, so the board, the CLI and the archive rules apply unchanged.
- Proposed: a fit profile (genres, platforms, regions, fee ceiling, event types) stored in the app's settings, edited from This week; each fetched item gets a fit score from 0 to 100 against it.
- Proposed: items scoring 60 or more get a **Make task** button; nothing becomes a task without that click or a Claude run.
- Proposed: influencer contacts live in one Markdown file per project's docs folder, with value score, last contact and a 60-day cooldown.
- Proposed: the planning run is weekly, Monday 07:00, and writes This week as a Markdown file Claude can read back.

Open before planning: the event profile (genres, platforms, regions, fees, event types); daily or weekly run; the influencer data and how value is scored.

## Tasks

- [ ] T-002.1 Interview: the event fit profile and the planning cadence (done when: Design.md has a Marketing section with the profile fields, the score rule and daily or weekly, and the Open line above is gone)
- [ ] T-002.2 Fit profile stored in settings and editable from the page (done when: a test saves and reads back a profile; the This week pane shows it and Edit profile changes it)
- [ ] T-002.3 Event fetch from Steamworks and the Epic dev portal into a fetched-items file with a fit score (done when: a test with recorded responses produces scored items; fetch failures are logged, not thrown)
- [ ] T-002.4 Reddit threads via Day Drop into the same fetched-items list (done when: a test with a recorded Day Drop response adds threads with subreddit, comment count and reason)
- [ ] T-002.5 Marketing view: This week and Fetched today panes, Make task turns an item into a task in the Marketing project (done when: clicking Make task creates a task whose source names the item, and the row then shows its task number)
- [ ] T-002.6 Influencer contacts: file format, value score, cooldown, Add contact and Import CSV (done when: a test imports a CSV and computes next contact dates; the Influencers pane lists contacts sorted by value)
- [ ] T-002.7 Planning run: a CLI command that writes This week from open marketing tasks and fetched items (done when: `doit plan marketing` writes the plan file and the pane shows its time and next run)

## Test plan

- Batch A: T-002.1 to .4 (settings, a new fetch module, store): development
- Batch B: T-002.5 to .7 (web, CLI, store): development
- Performance: none

## Check in play

- T-002.5: Make task on an event creates a task in the Marketing project and the row shows its number.
- T-002.6: import a small CSV and see contacts sorted by value, with cooldown text.
- T-002.7: run the plan command and read This week in the page.

## Notes

Decisions and deviations, newest first.

## Close audit

## For the standard
