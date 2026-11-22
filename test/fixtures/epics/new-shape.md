# EPIC-135: Steady goals

In short: A box keeps a goal until something clearly better comes along, and the player can see what it is after.
Why it exists: in the level 14 playtest (2026-11-22) boxes saw the key, turned away and stood still for no reason.

Status: Planned
Design: GameDesign.md, section Goals, personalities and harm
Order: after EPIC-136; EPIC-137 and EPIC-138 build on it
Source: Playtest 2026-11-22, level 14, Playtests/2026-11-22-thorbjorn/
Same playtest: EPIC-136 Walls, water and voice, EPIC-137 Team goals and keys

## Findings

1. `[design]` **Boxes change their minds with nothing better to do** `Decided`
   - Seen: a box saw the key, stopped, turned away.
   - Cause: many events call `Rethink` and throw the spot away,
     so two near options are close to a coin toss each time.
   - Decided: a goal list replaces the single spot.
2. `[bug]` **The card names a thought the box has left** `Decided`
   - Seen: at the pause one card read "Thinking: red doors".
   - Decided: the card shows the current goal and the next one.
3. `[design]` **What a box remembers is invisible** `Proposed`
   - Proposed: faded markers on the map for the goals the selected box remembers.

## Tasks

- [x] T-135.1 Plan the goal list classes (done when: ClassDiagram.md has them)
- [ ] T-135.2 Goal and GoalList: add, update, end by fact (done when: GoalListTests passes)
- [ ] T-135.3 Check in play (done when: every check is confirmed)

## Test plan

- Batch A: T-135.1 to .2 (Brain: the plan, the goal list): development
- Performance: decide time per step before and after Batch A
- Check in play: T-135.3

## Notes

Decisions and deviations, newest first.

## Close audit

Filled when the epic closes.

## For the standard

Filled when the epic closes.
