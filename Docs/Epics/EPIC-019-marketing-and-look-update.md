# EPIC-019: Marketing and look update

Status: Active
Goal: The logo shows in the board and on the launcher, the Claude badge says what it counts, and the Marketing view is picked per game with Campaigns first and real contacts in it.
Design: Design.md, sections Look, Claude view, Docs and Marketing
Source: Tabu's walkthrough recording of 2026-11-21 (Bandicam_20261121_101006)

## Tasks

- [x] T-019.1 Launcher app icon: build.sh drops the applet's Assets.car and CFBundleIconName so the navy logo in applet.icns is the icon (done when: a rebuilt Doit.app has no CFBundleIconName and no Assets.car, and the launcher test checks build.sh does both)
- [x] T-019.2 Top bar and tab icon use the dark-background logo (the navy icon) instead of the transparent mark (done when: web/logo.svg is the navy rounded-square logo and the style test passes)
- [ ] T-019.3 Claude badge says what waits: 'Waiting on you' pane with Blocked on you and Your tasks due within 7 days; the badge reads '<n> due' with a title (done when: the badge count equals the due group's count, and a domain test sees /api/claude return the due list)
- [ ] T-019.4 Docs tree orders names numerically: 0.8, 0.9, 0.10, 0.11 (done when: a docs test lists folders 0.8 0.9 0.10 0.11 in that order)
- [ ] T-019.5 Profiles also come from a project's Docs/Marketing/Profile.md (game = project id) with Kind: game|podcast; doit profile add <project> writes the template (done when: profile tests read a project profile and the legacy folder, and the CLI writes the template)
- [ ] T-019.6 Marketing top bar: game or podcast dropdown first, then Campaigns, Contacts, Festivals, Events, Drafts, Overview; the pick filters every tab (done when: a web test sees the order and the dropdown, and the picked game reaches the contacts and festivals requests)
- [ ] T-019.7 Contacts tab lists people only (no festival or conference); Events tab lists conferences; Campaigns tab lists campaign epics; This week moves to Overview so lists get the full height (done when: contactRoutes test sees festivals left out by except=, and web tests cover the Events, Campaigns and Overview panes)
- [ ] T-019.8 Design.md, Architecture and the standard: release notes and the marketing profile live in Docs/Marketing/; import the New Streamers CSV (done when: Design and Changelog updated, Core/02-Working.md has the rule with a CHANGELOG line, pushed to ClaudeStandards, and doit contacts lists the imported people)

## Test plan

- Batch A: T-019.1 to .4: development
- Batch B: T-019.5 to .7: development
- Batch C: T-019.8: development, then the Audit tests at close

## Notes

Decisions and deviations, newest first.

## Close audit

## For the standard
