# EPIC-029: Contact relevance and scale

In short: influencer contacts carry the fields the research routine needs, and contacts that suit none of Tabu's games sit in a parked list.
Why it exists: the first research run (contact 50, 2026-11-26) stuffed scale, check date and Reddit into `notes`, and every contact stays in the outreach pool. Quality over quantity: only creators that suit a game get worked.

Status: Active
Design: Design.md, section Marketing (scale labels, relevant, parked, per-channel facts)

## Findings

- Today all 268 contacts are active and none has a fit, so the relevance rule would park every influencer until fits exist. Nothing is parked automatically; the report command lists who would be.
- `pickContacts` already takes only active contacts, so parked ones are skipped without a change there; a test pins it.
- There is no `profile set` command; profiles are saved by the project settings page. The command is new.

## Tasks

- [x] T-029.1 Architecture and class diagram for scale and parked (done when: Architecture.md lists scales, channel facts, relevance and parked; diagram updated)
- [x] T-029.2 Scale vocabulary and new contact fields (done when: Tests: a contact round trips the fields; bad scale refused; old db opens with empty values)
- [x] T-029.3 Channel kinds and per-channel followers and last-active (done when: Tests: old channel rows survive the migration; new kinds accepted; syntax parsed; unknown host stays website)
- [x] T-029.4 Game profile scale and profile set (done when: Tests: scale parsed and saved; page save keeps an existing scale; profile set works)
- [x] T-029.5 Relevance rule and parked status (done when: Tests: fit only, scale overlap, both empty; filters; campaign picking skips parked)
- [x] T-029.6 CLI: filters, show, set and help text (done when: Tests on the CLI output; doit help documents every new flag and key)
- [x] T-029.7 API routes for the new fields (done when: Route tests pass)
- [x] T-029.8 Indie fit migration and relevance report (done when: Tests: dry run changes nothing; apply sets the fields and keeps other notes)
- [ ] T-029.9 Board: parked section, scale and channel fields (done when: Pure-function tests pass)
- [ ] T-029.10 Check in play: parked section and contact pane (done when: Tabu confirms the board)

## Test plan

Batch 1 (T-029.2 to T-029.4): Development tests. Scale vocabulary and aliases; new contact fields round trip; channel kinds; `kind=url|followers|date` parsing; the v6 migration keeps old channel rows; importer still falls back to website.
Batch 2 (T-029.5 to T-029.7): Development tests. Relevance (fit only, scale overlap, both empty, profile scale empty); `--relevant`, `--irrelevant`, `--parked`, `--scale`, parked `--due`; default list hides parked; `campaign contacts`, `campaign suggest` and `outreach` skip parked; `profile set`.
Batch 3 (T-029.8 to T-029.9): Development tests. The Indie fit migration (dry run, apply, other notes kept); board pure functions for the parked section and channel fields.
Check in play: T-029.10

## Notes

Decisions and deviations, newest first.

## Close audit

## For the standard
