import test from "node:test";
import assert from "node:assert/strict";
import { defaultsFor, parseRef, tabOf, sectionOf } from "../src/domain/task.js";
import { archiveReason, rankBetween, daysBetween } from "../src/domain/rules.js";

const epic = (status, name = "Lobby") => ({ id: "EPIC-014", name, status });
const line = (ticked = false) => ({ id: "T-014.2", n: 2, ticked });

test("defaults follow the epic's status", () => {
  assert.equal(defaultsFor(epic("Active"), line()).state, "todo");
  assert.equal(defaultsFor(epic("Planned"), line()).state, "backlog");
  assert.equal(defaultsFor(epic("Parked"), line()).state, "backlog");
  assert.equal(defaultsFor(epic("Active"), line(true)).state, "archived");
});

test("defaults: owner ai, bug type from the epic name, rank from numbers", () => {
  const d = defaultsFor(epic("Active", "Bugs (rolling)"), line());
  assert.equal(d.owner, "ai");
  assert.equal(d.type, "bug");
  assert.equal(d.rank, 14002);
  assert.equal(defaultsFor(epic("Active"), line()).type, "task");
});

test("refs and tabs", () => {
  assert.deepEqual(parseRef("cb/T-014.3"), { project: "cb", id: "T-014.3" });
  assert.throws(() => parseRef("T-014.3"));
  assert.equal(tabOf("progress"), "open");
  assert.equal(sectionOf("backlog"), "backlog");
  assert.equal(sectionOf("todo"), "active");
});

test("a passed deadline archives an open task", () => {
  assert.match(archiveReason({ state: "todo", deadline: "2026-11-19" }, "2026-11-20", 14), /Deadline passed/);
  assert.equal(archiveReason({ state: "todo", deadline: "2026-11-20" }, "2026-11-20", 14), null);
  assert.equal(archiveReason({ state: "done", deadline: "2026-11-01", completed: "2026-11-19 10:00" }, "2026-11-20", 14), null);
});

test("completed tasks are archived after the retention", () => {
  assert.equal(archiveReason({ state: "done", completed: "2026-11-06 10:00" }, "2026-11-20", 14), null);
  assert.match(archiveReason({ state: "done", completed: "2026-11-05 10:00" }, "2026-11-20", 14), /kept 14 days/);
});

test("rank between neighbours", () => {
  assert.equal(rankBetween(1000, 2000), 1500);
  assert.equal(rankBetween(null, 2000), 1000);
  assert.equal(rankBetween(3000, null), 4000);
  assert.equal(daysBetween("2026-11-01", "2026-11-20"), 19);
});
