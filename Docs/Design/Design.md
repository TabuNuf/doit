# Doit: Design

2026-11-20 · Tabu

What the app is now. The source of truth for what gets built. When code and this document disagree, one of them changes in the same commit and the Changelog says which.

## Purpose

One local board where Tabu and Claude share every project's epics, tasks and bugs, so Jira and Confluence can be cancelled. Claude reaches it through a CLI that returns only the slice it asks for. Left out for now: the Confluence import, a later epic. The Marketing view (section Marketing) has game profiles and contacts; mail, festivals and campaigns are not built yet. The wireframe for all of them is `Docs/Design/wireframe.html`.

## Users and their jobs

- **Tabu** opens the board to see what to do next, what Claude is doing, and to rank, add, comment on and close work. Done for them: the next thing to do is at the top of Active, and Claude's work is one click away.
- **Claude** asks the CLI for open tasks in one project or epic, works the AI tasks top to bottom, comments on progress and closes them. Done for Claude: it never reads more than the slice it needs, and never reads the archive.

## Projects

- A project is a folder with a docs folder inside, `Docs/` by the standard; a project that has not renamed its own yet (`BB-Docs/`) is registered with that name. The project list lives in the app's settings, not in any project.
- **+ New project**, the last row of the Projects menu, asks for a name, a folder and the docs folder name. It creates `<docs>/Epics/` with `Tasks/`, `Parked/` and `Completed/` where missing, and a rolling bug epic `EPIC-001: Bugs (rolling)` when the project has no epics yet. It never overwrites an existing file.
- The top bar shows **All projects**, then the starred projects, then a **Projects ▾** menu listing every project. In the menu a click on a name selects the project; a click on its star pins it to the top bar or takes it off. The star is kept in the settings file. A selected project without a star shows its name on the menu button. In All projects each row shows a project pill.
- **Kind.** A project is a `game`, an `application` or a `podcast`, or has no kind. It is set on the project: a select on its row in the Projects menu, or `doit project set <id> kind=game` (`kind=` clears it). It is kept in the settings file beside the star, since the project list lives there. Marketing reads it: every game, application and podcast is offered in the Marketing picker, and the kind is the profile's kind.

## Epics

- Epic files follow `Docs/Standard/Core/01-Tasks.md`: `<docs>/Epics/EPIC-<nnn>-<short-name>.md`, status `Parked | Planned | Active | Done`, a `## Tasks` checklist.
- The left pane lists the project's open epics (`Epics/`, status Planned or Active) with done/total counts and a progress bar.
- **Clicking an epic** filters the task list to its tasks and shows its document in the Detail pane: goal and status, tasks (checklist), test plan, notes, close audit and standard section. It works for any epic in the list, parked ones too. The markdown is shown with headings, lists, checkboxes, bold and code; nothing in it is editable. Selecting a task shows the task in the Detail pane, and clicking the epic again brings its document back. Clicking the epic while its document shows, or **Show all**, clears the filter.
- **Close epic** in the epic document's header (open epics only) asks for confirmation, then does what `epic close` does: archives the epic's tasks, sets it Done, writes `Closed: <date>` under its status line and moves it to `Epics/Completed/`.
- Below the open epics, per project, the left pane has three sections, each folded until its header is clicked, with a count. **Parked**: epics in `Epics/Parked/`. **Completed**: epics in `Epics/Completed/` closed within the keep setting (14 days, the same as completed tasks), newest first. **Archived**: older ones, those with no `Closed:` line, and those with an `Archived:` line. All open the epic's document like any epic; only open epics have Close.
- **Moving an epic by dragging.** An epic button drags onto a section header or onto the open epics:
  - onto **Parked**: status Parked, file moved to `Epics/Parked/`. Planned epics only; an Active epic is refused with a message, since it has a worktree and branch.
  - onto **Completed**: the same as Close epic, with its confirmation.
  - onto **Archived**: Close epic, plus an `Archived: <date>` line under `Closed:`, so it shows in Archived at once.
  - onto the **open epics**, from Parked: status Planned, file moved to `Epics/`. From Completed or Archived it is reopened: status Planned, the `Closed:` and `Archived:` lines removed, file moved to `Epics/`, and the tasks that closing archived (reason `Epic <id> closed`) come back, the ticked ones as Completed and the rest as To-do.
  - A drop where the epic already is does nothing. A folded section header opens when an epic is held over it for a moment, so passing over one on the way to another does not move the target.
- The CLI's `epics` lists open epics only; Claude never reads closed or archived ones unless asked.
- **An epic with a worktree** on its branch `epic/<nnn>-<short-name>` has its epic file and task files read and written in that worktree, by the page and the CLI alike, so a tick made during the epic lands on its branch and the main checkout stays clean. When the worktree is removed, they are read from the project folder again.
- **+ New epic** creates the next number with the standard template, status `Planned`.

## Tasks

- A task is a line in its epic's checklist, `- [ ] T-<nnn>.<n> <title> (done when: <check>)`, plus an optional task file `<docs>/Epics/Tasks/T-<nnn>.<n>.md` holding its fields, description and comments. A task without a file uses defaults:
  - state: unticked in an `Active` epic is To-do; unticked in a `Planned` or `Parked` epic is Backlog; ticked is Archived (it was finished before Doit existed);
  - owner: AI; type: Bug when the epic's name contains "bug", else Task;
  - rank: the epic number times 1000 plus the task number.
- Fields: state, owner (`ai` or `human`), type (`task` or `bug`), rank, deadline (optional date), blocks (optional, the task this one holds up, `T-<id>`), created, updated, completed (timestamps).
- States: To-do, In progress, Backlog, Completed, Archived.
- **Open tab:** one column in two sections. Active (To-do and In progress) on top, ranked; Backlog below. A pill on each Active row shows To-do or In progress; clicking it switches. Rows are reordered and moved between sections only by dragging the dotted handle (Alt + arrow keys from the keyboard).
- **Completed tab:** completed tasks, newest first, each with Reopen. A completed task moves to Archived after **14 days** (setting, 1 to 90).
- **Archive tab:** archived tasks, each with Restore. Claude never reads the archive.
- A task whose deadline passes before it is completed is archived at once.
- Ticking: Completed and Archived-after-completion tasks are ticked `[x]` in the epic file; the others are unticked.
- Archiving moves the task file to `<docs>/Archive/Tasks/`; restoring moves it back.
- Row, left to right: drag handle, rank (Active only), a red dot for a bug or a blue dot for a task, number, title, then on the right: state pill, due date, project pill (All projects), 🧑 or 🤖.
- Search filters by number or text. **All / 🧑 Mine / 🤖 Claude's** filters by owner. The funnel filters by type (tasks, bugs) and due date (any, due within 7 days, has one, has none).
- **+ Task** creates a task in a chosen epic with title, type and owner, at the bottom of Active.
- **Detail pane:** number, epic, title, type, owner, project; state, owner and deadline editable; created and updated times; the description (editable); done when; comments with author and time, and a box to add one. Text size A− / A+, 12 to 22 px, starting at 15.
- **Column widths:** dragging the gap between two columns resizes them; the middle column takes what is left. Double-click a gap to reset it. Focused, a gap moves 20 px with the arrow keys. Widths are kept per browser. Below 1100 px wide the layout stacks and the gaps do not drag.
- **Live updates.** A change on disk shows on the page within about a second, with no refresh: a task, epic or doc changed through the CLI, by Claude editing a file, by git, or in another browser tab. The server watches each project's docs folder, the docs folder of each epic worktree, and the app's data folder, and tells every open page that something changed; the page then reloads what it shows.
- A reload waits while Tabu is typing in a text field, dragging, or has a menu or a new-item form open, and runs as soon as that ends. A focused dropdown or checkbox does not hold it.
- When the server stops and comes back, the page reconnects by itself and reloads once.

## Docs

Each project's docs folder (design, specs, architecture) is read and edited in place in a Docs view beside the Board. Doit keeps no copy. Claude edits docs as files, as it does today; the view is for Tabu.

- **Board / Docs** in the top bar switches the view. The Docs view shows the selected project; in All projects it shows the first project and says so.
- Three panes: **Documents** (the folder tree), the **document**, and **Linked**.
- **The tree** lists the Markdown files of the docs folder, folders first, by name, with numbers compared as numbers (`0.9` before `0.10`). `Archive/`, `Epics/Tasks/` and `Standard/` are left out. `Epics/Completed/` is listed but folded until clicked.
- **The document** is rendered with the epic view's renderer plus tables. Above it: its path and who changed it last, from git (author and date of the last commit that touched it; "not committed" when none).
- **Edit** swaps the rendered page for a plain text box with the file's text; **Done** writes the file and shows it rendered again. Text size A− / A+ applies, as in the Detail pane.
- **Linked** lists the project's open tasks whose description or done-when names the document's file name (`Design.md`); clicking one opens it on the Board.
- **Linked can be closed** with × in its header; it folds to a thin rail at the right edge, which opens it again. Closed or open is kept per browser.
- **Column widths** are dragged as on the Board, but kept apart from the Board's: each view remembers its own.
- Paths are always inside the docs folder: a path with `..`, an absolute path, or one into a hidden folder is refused. Only `.md` files are read or written.
- Docs are read and written in the project folder, not in an epic's worktree.
- Pictures in a document are not shown yet; the Confluence import epic (EPIC-009) brings them.

## Claude view

One page shows what Claude is working on, what it waits on Tabu for, and what changed. Everything on it comes from task data and the activity log; it keeps no state of its own.

- **Board / Docs / Claude** in the top bar switches the view and keeps the selected project. Claude carries a badge reading `<n> due`, the count of Tabu's tasks due within 7 days (the Board's "due within 7 days" filter on 🧑 tasks); its tooltip says so, and the tasks it counts are listed in the Claude view under Waiting on you.
- Three panes: **Working on now**, **Waiting on you** (Blocked on you, then Due within 7 days) with **Up next for Claude** below it, and **Activity log**.
- **Working on now:** AI tasks In progress. **Up next:** AI To-do tasks in rank order.
- **Due within 7 days:** Tabu's open tasks with a deadline 7 days away or nearer, soonest first: what the badge counts.
- **Blocked on you:** human To-do tasks with a `blocks: T-<id>` field naming the AI task they hold up. The field is set with `doit set <project>/<T-id> blocks=T-<id>` or in the Detail pane, and is kept in the task file.
- A card shows number, project pill, title and last change. Clicking it opens that task on the Board.
- **Activity log:** every change to a task, from the CLI or the page, appends one line (time, project/task, what changed) to `activity.log` in the app's data folder. Lines older than 30 days are dropped on write. The pane shows the newest first.
- **Morning run:** a scheduled task in the Claude desktop app, 07:00 on weekdays, that runs `doit morning`. The command sweeps, then writes one report block to the activity log across all projects: tasks swept, AI tasks In progress, the top three AI To-do tasks, Blocked on you, and Tabu's tasks due within 7 days. It changes nothing beyond what the sweep does. It runs only while the app is open and the Mac awake.

## Marketing

Game profiles and contacts are built (EPIC-012); mail, festivals and campaigns are not. Doit becomes the marketing tool for every game and for Hidden by Design: who to contact, about which game, and which festivals to enter. The problem it solves is that outreach does not happen without a system, and time for it is short, so Doit picks the few relevant contacts and events and hides the rest.

When sitting down for outreach the order is festivals first, then people, then campaigns. The build order differs, because everything matches against the game profiles:

1. **Game profiles.** One per project that is marketed (Bunny Bunker, Rapid Rocket Racing, Good Box and the others, Hidden by Design): genre tags, platforms, stage (in development, demo, released), release date, and what it needs now (wishlists, demo players, press). A profile's kind is its project's kind (section Projects). It is kept in the game's own project as `<docs>/Marketing/Profile.md`, and the game is that project's id; `doit profile add <project>` writes the template. A project with a kind but no file yet is still offered, marked as having no profile. A game without a Doit project keeps its profile as `Docs/Profiles/<game>.md` in the Polyspice Marketing project, with a `Kind:` line. Edited in the Docs view and tracked by the project's git.
   - **The Marketing folder.** `<docs>/Marketing/` holds what marketing uses about a game: the profile, and each release's notes in `Marketing/Releases/<version>/`, so marketing finds everything in one place.
2. **Contacts.** A contact is a person, outlet or event. It has one or more types: influencer, blogger, press, publisher/distribution, tester, festival, conference (with a topic tag: game dev, podcast, design). Its fields: name, channels (YouTube, Twitch, Bluesky, X, Instagram, Facebook, Discord, Steam, website, Linktree), email, reach (a follower count: the contact's largest audience on one channel, as last counted; Claude keeps it current while researching), notes, status (active, dormant, archived) and the games it fits.
   - **Fit** links a contact to a game profile with a one-line reason. Claude decides fit, by researching the contact (what they play, how recently they post, their size) in batches of 20 to 30, largest reach first. Tabu corrects it.
   - **Touches** replace the sheet's Replied and Posted Video columns: a log per contact of mails sent, replies and videos posted, each dated and tied to a game.
   - **Next contact** is a date on the contact; when it comes, the contact shows as due, for the games it fits.
   - First import: the Google Sheet `Marketing Contact List`, tab New Streamers (227 contacts, mostly YouTube). Its BB1 and BB2 columns were old campaigns and are not imported.
   - **Storage:** SQLite, one file `marketing.db` in the app's data folder, through Node's built-in `node:sqlite` (Node 24, so no dependency). Contacts are personal data shared across projects and are queried more than read, so they are not files in a project's git. Tables: contacts, channels, fit (contact, game, reason), touches (contact, game, date, kind), events (the event of a festival or conference), drafts. Game profiles stay Markdown and are referred to by project id. The page and the CLI are the only ways in; Claude asks the CLI for a slice, as with tasks.
3. **Mail.** Doit uses Tabu's Google Workspace account over IMAP and SMTP, with an app password kept in the macOS Keychain.
   - Doit only reads one label, **Marketing**. Mail from an address on the contact list is moved there from Inbox and logged as a touch; other mail is never opened.
   - Sending: one template per pitch (game, hook, trailer, Steam link, the ask), plus one or two personal lines per contact that Claude drafts from the contact's research. Claude only writes drafts; Tabu approves each mail before Doit sends it. A copy lands in Marketing.
   - Sending and reply detection come first; reading full mail (attachments, HTML) after.
4. **Festivals and conferences.** Contacts of type `festival` or `conference` that also carry an event: `year` (one contact per name and year, so a rerun of the gathering updates and next year's edition is a new contact), `starts` and `ends` (dates), `deadline` (the application deadline), `cost` (text, `free` or `$100`), `where` (steam, epic, gog, itch, physical, online), `criteria` (`genres`, `stages` the event accepts: in development, demo, released, and `platforms`) and a watching state (watching, applied, accepted, declined, past). A conference also has a topic (game dev, podcast, design). A past event is set to `past`, never deleted. Sources: Steam, Epic, GOG and itch event pages and howtomarketagame.com/festivals, gathered by a scheduled Claude task rather than code in the app.
   - **The matching rule.** An event shows for a game when every criterion it gives holds against the game's profile: a genre in common, the game's stage among the stages, a platform in common (compared without case). A criterion left empty is not checked. An event with no criteria at all shows for every game, marked "criteria unknown". Past events and events whose deadline has passed are not offered for a game.
5. **Campaigns.** A campaign is an epic in the Polyspice Marketing project with a `Game:` line naming its profile and optionally an `Event:` line, a festival's id or a date (Bunny Bunker at Next Fest); both sit under `Status:`. Its tasks are steps and outreach.
   - **The contact field.** A task may carry `contact: <contact id>`. Ticking it done logs a touch (mail) on that contact for the campaign's game, with the task as its ref, so ticking it twice logs once.
   - **Add contacts.** On an open campaign, the button (or `doit campaign contacts`) makes one task per contact: `Reach out to <name>`, owner human, with the contact set. It picks contacts that are active, fit the game, are not due later than the event (a festival's start, else its deadline, or the date) and are not already on a task of the campaign, largest reach first, up to a limit (default 10). Nothing is added without that click or a Claude run.
   - **The weekly list.** Up to 5 contacts (open campaign tasks with a contact first, then contacts due for a game they fit, oldest due first), every festival whose deadline falls within 14 days and that fits a game, and up to 3 open campaign steps without a contact. It shows as the This week pane at the top of the Marketing view and as lines in the morning report; an empty week says `Outreach this week: nothing`.

**The Marketing top bar.** In the Marketing view the project chips and the Projects menu are gone, since contacts, drafts and festivals belong to no project. In their place, first, a **game or podcast** dropdown (the profiles, grouped as games, applications and podcasts, or Any), then Marketing's own tabs in this order: **Campaigns**, **Contacts**, **Festivals**, **Events**, **Drafts**, **Overview**. The pick filters every tab. Campaigns lists the campaign epics (open first) and opens one on the Board. Contacts lists people only: festivals and conferences have their own tabs. Festivals lists events of type festival that fit the game, Events those of type conference. Overview is the This week pane, on its own so the other lists get the full height. The Board, Docs and Claude views keep the projects.

Left out: following people on social media to answer their posts. The platforms' APIs are closed or unstable; a recurring "check these people" task stands in for it.

**Open questions.**
- Which two categories contacts are split into after research.
- Each game's stage and its next festival or release date, which decides which profile comes first.

## Look

Blueprint: the board reads as a drafting sheet. It replaces the greyscale wireframe look; there is one style, no picker. Light and dark follow the system setting.

- **Colour.** Light: pale blue sheet (`#e6eef8`), near-white panes, navy ink (`#0f2a4a`), one technical blue for selection and lines (`#0b61d6`). Dark: navy sheet (`#0b2545`), deeper navy panes, pale blue ink, sky blue accent (`#7cc4ff`). Warning orange and success green stay semantic, apart from the accent.
- **Type.** IBM Plex Sans for text, IBM Plex Mono for numbers, ids, dates and labels.
- **Sheet.** A faint 20 px grid behind the panes, in the accent at about 8 % opacity.
- **Corners.** Panes, buttons, chips and pills have 2 px corners. Things that float or pass (popups, empty states, cards, forms, the error toast) keep 6 px corners, and the count badge is round, so they read as apart from the sheet.
- **Panes.** Outlined in the accent. Pane headers in mono capitals, accent coloured, with a small square bullet, over a dashed rule.
- **Rows and selection.** Rows divided by dashed rules, square corners. The selected row or epic gets an accent outline on a light accent fill. The active tab is underlined in the accent.
- **Progress.** Epic bars are segmented like a scale rule, filled in the accent.
- **Detail.** The field block has a dashed outline instead of a grey fill.
- **Logo.** A checkmark in a circle over a drafting frame, cyan with orange crop marks, on a navy rounded square. The board shows it (`web/logo.svg`) before the name in the top bar and as the tab icon; the launcher uses the same logo in the macOS icon grid (`launcher/icon.svg`), which `launcher/build.sh` turns into the app icon, removing the applet's own asset catalog so macOS shows it. The logo keeps its own colours and is not themed.
- Every colour comes from a token defined for light and dark; no literal colour in a component rule.

The comparison of the five candidate styles, with this one as "Blueprint", is the private artifact `Doit Style Options` (claude.ai/artifact/L8qjksrvdhpyhEDjTd4unB).

## The CLI

`node bin/doit.js <command>`. Every command sweeps first (deadline and retention archiving). Output is one line per task, or JSON with `--json`.

- `projects`, `project add <name> <folder> [--docs Docs]`
- `list [--project <id>] [--epic EPIC-<nnn>] [--state open|active|backlog|done|archived] [--owner ai|human]`: default open tasks of every project, never archived ones unless asked.
- `show <project>/<T-id>`, `add <project> <EPIC-nnn> <title> [--owner] [--type] [--done-when] [--deadline] [--state]`, `set <project>/<T-id> key=value ...`, `comment <project>/<T-id> <text> [--as human]`, `epic add <project> <name>`, `epic close <project> <EPIC-nnn>` (archives the epic's task files, sets it Done, writes its `Closed:` date and moves it to Completed/), `sweep`, `morning` (sweeps and writes the morning report to the activity log, section Claude view).
- Contacts (section Marketing): `contacts [--type t] [--fits <game>] [--status s] [--due] [--reach <n>] [--json]` (one line per contact: id, name, types, reach, status, next contact with `due` marked, the games it fits; due first, then largest reach), `--reach <n>` keeps contacts with a reach of at least n; `contacts import <file>` (the New Streamers CSV, where a follower count is kept and an A to E band letter is not a count, so it goes into notes as `Sheet reach: C` and reach stays empty; a re-import updates by email or YouTube link), `contact show <id> [--json]`, `contact add <name> --type a,b [--email] [--reach] [--topic] [--notes] [--status] [--next] [--channels kind=url,...]`, `contact set <id> key=value ...`, `fit <id> <game> <reason>`, `touch <id> mail|reply|video [--game] [--date]`, `profiles`. A refused value prints the message and exits 1.
- Festivals (section Marketing): `festivals [--fits <game>] [--deadline-within <days>] [--state s] [--json]` (one line per festival or conference: id, name and year, deadline with days left, cost, where, watching state; by deadline, past-state ones hidden unless `--state past`; `--fits` keeps those whose criteria match the game's profile and whose deadline has not passed, and marks `criteria unknown`; `--deadline-within n` keeps deadlines from today to n days ahead), `festival upsert <name> --year <y> [--type] [--topic] [--starts] [--ends] [--deadline] [--cost] [--where] [--genres] [--stages] [--platforms] [--url] [--notes] [--state]` (finds the festival by name and year and updates only the fields given, else adds it, so a rerun never duplicates), `festival set <id> state=<state>`.
- Mail (section Marketing): `templates`, `draft add <contact id> --template <name> --game <game> --personal <text>` (prints the draft id and the filled mail), `draft show <id> [--json]`, `drafts [--state s] [--json]`, `mail sweep` (logs replies from contacts as touches and moves them to Marketing). Nothing in the CLI approves or sends: Tabu does that in the page.
- Campaigns (section Marketing): `campaign add <project> <name> --game <game> [--event <festival id|YYYY-MM-DD>]` (prints the epic id), `campaign contacts <project> <EPIC-nnn> [--limit n]` (makes the contact tasks, prints each ref and contact), `outreach [--json]` (the weekly list). `add ... --contact <id>` and `set ... contact=<id>` tie a task to a contact; an unknown id is refused.

## Running it

`launcher/Doit.app` (built by `launcher/build.sh`) is a stay-open applet: double-click starts the server and opens `http://localhost:4317`; quitting it stops the server. If a server is already running on the checked-out commit, it only opens the page; one on another commit (`GET /api/version`) is stopped and the current code started. No terminal is needed.

## Data

- The project list and settings: `~/Library/Application Support/Doit/settings.json` (`DOIT_HOME` overrides it). Kept until deleted.
- The activity log: `activity.log` beside the settings, 30 days.
- Tasks and epics: Markdown in each project's docs folder, tracked by that project's git. Nothing leaves the machine. No personal data beyond names Tabu types.
- Contacts: `marketing.db` beside the settings (SQLite): names, emails, channel links and notes of marketing contacts. Personal data, kept only in the data folder and in no project's git. Mail drafts are in the same file (table `drafts`: contact, game, template, personal lines, subject, body, state, sent time, Message-ID, error, whether the copy is labeled Marketing); a touch also carries a note (the mail subject) and a ref (the Message-ID, so a mail is never logged twice).
- Mail account: settings key `mail` (`address`, `name`, `dailyCap`, default 20). The app password is in the macOS Keychain (generic password, service `doit-mail`, account the address), never in a file.

## Changelog

- 2026-11-20, EPIC-001: first version, from the interview (`Brief.md`) and the wireframe.
- 2026-11-20, EPIC-005: clicking an epic opens a read-only view of its document; the task filter moves to a Filter button on each epic. `epic close` is added to the CLI.
- 2026-11-20: clicking an epic both filters the list and shows the epic's document in the Detail pane; the separate Filter button and the full-width epic view are gone.
- 2026-11-20: the three columns are resized by dragging the gaps between them.
- 2026-11-20, EPIC-008: the Blueprint look replaces the greyscale wireframe look (section Look), chosen from five candidate styles.
- 2026-11-20: a project's docs folder is `Docs/` by the standard again; other names are only for projects not yet renamed.
- 2026-11-20: the Doit logo, in the top bar, as the tab icon and as the launcher icon (section Look).
- 2026-11-20, EPIC-007: an epic with a worktree has its files read and written there (section Epics).
- 2026-11-20, EPIC-003: the Docs view: tree, rendered document with edit, and Linked tasks (section Docs). The Confluence import moves to EPIC-009.
- 2026-11-20, EPIC-010: an epic is closed from the page; closed epics show in a Closed section, then after the keep setting in a folded Archived section (section Epics). Replaces "Epics in Completed/ are not shown".
- 2026-11-20: the Docs view keeps its own column widths, apart from the Board's, and its Linked pane can be closed to a rail and opened again (section Docs).
- 2026-11-20, EPIC-004: the Claude view, the activity log, the `blocks` field and the morning run (section Claude view); the morning run is a desktop app schedule and only reports.
- 2026-11-20, EPIC-011: a folded Parked section joins Completed (was Closed) and Archived, all folded; epics move between open, Parked, Completed and Archived by dragging, and a closed epic reopens with its tasks (section Epics).
- 2026-11-20: the top bar shows only starred projects; every project, its star and + New project sit in a Projects menu.
- 2026-11-20: the Marketing section, designed but not built: game profiles, contacts with fit decided by Claude, mail through the Workspace account, festivals, campaigns; build order and open questions (section Marketing).
- 2026-11-20: contacts are stored in SQLite (`marketing.db`, built-in `node:sqlite`); the sheet's BB1 and BB2 columns are not imported (section Marketing).
- 2026-11-20, EPIC-012: game profiles all live in the Polyspice Marketing project, not in each game's project (section Marketing).
- 2026-11-20, EPIC-015: campaign epics also live in the Polyspice Marketing project; EPIC-013 to EPIC-015 planned, EPIC-016 parked (section Marketing).
- 2026-11-21: live updates replace the 10-second reload: the server watches the docs and data folders and tells the page; only typing, dragging or an open menu or form holds a reload (section Tasks).
- 2026-11-21, EPIC-012: contacts are built in `marketing.db` (`node:sqlite`, Node 24), with game profiles read from the Polyspice Marketing project; Data names the file and its personal data.
- 2026-11-21, EPIC-012: the CLI gets the contact commands (`contacts`, `contacts import`, `contact show|add|set`, `fit`, `touch`, `profiles`).
- 2026-11-21, EPIC-012: reach is a follower count instead of the sheet's A to E band; Claude collects the counts while researching, which makes a band's manual estimate unnecessary.
- 2026-11-21, EPIC-013: mail details decided: settings key `mail`, Keychain service `doit-mail`, a template is `Templates/<name>.md` in the marketing project (first line `Subject:`, placeholders `{{name}}`, `{{personal}}`, `{{game}}`), drafts live in `marketing.db` (schema version 2, touches gain note and ref); version 3 adds the `events` table.
- 2026-11-21, EPIC-014: festival and conference event fields (year, starts, ends, deadline, cost, where, criteria, watching state) and the matching rule fixed (section Marketing, step 4).
- 2026-11-21, EPIC-014: in the Marketing view the top bar shows Marketing's tabs (Contacts, Drafts, Festivals, Campaigns) instead of the projects (section Marketing).
- 2026-11-21, EPIC-015: campaigns are specified: `Game:` and `Event:` lines, the task `contact` field with a touch on completion, Add contacts, the weekly list (5 contacts, 3 steps, 14 days), the This week pane and the campaign and outreach commands (sections Marketing and The CLI).
- 2026-11-21, EPIC-019: the navy logo in the top bar and on the launcher; the Claude badge reads `<n> due` and its tasks show under Waiting on you; numeric order in the docs tree; profiles in each project's `Marketing/` folder with release notes beside them; the Marketing top bar gets a game picker and the tabs Campaigns, Contacts, Festivals, Events, Drafts, Overview (sections Look, Claude view, Docs, Marketing).
- 2026-11-21, EPIC-020: a project has a kind (game, application, podcast), set in the Projects menu or the CLI and kept in the settings; the Marketing picker and the profiles take it from there (sections Projects, Marketing).
