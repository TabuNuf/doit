# EPIC-015: Campaigns

Status: Active
Goal: A campaign (a release, Next Fest, a festival) turns into a short list of contacts and steps, and each week Doit tells Tabu the few things to do for it.
Design: Design.md, section Marketing (step 5)

## Scope

- Decided: a campaign is an epic with a `Game:` line (a profile name) and an optional `Event:` line (a festival id or a release date). Its tasks are steps and outreach.
- Decided: campaign epics live in the Polyspice Marketing project, beside the profiles and templates, since games such as Bunny Bunker have no Doit project.
- Decided: a task may carry `contact: <id>`; ticking it logs a touch on that contact for the campaign's game.
- Decided: **Add contacts** on a campaign picks contacts that fit its game, are active and are not due later than the campaign's event, and makes one task per contact; nothing is added without that click or a Claude run.
- Decided: a weekly outreach list: due contacts per game, festival deadlines within 14 days, and open campaign steps, capped at what fits in 30 minutes (Proposed: five contacts and three steps). It shows at the top of the Marketing view and in the morning report.

## Tasks

- [x] T-015.1 Architecture and design: the `contact` task field, the campaign lines and `OutreachPlan` in the class diagram; Design.md section Marketing updated (done when: Architecture.md and Design.md name them)
- [ ] T-015.2 Domain: campaign lines read from an epic, the `contact` task field, and a touch logged when such a task completes (done when: domain tests complete a contact task and find the touch on the contact)
- [ ] T-015.3 Domain: `OutreachPlan`, pure: contacts, festivals, campaigns and today in, the weekly list out, capped (done when: domain tests cover the cap, the 14-day deadline window and an empty week)
- [ ] T-015.4 CLI: `doit campaign add <project> <name> --game <game> [--event]`, `doit campaign contacts <project> <EPIC-nnn> [--limit]`, `doit outreach [--json]`; `doit morning` includes the outreach list (done when: CLI tests cover each command)
- [ ] T-015.5 Server and web: a This week pane on top of the Marketing view with the outreach list; Add contacts on a campaign epic's document; a contact task shows the contact's name and opens it (done when: web tests render This week and Add contacts from fixtures; in the app Add contacts on a test campaign makes its tasks)

## Test plan

- Batch A: T-015.1 to .3 (docs, domain): development
- Batch B: T-015.4 to .5 (cli, server, web): development
- Performance: none

## Check in play

- T-015.5: make a campaign for one game, Add contacts, tick one task and see the touch on the contact; read This week.

## Notes

Decisions and deviations, newest first.

## Close audit

## For the standard
