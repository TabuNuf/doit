import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setup } from "./helpers.js";
import { parseTaskFile, formatTaskFile } from "../src/store/markdown.js";

const taskFile = s => {
  const dir = path.join(s.game, "GameDocs", "Epics", "Tasks");
  return fs.readFileSync(path.join(dir, fs.readdirSync(dir).find(f => f.startsWith("T-014.4"))), "utf8");
};

test("add stores the three and a fresh board reads them back", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.addTask({ project: "game", epic: "EPIC-014", title: "X", agent: "batch-builder", model: "Sonnet 5.5", effort: "medium" });
  const got = s.board.get("game/T-014.4");
  assert.deepEqual([got.agent, got.model, got.effort], ["batch-builder", "Sonnet 5.5", "medium"]);
  assert.match(taskFile(s), /agent: batch-builder\nmodel: Sonnet 5.5\neffort: medium/);
});

test("update sets and clears each; a bad effort lists the five", t => {
  const s = setup(); t.after(s.cleanup);
  const b = s.board;
  b.update("game/T-014.2", { agent: "a", model: "m", effort: "xhigh" });
  let got = b.get("game/T-014.2");
  assert.deepEqual([got.agent, got.model, got.effort], ["a", "m", "xhigh"]);
  b.update("game/T-014.2", { agent: "", model: "", effort: "" });
  got = b.get("game/T-014.2");
  assert.deepEqual([got.agent, got.model, got.effort], [null, null, null]);
  assert.throws(() => b.update("game/T-014.2", { effort: "huge" }), /low, medium, high, xhigh, max/);
  assert.throws(() => b.addTask({ project: "game", epic: "EPIC-014", title: "Y", effort: "huge" }), /effort must be one of/);
  assert.equal(b.get("game/T-014.3").title, "Show ping");
});

test("owner ai to human to ai keeps all three", t => {
  const s = setup(); t.after(s.cleanup);
  const b = s.board;
  b.addTask({ project: "game", epic: "EPIC-014", title: "X", agent: "a", model: "m", effort: "high" });
  for (const owner of ["human", "ai"]) {
    b.update("game/T-014.4", { owner });
    const got = b.get("game/T-014.4");
    assert.deepEqual([got.agent, got.model, got.effort], ["a", "m", "high"]);
    assert.match(taskFile(s), /agent: a\nmodel: m\neffort: high/);
  }
});

test("a task file without the keys loads with nulls and round-trips", () => {
  const text = "---\nstate: todo\nowner: ai\n---\n\n# T-014.2: X\n\n## Description\n\nd\n\n## Comments\n";
  const f = parseTaskFile(text);
  assert.equal(f.agent, undefined);
  const out = formatTaskFile({ id: "T-014.2", title: "X", state: "todo", owner: "ai", comments: [], description: "d" });
  const again = parseTaskFile(out);
  assert.equal(again.agent, undefined);
  assert.equal(again.description, "d");
});
