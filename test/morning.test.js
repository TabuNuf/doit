// doit morning: sweeps, then writes one five-part report block to the activity log, and changes nothing else.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeCli } from "../src/root.js";
import { morningReport } from "../src/domain/claude.js";
import { setup } from "./helpers.js";

/** Every file under a folder, relative path -> text. */
function snapshot(dir) {
  const out = new Map();
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else out.set(path.relative(dir, p), fs.readFileSync(p, "utf8"));
    }
  };
  walk(dir);
  return out;
}

function fixtures(s) {
  const b = s.board;
  b.update("game/T-014.2", { state: "progress" });
  b.update("game/T-016.1", { state: "todo" });
  b.addTask({ project: "game", epic: "EPIC-009", title: "Second bug", owner: "ai" });
  b.addTask({ project: "game", epic: "EPIC-014", title: "Pick the relay region", owner: "human", deadline: "2026-11-27" });
  b.update("game/T-014.4", { blocks: "T-014.3" });
  b.addTask({ project: "game", epic: "EPIC-014", title: "Sign the form", owner: "human", deadline: "2026-11-30", state: "backlog" });
  b.addTask({ project: "game", epic: "EPIC-014", title: "Old chore", owner: "human", deadline: "2026-11-21" });
  s.clock.t = new Date("2026-11-23T07:00:00");
}

test("the report block has each of its five parts right", t => {
  const s = setup(); t.after(s.cleanup);
  fixtures(s);
  let out = "";
  const code = makeCli({ home: s.home, now: () => s.clock.t, out: { write: x => { out += x; } }, err: { write: x => { out += x; } } }).run(["morning"]);
  assert.equal(code, 0, out);
  const log = fs.readFileSync(path.join(s.home, "activity.log"), "utf8").trim().split("\n");
  const block = log.slice(-7);
  assert.deepEqual(block, [
    "2026-11-23 07:00  morning  Morning report 2026-11-23",
    "2026-11-23 07:00  morning  Swept 1: game/T-014.6",
    "2026-11-23 07:00  morning  In progress 1: game/T-014.2 Host migration",
    "2026-11-23 07:00  morning  Up next, top 3 of 4: game/T-009.1 Menu music restarts; game/T-014.3 Show ping; game/T-016.1 Capsule art brief",
    "2026-11-23 07:00  morning  Blocked on you 1: game/T-014.4 Pick the relay region (blocks T-014.3)",
    "2026-11-23 07:00  morning  Due within 7 days 2: game/T-014.4 Pick the relay region (due 2026-11-27); game/T-014.5 Sign the form (due 2026-11-30)",
    "2026-11-23 07:00  morning  Outreach this week: nothing",
  ]);
  assert.equal(log.at(-8), "2026-11-23 07:00  game/T-014.6  archived: Deadline passed on 2026-11-21", "the sweep is logged before the report");
  assert.equal(out.trim().split("\n").length, 7, "the report is printed too");
});

test("the morning run changes no task beyond what the sweep archives", t => {
  const s = setup(); t.after(s.cleanup);
  fixtures(s);
  const docs = path.join(s.game, "GameDocs");
  const before = snapshot(docs), settings = fs.readFileSync(path.join(s.home, "settings.json"), "utf8");
  makeCli({ home: s.home, now: () => s.clock.t, out: { write() {} } }).run(["morning"]);
  const after = snapshot(docs);
  const changed = [...new Set([...before.keys(), ...after.keys()])].filter(k => before.get(k) !== after.get(k)).sort();
  assert.deepEqual(changed, ["Archive/Tasks/T-014.6.md", "Epics/Tasks/T-014.6.md"]);
  assert.equal(fs.readFileSync(path.join(s.home, "settings.json"), "utf8"), settings);
});

test("an empty part says none", () => {
  assert.deepEqual(morningReport({ swept: [], tasks: [], today: "2026-11-23" }).slice(1), [
    "Swept: none", "In progress: none", "Up next: none", "Blocked on you: none", "Due within 7 days: none",
  ]);
});
