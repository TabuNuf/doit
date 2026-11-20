# EPIC-008: Visual style

Status: Active
Goal: The board looks like a drafting sheet (Blueprint) in light and dark, with every colour from a token.
Design: Design.md, section Look

## Tasks

- [x] T-008.1 Blueprint tokens and fonts replace the base palette, light and dark (done when: the board opens in the Blueprint colours and IBM Plex type in light and dark, and the style.css header comment names Blueprint instead of greyscale lo-fi (Check in play))
- [ ] T-008.2 Blueprint component shapes: grid sheet, pane outlines and headers, dashed rows, selection, segmented bars, tabs, field block (done when: the board matches the Blueprint tab of the style comparison page in both themes (Check in play))
- [ ] T-008.3 Every colour in style.css comes from a token (done when: a development test fails on any literal colour outside the token blocks of web/style.css, and passes)

## Test plan

- Batch A: T-008.1, T-008.2, T-008.3 (web): development
- Performance: none
- Touches: web/style.css, web/index.html. EPIC-007 touches store and cli only, so the two can be Active together.

## Check in play

- T-008.1: open the board with the system in light, then dark; colours and type match Design.md, section Look.
- T-008.2: compare the board with the Blueprint tab of the style comparison page, both themes.

## Notes

Decisions and deviations, newest first.

- Decided 2026-11-20: Blueprint was chosen from five candidates (Paper, Terminal, Studio, Blueprint, Poster) shown on the private artifact Doit Style Options, claude.ai/artifact/L8qjksrvdhpyhEDjTd4unB. Its published styles.css, block 4, is the starting CSS: fold its tokens into the base :root blocks of style.css and its component rules in without the data-style scoping.
- Decided 2026-11-20: one style replaces the old look; no style picker.

## Close audit

## For the standard
