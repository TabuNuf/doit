# Festivals run

A scheduled task in the Claude desktop app gathers festivals, showcases and conferences into Doit. Tabu creates it once, by hand; nothing in this repo creates it.

- **Name:** Doit festivals run
- **Schedule:** weekly, Monday at 07:00, beside the morning run
- **Folder:** `/Users/tabu/Repos/doit` (the main checkout)
- **Needs** web access. Runs only while the desktop app is open and the Mac is awake.

## Prompt

Copy this as the task's prompt:

```text
Gather festivals, showcases and conferences for Doit. Read only public pages. Change nothing but festivals and one activity-log line.

Sources, in this order. If one cannot be read, skip it and name it in the summary:
1. Steam: the Steam Next Fest, seasonal sales and publisher festivals on store.steampowered.com/sale and the Steam events page
2. Epic Games Store: its announced festivals and showcases
3. GOG: its festivals and "Dreamlist" or demo events
4. itch.io: itch.io/jams and its sales and festival pages
5. howtomarketagame.com/festivals: the public part only; never log in

Look ahead three months from today. For each event, read these from its own page, not from a summary of it:
- name and year (the edition, e.g. 2027); the dates it starts and ends (YYYY-MM-DD)
- the application or submission deadline (YYYY-MM-DD); leave it out when the page gives none
- cost: "free" or the fee as written
- where: one of steam, epic, gog, itch, physical, online
- criteria: genres (lower case words such as co-op, puzzle, roguelike), stages (only from: in development, demo, released) and platforms (e.g. steam, switch). Give a criteria list only when the page states it. Never guess: a festival with no stated criteria gets no criteria flags, and Doit then shows it for every game as "criteria unknown".
  - a page that asks for a playable demo: --stages demo
  - one that asks for an unreleased game: --stages "in development,demo"
  - one that takes released games only: --stages released
- an event that is a conference gets --type conference and --topic: game dev, podcast or design (one of these). Podcast and design events are for Hidden by Design.

First run `node /Users/tabu/Repos/doit/bin/doit.js festivals --json` to see what is already there. Then, per event, run exactly one command. A rerun updates the event of the same name and year, and fields you leave out stay as they were:

node /Users/tabu/Repos/doit/bin/doit.js festival upsert "<name>" --year <yyyy> --starts <YYYY-MM-DD> --ends <YYYY-MM-DD> --deadline <YYYY-MM-DD> --cost "<cost>" --where <steam|epic|gog|itch|physical|online> --genres <a,b> --stages <demo,...> --platforms <a,b> --url <the event page> --type festival

Leave out any flag you have no fact for. For a conference use --type conference --topic "game dev". Use --state only to leave watching. For an event whose end date is before today, run:

node /Users/tabu/Repos/doit/bin/doit.js festival set <id> state=past

(ids come from the festivals list). An upsert prints "Added festival <id>: ..." or "Updated festival <id>: ...": count them. A command that fails prints its reason: read it, fix the value once, otherwise skip that event and count it as failed.

Last, write one summary line, nothing more to the log:

node /Users/tabu/Repos/doit/bin/doit.js log festivals "Festivals run <YYYY-MM-DD>: <a> added, <u> updated, <p> marked past, <f> failed; sources read: <names>; skipped: <names or none>"

Reply with that line. Do not run any other doit command, do not touch tasks, contacts or drafts, and do not send mail.
```

## What it writes

- Festivals and conferences as contacts, shown in the Marketing view's Festivals tab and by `doit festivals`.
- One line under `festivals` in `activity.log`, shown in the Claude view's Activity log: `Festivals run <date>: <a> added, <u> updated, <p> marked past, <f> failed; sources read: ...; skipped: ...`.

## Notes

- The summary line comes from `doit log <name> <text>`, which writes one activity-log line under a name that is not a task.
- Whether Tabu has paid access to the howtomarketagame.com list is open; the run reads only what is public.
