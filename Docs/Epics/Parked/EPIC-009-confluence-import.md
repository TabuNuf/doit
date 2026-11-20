# EPIC-009: Confluence import

Status: Parked
Goal: Confluence pages move into a project's docs folder as Markdown, readable in the Docs view, so Confluence can be cancelled.
Design: not written yet. Follows EPIC-003 (Docs view).

## Scope

- Decided: a one-time import turns a Confluence space export into Markdown files under `<docs>/Confluence/`, each with its original URL as a note at the top. Nothing existing is overwritten.
- Decided: pictures come along: attachments are copied next to the pages, links are rewritten, and the Docs view serves and shows images.
- Open: the export format (HTML or XML), decided once the app is set up for this.
- Open: which spaces move; decided at the play check.

## Tasks

- [ ] T-009.1 Confluence import: a CLI command turns a space export into Markdown files (done when: `doit docs import <project> <export.zip>` on a sample export writes one file per page with its source URL, and nothing existing is overwritten)
- [ ] T-009.2 Pictures: attachments copied and linked, and the Docs view shows images (done when: an imported page with a picture shows it in the Docs view)

## Test plan

- Batch A: T-009.1 to .2 (CLI, a new import module, server, web): development

## Check in play

- T-009.1: import one real space and spot-check three pages against Confluence.

## Notes

Decisions and deviations, newest first.

- 2026-11-20: split from EPIC-003 (was T-003.5).

## Close audit

## For the standard
