# EPIC-024: Review 2026-11-21 (2) corrections: Epics and Docs buttons, kind in settings only

Status: Active
Goal: the left pane and the Projects menu do what the 2026-11-21 15:15 review asked, where EPIC-023 misread it, and the three comments EPIC-023 left out get an answer.
Design: Design.md, sections Projects, Epics, Docs (T-024.1 updates them first)
Source: second pass over review video Bandicam_20261121_151540.mp4; times in each task's description

## Tasks

- [x] T-024.1 Design.md: Epics and Docs buttons in the Projects header for all projects; kind set only in project settings; the Epics folder back in the doc tree; Changelog line naming what EPIC-023 misread (done when: sections Projects, Epics and Docs say the rules of T-024.2 to .4, the Changelog has a line, and Tabu has read it)
- [x] T-024.2 Left pane: the Epics and Docs buttons sit in the Projects header, beside the title, and apply to every project shown; with both on each project shows an Epics headline, a separator with white space, then a Docs headline (done when: a web test sees the two buttons in the pane header and none in a project's group; turning Docs off hides every project's tree in All projects; with both on the Epics and Docs headlines and the rule show; the choice is kept per browser)
- [x] T-024.3 Projects menu: the kind select leaves each project's row; kind is set only in the project's settings (the gear) and with doit project set (done when: a web test opens Projects and finds no kind select in any row; the kind still changes from the gear's settings; CLI unchanged)
- [x] T-024.4 Doc tree: the Epics folder comes back, with Epics/Completed folded until clicked, as before EPIC-023 (done when: a web test sees Epics/ in Bunny Bunker's tree and Epics/Completed folded; Epics/Tasks stays left out)
- [ ] T-024.5 Tabu decides: what confuses in the Claude view (1:44), e.g. the activity log's run of near-identical 'archived: Epic EPIC-024 closed' lines (done when: Tabu has named what confuses and a task for it is added to this epic)
- [ ] T-024.6 Tabu decides: how reach should differ (3:17) (done when: Tabu has said what reach should show and a task for it is added to this epic)
- [ ] T-024.7 Tabu decides: profiles from docs as a feature (4:25) or the one-off run done in T-023.9 (done when: Tabu has picked one; for the feature a task is added (a 'Draft from docs' button in project settings that has Claude fill the profile))

## Test plan

- T-024.5 to .7 are Tabu's; each answer adds a task to Batch B. Batch A does not wait for them.
- Batch A: T-024.1 to .4 (design, Epics/Docs buttons, kind out of the menu, Epics folder back): development, then a look in the running app on a copy of the data folder.
- Batch B: the tasks that T-024.5 to .7 add: development, then the Audit tests at close.

## Notes

Decisions and deviations, newest first.

- T-024.1: ticked with "Tabu has read it" still open; Tabu reads the Design.md changes.
- Why this epic: EPIC-023 was planned from the transcript plus a frame every 10 to 60 seconds, so two comments were matched to the wrong screen element. The second pass read the mouse position frame by frame at each comment. 0:16, the mouse is in the PROJECTS header (Epics/Docs buttons belong there, not removed). 5:26 to 5:38, the mouse is on the kind selects in the Projects menu (those go, not the Epics folder).
- Kept from EPIC-023: the gear (0:51 to 1:04), contact columns (3:38), the special mark (3:51), multi-game campaigns (4:57), the not-marketed switch (5:39).

## Close audit

## For the standard

- Candidate for `Core/01-Tasks.md`, Reviews: plan from a narrated review video by reading the pointer position at each comment (a frame every 1 to 2 seconds around it), not from the transcript alone; "these", "here" and "up here" name what the pointer is on.
