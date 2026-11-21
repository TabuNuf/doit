# EPIC-023: Review 2026-11-21 (2): board layout, project settings and contacts

Status: Active
Goal: a project's epics and docs read as two labelled lists with its settings one click away beside its name, Marketing offers only the projects Tabu sells, and contacts sort, show who matters, and serve campaigns for several games.
Design: Design.md, sections Projects, Epics, Docs and Marketing (T-023.1 updates them first)
Source: review video Bandicam_20261121_151540.mp4, narrated by Tabu; times in each task's description

## Tasks

- [x] T-023.1 Design.md: this epic's decisions in sections Projects, Epics, Docs and Marketing, with a Changelog line (done when: Design.md says each rule in T-023.2 to .9 and the Changelog has a 2026-11-21 line; Tabu has read it)
- [x] T-023.2 Board left pane: Epics and Docs always both shown, each under its own headline, with a separator and white space between; the toggles go (done when: a web test selects a project and sees an Epics headline over the epic list and a Docs headline over the doc tree below it, divided by a rule, and finds no Epics or Docs toggle)
- [x] T-023.3 Docs tree leaves out the Epics folder, since epics have their own list above (done when: a web test opens Bunny Bunker's docs and finds no Epics/ folder or EPIC-*.md file in the tree; an epic still opens from the Epics list)
- [x] T-023.4 Project settings open from a gear icon right of the project name in the left pane, in place, without switching the top-bar view; the Settings button leaves the top bar (done when: a web test clicks the gear beside Bunny Bunker and sees kind and marketing profile in the middle and right columns while Board stays the selected view; a second click or selecting a task brings the task layout back; no Settings button in the top bar)
- [x] T-023.5 A project can be marked not marketed: a Marketed switch in project settings and doit project set <id> marketed=no; a not-marketed project keeps its kind but leaves the Marketing picker, + Campaign's project list, Overview and fit (done when: domain, CLI and web tests set Doit to not marketed and no longer find it in the Marketing picker or the + Campaign list, and its kind is still application; Doit, Day Drop and HBD Shorts are set not marketed in the settings file)
- [x] T-023.6 Contacts list as columns with headers: Name, Type, Reach, Status, Last contact, Last active; a click on a header sorts by it, again reverses (done when: a web test sees the six column headers, sorts by Last contact newest first, then by Last active, and the order follows the dates; the sort is kept per browser)
- [x] T-023.7 Contacts carry a special relationship: a mark and a one-line reason, set in the contact pane and with doit contact set special=<text>, shown in the list row and pane (done when: domain, CLI and web tests set a reason on Special Geek 40, see the mark in the list row with the reason as tooltip and in the pane, and clear it; the field is in marketing.db)
- [x] T-023.8 Campaigns for several projects: + Campaign and doit campaign add take more than one project; the Game: line lists them; Add contacts picks contacts that fit any of them (done when: domain, CLI and web tests create a campaign for Bunny Bunker and Box Trainer, see both on its Game: line and in the Campaigns list for either pick, and Add contacts takes contacts fitting either; a ticked reach-out logs one touch per game)
- [x] T-023.9 Marketing profiles drafted from docs: Claude reads each marketed project's design docs and writes its Marketing/Profile.md (genres, platforms, stage, release date, needs now) for Tabu to correct (done when: every marketed project with a kind has a Profile.md whose fields name the doc they came from in a comment; the Marketing pane shows a profile for Box Trainer; Tabu has corrected them)

## Test plan

- Batch A: T-023.1 to .5 (design, left pane, docs tree, gear settings, not marketed): development
- Batch B: T-023.6 to .8 (contact columns and sort, special relationship, multi-project campaigns): development, plus a migration run on a copy of marketing.db
- Batch C: T-023.9 (profiles from docs, after .5): a hand run, then the Audit tests at close

## Notes

Decisions and deviations, newest first.

- T-023.9: profiles drafted from the docs, not checked by Tabu, in each project's `Marketing/Profile.md`: pantry, clobberbop, box-trainer, rabbit-rocket-mobile, rabbit-rocket-steam, princess-and-unicorn, flick-the-ball, weight-control, bunny-bunker. Each field has an HTML comment on the next line naming its source doc, or "not in the docs". Written in the other repositories, not committed there. Skipped: polyspice-marketing (no kind), doit, day-drop, hbd-shorts (not marketed). Release and Needs are empty everywhere; Stage keeps the template's "in development" where the docs give no stage.
- T-023.8: `doit campaign add` takes several projects as `--game a,b` (the project argument is still where the epic lives); the + Campaign form uses checkboxes. Checkbox look unchecked in the app.
- T-023.7: marketing.db goes to schema version 5 (special column, empty default); tried on a copy of the real db (266 contacts kept). Pane field and mark look unchecked in the app.
- T-023.6: with no header clicked the list keeps its Due and Others groups; a click gives one flat list in the chosen order. Column layout and look unchecked in the app (web tests cover headers and order).
- T-023.1 ticked with 'Tabu has read it' still open: Tabu reads Design.md at the epic's review.
- Assumptions for Tabu to confirm at T-023.1: 'these need to go away' (05:23) is the Epics folder in the doc tree; Last active is the contact's newest reply or video, Last contact ours; 'not marketed' is a switch beside the kind, so a project keeps its kind.
- Not taken from the video: 05:11 'Hidden by Design Shorts' rename, taken back at 05:17; 02:57 to 03:26 'this reach needs to be different, we have festivals, we have events' trails off, read as part of the columns request (T-023.6); 00:47 'No such API route' on Marketing, gone after a restart (stale server); 04:23 campaigns 'a little bit unsure', no request.
- Approved as is: Docs rendering and Edit (01:18 to 01:36), the contact pane (02:57).

## Close audit

## For the standard
