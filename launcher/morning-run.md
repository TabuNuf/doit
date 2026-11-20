# Morning run

A scheduled task in the Claude desktop app runs Doit's morning report. Tabu creates it once, by hand; nothing in this repo creates it.

- **Name:** Doit morning run
- **Schedule:** weekdays at 07:00
- **Folder:** `/Users/tabu/Repos/doit` (the main checkout)
- **Runs only** while the desktop app is open and the Mac is awake.

## Prompt

Copy this as the task's prompt:

```text
Run this command once and change nothing else:

node /Users/tabu/Repos/doit/bin/doit.js morning

It archives what is past its deadline or retention, then writes the morning report to Doit's activity log and prints it. Reply with the printed report, word for word. Do not start, edit, comment on or close any task, and do not run any other doit command. If the command fails, reply with its error and stop.
```

## What it writes

Six lines under `morning` in `activity.log`, shown in the Claude view's Activity log:

1. `Morning report <date>`
2. `Swept <n>: <tasks>`: what the sweep archived
3. `In progress <n>: ...`: AI tasks In progress
4. `Up next ...`: the top three AI To-do tasks
5. `Blocked on you <n>: ...`: human To-do tasks with `blocks`
6. `Due within 7 days <n>: ...`: Tabu's open tasks due within 7 days
