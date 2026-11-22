# EPIC-135: Steady goals

Status: Done
Goal: A box keeps a goal until something clearly better comes along.
Design: GameDesign.md, section Goals

## Findings

1. `[design]` **Boxes change their minds with nothing better to do.** In play a box saw the key, stopped, turned away. Cause: many events call `Rethink` and throw the spot away. Decided: a goal list replaces the single spot (findings 2 to 4).
2. `[design]` **A goal list.** Decided: each box holds at most 10 goals (`GoalListSize`).
3. **[bug] The red shadow marker is below the ground.** The disc sits 0.02 above the fight's cube top. *Proposed:* raise it to the drawn top.
   - Decided: the marker follows the drawn height of each cube.
- **A2. [design] See and assign controllers.** *Proposed:* character select shows every connected device.
4. [design] The Balancer gives no overview. Fix: a piece list with one page per piece (Decided).

The level 14 findings end here.

## Tasks

- [x] T-135.2 Goal and GoalList (done when: GoalListTests passes)
