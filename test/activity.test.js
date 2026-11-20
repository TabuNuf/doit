// The activity log: one line per task change from the board (so from the CLI and the server), kept 30 days.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Cli } from "../src/cli/cli.js";
import { ActivityLog, describeChanges } from "../src/domain/activity.js";
import { makeActivity } from "../src/root.js";
import { setup } from "./helpers.js";

const cli = (board, ...args) => new Cli(board, { write() {} }, { write() {} }).run(args);
const logLines = home => fs.readFileSync(path.join(home, "activity.log"), "utf8").split("\n").filter(Boolean);

test("setting, commenting and closing a task writes three lines", t => {
  const s = setup(); t.after(s.cleanup);
  cli(s.board, "set", "game/T-014.2", "state=progress");
  cli(s.board, "comment", "game/T-014.2", "Halfway");
  cli(s.board, "set", "game/T-014.2", "state=done");
  assert.deepEqual(logLines(s.home), [
    "2026-11-20 09:00  game/T-014.2  state todo → progress",
    "2026-11-20 09:00  game/T-014.2  comment by ai",
    "2026-11-20 09:00  game/T-014.2  state progress → done",
  ]);
});

test("the page's changes go through the same board and are logged too", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.addTask({ project: "game", epic: "EPIC-014", title: "Lobby browser", owner: "human" });
  s.board.move("game/T-014.3", { section: "backlog" });
  s.board.update("game/T-014.4", { deadline: "2026-11-25", description: "x" });
  s.board.update("game/T-014.4", { owner: "human" });
  const lines = logLines(s.home).map(l => l.split("  ").slice(1).join("  "));
  assert.deepEqual(lines, [
    "game/T-014.4  added (human, todo)",
    "game/T-014.3  state todo → backlog, moved",
    "game/T-014.4  deadline 2026-11-25, description changed",
  ], "a save that changes nothing writes no line");
});

test("the sweep logs each task it archives, with the reason", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.update("game/T-014.2", { deadline: "2026-11-21" });
  s.clock.t = new Date("2026-11-23T08:00:00");
  s.board.sweep();
  assert.equal(logLines(s.home).at(-1), "2026-11-23 08:00  game/T-014.2  archived: Deadline passed on 2026-11-21");
});

test("lines older than 30 days are dropped on write, newer ones kept", t => {
  const s = setup(); t.after(s.cleanup);
  fs.writeFileSync(path.join(s.home, "activity.log"), [
    "2026-10-20 10:00  game/T-014.1  older than 30 days",
    "2026-10-21 10:00  game/T-014.1  exactly 30 days",
    "not a log line",
    "",
  ].join("\n"));
  cli(s.board, "comment", "game/T-014.2", "Hi");
  assert.deepEqual(logLines(s.home), [
    "2026-10-21 10:00  game/T-014.1  exactly 30 days",
    "2026-11-20 09:00  game/T-014.2  comment by ai",
  ]);
});

test("recent lists newest first, keeps a block's order and filters by project", () => {
  let lines = [];
  const file = { lines: () => lines, append: l => { lines = [...lines, ...l]; }, replace: l => { lines = l; } };
  const clock = { t: new Date("2026-11-20T07:00:00") };
  const log = new ActivityLog(file, () => clock.t);
  log.record({ ref: "morning", what: "Morning report" }, { ref: "morning", what: "Swept: none" });
  clock.t = new Date("2026-11-20T08:15:00");
  log.record({ ref: "game/T-1.1", what: "comment by ai" });
  log.record({ ref: "other/T-2.1", what: "state todo → progress" });
  assert.deepEqual(log.recent().map(e => e.what), ["state todo → progress", "comment by ai", "Morning report", "Swept: none"]);
  assert.deepEqual(log.recent({ project: "game" }).map(e => e.ref), ["game/T-1.1", "morning", "morning"]);
  assert.equal(log.recent({ limit: 1 }).length, 1);
});

test("describeChanges names what changed and nothing else", () => {
  const a = { state: "todo", owner: "ai", type: "task", deadline: null, rank: 1, title: "A", doneWhen: "", description: "" };
  assert.equal(describeChanges(a, { ...a }), "");
  assert.equal(describeChanges(a, { ...a, owner: "human", deadline: "2026-12-01" }), "owner human, deadline 2026-12-01");
  assert.equal(describeChanges({ ...a, deadline: "2026-12-01" }, a), "deadline cleared");
});

test("a missing log reads as empty", t => {
  const s = setup(); t.after(s.cleanup);
  assert.deepEqual(makeActivity({ home: s.home }).recent(), []);
});

test("closing an epic and reopening it log each task it archives and brings back", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.closeEpic("game", "EPIC-014");
  const closed = logLines(s.home).map(l => l.split("  ").slice(1).join("  "));
  assert.ok(closed.length > 0 && closed.every(l => l.endsWith("archived: Epic EPIC-014 closed")), closed.join("\n"));
  s.board.moveEpic("game", "EPIC-014", "open");
  const reopened = logLines(s.home).slice(closed.length);
  assert.equal(reopened.length, closed.length);
  assert.ok(reopened.every(l => /reopened with EPIC-014: state archived → (todo|done)$/.test(l)), reopened.join("\n"));
});
