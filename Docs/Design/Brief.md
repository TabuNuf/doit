# Doit: brief

From the scoping interview on 2026-11-20.

## The job

A local task and documentation system that you and Claude both use, which replaces Jira and Confluence over time and also runs the marketing side: events, community threads and influencer outreach, turned into tasks automatically.

## The why

Jira and Confluence cost money and do not fit an automated way of working with Claude. Jira is barely used for tasks any more. You need one place that shows what Claude is working on, what you are supposed to do, and what the market is asking of you this week.

## The guardrails

- Jira and Confluence stay live during the transition. Cancel them only once they are no longer opened.
- Pilot on one project first. Migrate the rest once the pilot works. After that, this app is the home for epics, tasks and docs.
- Organise projects by the ClaudeStandards conventions (`~/Unity/ClaudeStandards/Standard`), ignoring the Unity-specific parts.
- Claude may do anything the user can do in the app, automatically.
- No terminal to start it. Decided 2026-11-20: a `Doit.app` launcher you double-click, built like `~/Claude/Weather And Time/weather-time-app/launcher` (AppleScript applet that starts the Node server and opens the page). No start-at-login service.
- Storage is Markdown in each project's `Docs/`: one file per epic in `Docs/Epics/` (checklist only), one file per task for description and comments, `Epics/Completed/` for completed, `Docs/Archive/` for archived. Claude reaches tasks only through a `doit` CLI.
- Tasks have comments, from both you and Claude.
- Make routine judgment calls yourself. Ask only if the answer would change the whole result.

## Done means

**Board**
- Switch between projects quickly, plus an All Projects view where every task carries a project pill.
- Left pane: epics with task counts as progress. Clicking one filters the list to its tasks and bugs.
- Search at the top by task number or description.
- Right pane: task detail with an easy-to-read description and font size up and down.
- Create projects and epics by hand.
- Three tabs: Open, Completed, Archive.
  - Open is one column in two sections. Active on top (to-do and in progress, ranked, reorder by hand, a pill on each row shows which). Backlog below.
  - Completed holds finished tasks for a set number of days (default 14, adjustable), then moves them to Archive. A completed task can be reopened.
  - Archive is never read by Claude.
- Timestamps on every item. Optional deadline per item: when it passes, the item is archived.
- Claude reads only the slice it needs (one project, one epic, open tasks), never the whole store.
- AI/Human tag, filterable.

**Docs**
- Each project's specifications, requirements, design docs and art bible live locally, readable and editable by both you and Claude.

**Marketing**
- Automatic fetch of Steam and Epic events and others that fit a profile, added as tasks.
- Reddit threads worth replying to, via Day Drop.
- Influencer contact database: value per contact, reminders per release, paced so nobody is contacted too often.
- A daily or weekly Claude run that plans the week.

## Open questions

- The event profile: which genres, platforms, regions, costs and event types count as a fit.
- Daily or weekly for the planning run.
- Which project is the pilot.
- Whether the app reads epics and docs from each project's own `Docs/` folder in place, or imports them once.
