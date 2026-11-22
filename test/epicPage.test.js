// The epic page's header, In short block and facts grid.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { epicPage } from "../web/epicPage.js";

const text = name => fs.readFileSync(path.join(import.meta.dirname, "fixtures", "epics", name), "utf8");
const epic = (name, o = {}) => ({ project: "g", id: "EPIC-135", status: "Planned", text: text(name), ...o });
const t = (n, o = {}) => ({ project: "g", id: `T-135.${n}`, state: "todo", owner: "ai", blocks: null, ...o });

test("the header shows status, progress and both counts", () => {
  const tasks = [t(1, { state: "done" }), t(2), t(3, { owner: "human", state: "todo" }), t(4, { blocks: "T-135.3" })];
  const h = epicPage(epic("new-shape.md"), tasks);
  assert.match(h, /chip status">Planned</);
  assert.match(h, /1 of 4 tasks done/);
  assert.match(h, /width:25%;background:var\(--select\)/);
  assert.match(h, /chip claude">[^<]*2 for Claude/);
  assert.match(h, /chip you">[^<]*1 for you after \.4/);
});

test("In short, Why it exists and one grid row per fact", () => {
  const h = epicPage(epic("new-shape.md"), []);
  assert.match(h, /A box keeps a goal/);
  assert.match(h, /Why it exists<\/b> in the level 14/);
  assert.equal((h.match(/<dt>/g) || []).length, 4);
  assert.match(h, /<dt>Order<\/dt><dd>after <button class="link" data-open-epic="g\/EPIC-136">EPIC-136<\/button>; /);
});

test("an epic with none of them shows none", () => {
  const h = epicPage({ project: "g", id: "EPIC-9", status: "Planned", text: "# EPIC-9: Bare\n\nStatus: Planned\n" }, []);
  assert.doesNotMatch(h, /ep-short|ep-facts|Why it exists|for Claude|for you/);
  assert.match(h, /0 of 0 tasks done/);
});

test("a placeholder fact shows no row", () => {
  const h = epicPage({ project: "g", id: "EPIC-9", status: "Planned", text: "# EPIC-9: Bare\n\nIn short: <one sentence>\nWhy it exists: <why>\nSource: <where>\nStatus: Planned\n" }, []);
  assert.doesNotMatch(h, /ep-short|ep-facts|&lt;/);
});
