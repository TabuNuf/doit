# EPIC-005: Ghosts from Pantry

Status: Planned
Goal: players race ghosts matched to their own skill, stored in Polyspice's own Pantry service.
Design: no design doc yet (`Standard/Deviations.md`).

## Specification

**Ghosts** (`Decided` unless marked):
- A finished, complete race uploads its replay to Pantry as an item of kind `ghost`.
- **Skill band** (Proposed): the measure the game sorts by today, divided into `GhostBandCount` 20 bands.

## Touches

- `Assets/Scenes/Race.unity`

## Classes

- `GhostClient`: lists and downloads ghosts from Pantry.

## Tasks

- [ ] T-005.1 Register the game on Pantry's test host (done when: the key works)

## Check in play

- T-005.1: a race shows three ghosts near the player's own time.

## Notes
