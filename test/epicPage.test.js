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

test("findings: one folded row each with the count line, an opened one shows its detail", () => {
  const e = epic("new-shape.md");
  const h = epicPage(e, [], {});
  assert.match(h, /3 findings · 2 decided · 1 proposed/);
  assert.equal((h.match(/data-epic-open="g\/EPIC-135:f\d"/g) || []).length, 3);
  assert.doesNotMatch(h, /<dt>Seen<\/dt>/);
  const o = epicPage(e, [], { "g/EPIC-135:f2": true });
  assert.match(o, /<dt>Seen<\/dt><dd>at the pause one card read/);
  assert.match(o, /<dt>Decided<\/dt>/);
});

test("tasks: one table row per task, who, last column, muted when done", () => {
  const tasks = [t(1, { title: "A", state: "done", owner: "human", completed: "2026-11-20" }), t(2, { title: "B", model: "Sonnet 5.5", effort: "medium" }), t(3, { owner: "human", title: "C" }), t(4, { blocks: "T-135.3" })];
  const h = epicPage(epic("new-shape.md"), tasks, {});
  assert.equal((h.match(/<tr class="ep-trow/g) || []).length, 4);
  assert.match(h, /ep-trow muted" data-id="g\/T-135\.1"/);
  assert.match(h, /<td>2026-11-20<\/td>/);
  assert.match(h, /<td>after \.4<\/td>/);
  assert.match(h, /Sonnet 5\.5 · medium/);
});

test("test plan: a batch grid with Performance and Close rows", () => {
  const h = epicPage(epic("test-plan-loose.md", { id: "EPIC-022" }), [], {});
  assert.equal((h.match(/<td><b>Batch /g) || []).length, 2);
  assert.match(h, /<td class="mono">T-022\.1 to \.3<\/td><td>Fighters, Combat, App editor/);
  assert.match(h, /<td><b>Close<\/b><\/td>/);
  assert.match(h, /Build all, then test once/);
});

test("end sections: folded rows, a note when empty, the content when written", () => {
  const h = epicPage(epic("new-shape.md"), [], {});
  assert.match(h, /<b>Notes<\/b><span class="ep-note">none yet/);
  assert.match(h, /<b>Close audit<\/b><span class="ep-note">filled at close/);
  assert.match(h, /<b>For the standard<\/b><span class="ep-note">filled at close/);
  const w = epicPage({ project: "g", id: "EPIC-9", status: "Planned", text: "# EPIC-9: X\n\nStatus: Planned\n\n## Notes\n\nA deviation.\n" }, [], {});
  assert.match(w, /data-epic-open="g\/EPIC-9:Notes"/);
  assert.doesNotMatch(w, /A deviation/);
  assert.match(epicPage({ project: "g", id: "EPIC-9", status: "Planned", text: "# EPIC-9: X\n\n## Notes\n\nA deviation.\n" }, [], { "g/EPIC-9:Notes": true }), /A deviation/);
});

test("other sections stay markdown in file order", () => {
  const h = epicPage(epic("unknown-sections.md", { id: "EPIC-005" }), [], {});
  assert.ok(h.indexOf("Specification") < h.indexOf("Touches") && h.indexOf("Touches") < h.indexOf("Check in play"));
  assert.match(h, /GhostClient/);
});
