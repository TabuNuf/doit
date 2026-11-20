# EPIC-010: Close epics

Status: Active
Goal: Tabu closes an epic from the board; it shows under Closed, then after the keep setting under a folded Archived section.
Design: Design.md, section Epics.

## Scope

- Decided: Close epic sits in the epic document's header, for open epics only, behind a confirmation. It runs the same path as `epic close`.
- Decided: closing writes `Closed: <YYYY-MM-DD>` under the status line, so the date travels with the file.
- Decided: Closed and Archived are two views of `Epics/Completed/`, split by the `Closed:` date against the keep setting (14 days, shared with tasks). No file moves between them. A completed epic with no `Closed:` line is Archived.
- Decided: the CLI's `epics` stays open-only.

## Tasks

- [x] T-010.1 (dc4239c) Closing writes the `Closed:` date, and the board view returns closed epics with their date and whether they are archived (done when: a domain test closes an epic and sees it as closed, then as archived 15 days later; an epic in Completed/ without the line comes back archived)
- [x] T-010.2 `POST /api/epics/<project>/<EPIC-nnn>/close` closes an epic (done when: a server test closes an epic through the API and a second call is refused)
- [ ] T-010.3 Close epic button in the epic document's header, with a confirmation, open epics only (done when: a web test finds the button on an open epic and not on a closed one; in play, closing an epic moves it to Closed)
- [ ] T-010.4 Closed and Archived sections under each project's open epics, Archived folded until clicked (done when: a web test renders both sections from view data; in play, an archived epic opens its document)

## Test plan

- Batch A: T-010.1 to .4 (domain, store, server, web): development
- Performance: none
- Touches: none (source and docs only)

## Check in play

- T-010.3: close a throwaway epic; it leaves the open list, shows under Closed, its tasks are in the Archive tab.
- T-010.4: unfold Archived; EPIC-001 to EPIC-008 are there and open their documents.

## Notes

Decisions and deviations, newest first.

## Close audit

## For the standard
