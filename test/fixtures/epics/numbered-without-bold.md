# EPIC-022: Grips, strikes and the Balancer

Status: Done
Goal: every weapon is held the right way up and strikes in front of the fighter.
Design: GameDesign.md, sections Fighting and Balancer

## Findings

1. [bug] Many weapons are upside down or held by the wrong end. Cause: every hand model sits in the hand slot with no rotation of its own.
2. [bug] Swings hit to the side. Cause: each attack clip is scrubbed evenly over wind-up, active and recovery.
3. [design] The Balancer gives no overview. Fix: a piece list with one page per piece, folding sections on the other tabs (Decided).

## Tasks

- [x] T-022.1 Grip per hand model (done when: the grip sheet shows every weapon upright)
