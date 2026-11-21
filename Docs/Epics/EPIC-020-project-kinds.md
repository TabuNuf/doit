# EPIC-020: Project kinds

Status: Active
Goal: Each project on the board says whether it is a game, an application or a podcast, and Marketing offers them by that kind.
Design: Design.md, sections Projects and Marketing

## Tasks

- [x] T-020.1 A project has a kind (game, application, podcast or none) in the settings: doit project set <id> kind=..., doit projects shows it, PATCH /api/projects/<id> takes kind (done when: domain and CLI tests set, show and clear a kind and refuse an unknown one)
- [x] T-020.2 The Projects menu sets a project's kind with a select on each row (done when: a web test sees the select with the project's kind chosen, and a change sends PATCH {kind})
- [x] T-020.3 Profiles take their kind from the project; every project with a kind is in the Marketing picker, grouped Games, Applications, Podcasts, marked when it has no Profile.md yet (done when: profile tests see the project kind win over the file's Kind line and a kind-only project listed as missing; the picker test sees three groups)

## Test plan

- Batch A: T-020.1 to .3: development, then the Audit tests at close

## Notes

Decisions and deviations, newest first.

- The kind lives in the settings file beside the star, not in the project's repo: the project list is Doit's, and a project needs no Marketing folder to have a kind.
- T-020.3: a project's kind wins over a `Kind:` line in its Profile.md; the line stays for profiles in the marketing project's Profiles folder, which have no project.
- T-020.1: `cli.js` is 257 lines; T-018.2 brings it under 220.

## Close audit

- Development 256 pass, Audit 257 pass (2026-11-21).
- Architecture: the kind check is a pure rule in `domain/rules.js`; the store only writes it. No file over 300 lines. No fix-now finding.

## For the standard

- Nothing: the kinds are this app's vocabulary.
