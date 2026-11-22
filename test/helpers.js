// A throwaway data folder and project with a few epics, and a board on a fixed clock.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeBoard } from "../src/root.js";

export const LOBBY = `# EPIC-014: Online lobby

Status: Active
Goal: Players meet online.

## Tasks

- [x] T-014.1 Create and join lobby by code (done when: two clients join)
- [ ] T-014.2 Host migration (done when: second player becomes host)
- [ ] T-014.3 Show ping

## Test plan

- Batch A: development
`;

export const BUGS = `# EPIC-009: Bugs (rolling)

Status: Active
Order: after EPIC-014

## Tasks

- [ ] T-009.1 Menu music restarts
`;

export const STORE = `# EPIC-016: Steam store page

Status: Planned
Order: after EPIC-009

## Tasks

- [ ] T-016.1 Capsule art brief
`;

export const OLD = `# EPIC-013: Netplay

Status: Done

## Tasks

- [x] T-013.1 Rollback
`;

export function setup(now = "2026-11-20T09:00:00") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "doit-test-"));
  const home = path.join(root, "home");
  const game = path.join(root, "game");
  const epics = path.join(game, "GameDocs", "Epics");
  fs.mkdirSync(path.join(epics, "Parked"), { recursive: true });
  fs.mkdirSync(path.join(epics, "Completed"), { recursive: true });
  fs.writeFileSync(path.join(epics, "EPIC-014-online-lobby.md"), LOBBY);
  fs.writeFileSync(path.join(epics, "EPIC-009-bugs.md"), BUGS);
  fs.writeFileSync(path.join(epics, "Parked", "EPIC-016-store.md"), STORE);
  fs.writeFileSync(path.join(epics, "Completed", "EPIC-013-netplay.md"), OLD);
  const clock = { t: new Date(now) };
  const board = makeBoard({ home, now: () => clock.t });
  board.addProject({ name: "Game", path: game, docs: "GameDocs" });
  const read = rel => fs.readFileSync(path.join(game, "GameDocs", rel), "utf8");
  const exists = rel => fs.existsSync(path.join(game, "GameDocs", rel));
  return { root, home, game, board, clock, read, exists, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

/** Registers a marketing project beside the test data with two game profiles (bunny-bunker, good-box); returns its docs folder. */
export function addProfiles(s) {
  const proj = path.join(s.root, "marketing");
  const dir = path.join(proj, "Docs", "Profiles");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "bunny-bunker.md"), "# Bunny Bunker\n\nGenres: co-op, cozy\nPlatforms: Steam\nStage: demo\nRelease: 2027-03-01\nNeeds: wishlists\n");
  fs.writeFileSync(path.join(dir, "good-box.md"), "# Good Box\n\nGenres: puzzle\nStage: released\n");
  s.board.addProject({ name: "Polyspice Marketing", path: proj, docs: "Docs" });
  return path.join(proj, "Docs");
}
