# EPIC-015: Campaigns

Status: Done
Closed: 2026-11-21
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
- [x] T-015.2 Domain: campaign lines read from an epic, the `contact` task field, and a touch logged when such a task completes (done when: domain tests complete a contact task and find the touch on the contact)
- [x] T-015.3 Domain: `OutreachPlan`, pure: contacts, festivals, campaigns and today in, the weekly list out, capped (done when: domain tests cover the cap, the 14-day deadline window and an empty week)
- [x] T-015.4 CLI: `doit campaign add <project> <name> --game <game> [--event]`, `doit campaign contacts <project> <EPIC-nnn> [--limit]`, `doit outreach [--json]`; `doit morning` includes the outreach list (done when: CLI tests cover each command)
- [x] T-015.5 Server and web: a This week pane on top of the Marketing view with the outreach list; Add contacts on a campaign epic's document; a contact task shows the contact's name and opens it (done when: web tests render This week and Add contacts from fixtures; in the app Add contacts on a test campaign makes its tasks)
- [x] T-015.6 Add contacts reloads the epic document so its new task lines show (done when: after Add contacts the document lists the new tasks)

## Test plan

- Batch A: T-015.1 to .3 (docs, domain): development
- Batch B: T-015.4 to .5 (cli, server, web): development
- Performance: none

## Check in play

- T-015.5: make a campaign for one game, Add contacts, tick one task and see the touch on the contact; read This week.
- T-015.5: the This week pane at a narrow window width (checked in tests and at desktop width only).

## Notes

Decisions and deviations, newest first.

- Close: the standard pulled at activation (f16132b3) builds an epic on main with no worktree, so EPIC-015 was built on main; the project CLAUDE.md follows it. Checked in a throwaway data folder on port 4399: `campaign add`, Add contacts made one task per fitting contact, the task row shows the contact's name and opens This week, a tick logged one mail touch and a re-tick none. The pane's narrow-screen layout was not checked.
- T-015.6: found in the in-app check: after Add contacts the epic document kept its old Tasks list until reloaded. It is read again after the post.

- T-015.5: `POST /api/campaigns/:project/:epic/contacts` answers `{refs}`. The page reads contact names through the new `web/contactNames.js` (one `/api/contacts` fetch, ids shown until it lands). The This week pane spans the top of the panes grid (CSS `:has`, max height 200 px); it reloads with the Marketing view and a failed `/api/outreach` leaves it on Loading. `render.js` exports `rowHtml` for the test.

- T-015.4: `Cli` keeps the ContactBook as `this.book` to check `--contact` and `contact=`; `doit show` prints a `contact:` line. `campaign contacts` prints `<ref>  <contact id>  <name>`; with nobody to add it prints `No contacts to add.`.

- T-015.3: `addCampaign` makes the epic `Active` so its tasks are open at once; a festival event is stored as its contact id (`Event: 12`). The morning report block now holds the outreach lines after its five parts, so `test/morning.test.js` expects seven lines (`Outreach this week: nothing` on an empty week). The root builds `Outreach` in `makeOutreach` for the CLI and the server and gives it to `ClaudeView`; `Cli` and `HttpServer` take it in Batch B. A campaign task whose contact is also due is listed once, as `campaign`.

- T-015.2: `Board` was past its 250-line limit, so the done-fact listeners went to `domain/doneNotifier.js` and the task loading to `domain/taskLoader.js`; `Board.subscribe` and `Board.#load` delegate. The Board announces after the task file is written, and a listener that throws is ignored. `Outreach.taskDone` exists from this task; the rest of `Outreach` comes with T-015.3.
- Commit trailer follows the session's attribution (Claude Sonnet 5.5), not the brief's Opus line.

## Close audit

Diff read from 5fc172a^ to 3db5c80 against Architecture.md, Core/03-Design.md and the boundaries. Audit tests 246 of 246.

- Fix now: Add contacts left the epic document stale (T-015.6, fixed). No boundary broken: domain stays pure, Board tells Outreach only plain facts through `subscribe`, wired in the root; the class diagram names `DoneNotifier`, `taskLoader`, `Outreach`, `OutreachPlan`, `CampaignCli` and `OutreachRoutes`.
- Fix before release: `Outreach.taskDone` swallows every `addTouch` error by retrying without the game (EPIC-018, T-018.1). `Board` sits at 245 of its 250 lines and `Cli` at 253 (EPIC-018, T-018.2).
- Deliberate: none.

## For the standard

Nothing new: a side effect across facades through plain facts wired in the root is already the rule in Core/03-Design.md. The build-on-main change came from the standard itself.
