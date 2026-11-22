import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { taskProps } from "../web/taskProps.js";

const task = (o = {}) => ({ id: "T-001.1", project: "doit", owner: "ai", type: "task", state: "todo", agent: "a", model: "m", effort: "low", created: "2026-01-01", updated: "2026-01-02", ...o });

for (const owner of ["human", "ai"]) {
  test(`every control renders for owner ${owner}`, () => {
    const h = taskProps(task({ owner }));
    for (const id of ["st", "dl", "dlon", "blk", "ag", "mdl", "eff"]) assert.match(h, new RegExp(`id="${id}"`));
    assert.match(h, /data-own="human"/);
    assert.match(h, /data-type="bug"/);
    assert.equal((h.match(/set by the board/g) || []).length, 2);
    assert.match(h, /doit set doit\/T-001\.1 key=value/);
  });
}

test("the date picker shows without a deadline and the box is not in render.js", () => {
  assert.match(taskProps(task()), /id="dl" value=""/);
  assert.doesNotMatch(fs.readFileSync(path.join(import.meta.dirname, "..", "web", "render.js"), "utf8"), /id="dlon"/);
});
