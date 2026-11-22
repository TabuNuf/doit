import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { assignmentRows } from "../web/assignment.js";

const src = f => fs.readFileSync(path.join(import.meta.dirname, "..", "web", f), "utf8");
const task = (o = {}) => ({ owner: "ai", agent: "batch-builder", model: "Sonnet 5.5", effort: "high", ...o });

test("an ai task shows the three controls with the stored values", () => {
  const h = assignmentRows(task());
  assert.match(h, /id="ag"[^>]*value="batch-builder"/);
  assert.match(h, /id="mdl"[^>]*value="Sonnet 5.5"/);
  assert.match(h, /<option value="Fable 5.2">/);
  assert.match(h, /<option value="high" selected>/);
  assert.match(h, /<option value="" >-<\/option>/);
  assert.equal((h.match(/aria-label/g) || []).length, 3);
});

test("a human task shows the three disabled with the stored values", () => {
  const h = assignmentRows(task({ owner: "human" }));
  assert.match(h, /id="ag"[^>]*value="batch-builder"[^>]*disabled/);
  assert.match(h, /id="mdl"[^>]*value="Sonnet 5.5"[^>]*disabled/);
  assert.match(h, /id="eff"[^>]*disabled/);
  assert.match(h, /<option value="high" selected>/);
  assert.match(h, /used when Claude owns it/);
  assert.equal((h.match(/class="off"/g) || []).length, 3);
  assert.doesNotMatch(assignmentRows(task()), /disabled/);
});

test("stored values are escaped", () => {
  const h = assignmentRows(task({ agent: 'a"<b>' }));
  assert.match(h, /value="a&quot;&lt;b&gt;"/);
  assert.doesNotMatch(h, /<b>/);
});

test("the pane calls it and the change listener patches the three", () => {
  assert.match(src("taskProps.js"), /\$\{assignmentRows\(t\)\}/);
  const ev = src("events.js");
  for (const k of ["agent", "model", "effort"]) assert.match(ev, new RegExp(k));
  assert.match(ev, /id === "ag" \|\| id === "mdl" \|\| id === "eff"/);
});
