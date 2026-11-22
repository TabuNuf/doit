// The epic page's reader: the new epic shape parsed into its parts, every old shape read whole.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseEpicDoc } from "../web/epicDoc.js";
import { renderMarkdown } from "../web/markdown.js";

const DIR = path.join(import.meta.dirname, "fixtures", "epics");
const read = name => fs.readFileSync(path.join(DIR, name), "utf8");
const doc = name => parseEpicDoc(read(name));
const words = s => String(s ?? "").match(/[\p{L}\p{N}]+/gu) ?? [];

/** Everything the page shows of a parsed epic, with the labels it writes itself; a finding shows its detail or its body. */
function shown(d) {
  const out = [d.title, d.inShortKey, "In short", "Why it exists", "Status", d.inShort, d.why, d.status, d.statusRest, ...d.loose];
  for (const f of d.facts) out.push(f.key, f.value);
  for (const s of d.sections) {
    out.push(s.heading);
    if (!(d.findings && /^findings\b/i.test(s.heading))) { out.push(s.body); continue; }
    for (const f of d.findings) {
      if (f.kind === "markdown") out.push(f.text);
      else out.push(f.n, f.tag, f.title, f.state, ...(f.detail ? f.detail.flatMap(x => [x.label, x.text]) : [f.body]));
    }
  }
  return out;
}

/** Each word of the file, a whole-value placeholder (`Key: <...>`) aside, appears at least as often in what is shown. */
function assertWhole(name) {
  const have = new Map();
  for (const w of shown(doc(name)).flatMap(words)) have.set(w, (have.get(w) ?? 0) + 1);
  read(name).split("\n").forEach((line, k) => {
    for (const w of words(line.replace(/^([A-Z][A-Za-z ]*): <[^<>]*>$/, "$1"))) {
      assert.ok(have.get(w) > 0, `${name} line ${k + 1} lost "${w}": ${line}`);
      have.set(w, have.get(w) - 1);
    }
  });
}

test("every line of every fixture is in the result", () => {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith(".md"));
  assert.ok(files.length >= 10);
  for (const f of files) assertWhole(f);
});

test("the new shape gives In short, Why it exists, Status, facts, findings and the sections in order", () => {
  const d = doc("new-shape.md");
  assert.deepEqual([d.id, d.name, d.title], ["EPIC-135", "Steady goals", "EPIC-135: Steady goals"]);
  assert.match(d.inShort, /^A box keeps a goal/);
  assert.equal(d.inShortKey, "In short");
  assert.match(d.why, /^in the level 14 playtest/);
  assert.deepEqual([d.status, d.statusRest], ["Planned", ""]);
  assert.deepEqual(d.facts.map(f => f.key), ["Design", "Order", "Source", "Same playtest"]);
  assert.equal(d.facts[1].value, "after EPIC-136; EPIC-137 and EPIC-138 build on it");
  assert.deepEqual(d.loose, []);
  assert.deepEqual(d.findings.map(f => [f.n, f.tag, f.title, f.state]), [
    ["1", "design", "Boxes change their minds with nothing better to do", "Decided"],
    ["2", "bug", "The card names a thought the box has left", "Decided"],
    ["3", "design", "What a box remembers is invisible", "Proposed"],
  ]);
  assert.deepEqual(d.findings[0].detail.map(x => x.label), ["Seen", "Cause", "Decided"]);
  assert.equal(d.findings[0].detail[1].text, "many events call `Rethink` and throw the spot away, so two near options are close to a coin toss each time.");
  assert.deepEqual(d.sections.map(s => s.heading), ["Findings", "Tasks", "Test plan", "Notes", "Close audit", "For the standard"]);
  assert.match(d.sections[2].body, /^- Batch A: T-135\.1 to \.2[\s\S]*- Check in play: T-135\.3$/);
});

test("without an In short line the Goal line is the In short text and leaves the facts", () => {
  const d = doc("goal-no-in-short.md");
  assert.equal(d.inShort, "Players who left after 0.12 come back for the steady goals.");
  assert.equal(d.inShortKey, "Goal");
  assert.deepEqual(d.facts.map(f => f.key), ["Game", "Occasion", "Audience", "Design"]);
});

test("with neither In short nor Goal the block is empty, and a file without Status or EPIC title still reads", () => {
  const d = doc("no-in-short-no-goal.md");
  assert.deepEqual([d.inShort, d.inShortKey, d.why, d.status], [null, null, null, null]);
  assert.deepEqual([d.id, d.name], ["EPIC-004", "EPIC-004 implementation spec"]);
  assert.deepEqual(d.facts, [{ key: "Unity MCP", value: "`set_active_instance` with `rabbit-rocket-racing-steam@a98a1277` at session start." }]);
  assert.equal(d.findings, null);
  assert.deepEqual(d.sections.map(s => s.heading), ["1. What exists", "2. Folders and files to add"]);
  assert.match(d.sections[1].body, /^```\n[\s\S]*PendingMap\.cs[\s\S]*\n```$/);
});

test("a placeholder value reads as not written", () => {
  const d = doc("placeholder.md");
  assert.deepEqual([d.inShort, d.inShortKey, d.why], [null, null, null]);
  assert.deepEqual(d.facts, [{ key: "Goal", value: null }, { key: "Design", value: "Design.md, section <name>" }]);
});

test("a Status line with words after the first gives the word and the rest", () => {
  const d = doc("status-with-words.md");
  assert.equal(d.status, "Waiting");
  assert.equal(d.statusRest, "(part 1 done on one machine; T-038.1 needs a second machine)");
});

test("free text in the header is loose markdown, in file order, and the facts above it stay facts", () => {
  const d = doc("header-free-text.md");
  assert.deepEqual(d.facts.map(f => f.key), ["Closed", "Design", "Order"]);
  assert.equal(d.loose.length, 2);
  assert.match(d.loose[0], /^The level 14 playtest is split[\s\S]*\(git-ignored\)\.$/);
  assert.equal(d.loose[1], "**The point of the round**: rivals the player can read.");
});

test("a finding written as one paragraph folds to its tag and title, its chip from the first Decided or Proposed", () => {
  const d = doc("finding-paragraph.md");
  const found = d.findings.filter(f => f.kind === "finding");
  assert.deepEqual(found.map(f => [f.n, f.tag, f.title, f.state]), [
    ["1", "design", "Boxes change their minds with nothing better to do", "Decided"],
    ["2", "design", "A goal list", "Decided"],
    ["3", "bug", "The red shadow marker is below the ground", "Proposed"],
    ["A2", "design", "See and assign controllers", "Proposed"],
  ]);
  assert.ok(found.every(f => f.detail === null));
  assert.match(found[0].body, /^In play a box saw the key[\s\S]*\(findings 2 to 4\)\.$/);
  assert.equal(found[2].body, "The disc sits 0.02 above the fight's cube top. *Proposed:* raise it to the drawn top.\n- Decided: the marker follows the drawn height of each cube.");
  const md = d.findings.at(-1);
  assert.equal(md.kind, "markdown");
  assert.match(md.text, /^4\. \[design\] The Balancer gives no overview[\s\S]*\n\nThe level 14 findings end here\.$/);
});

test("a numbered Findings section with no bold titles is left as markdown", () => {
  const d = doc("numbered-without-bold.md");
  assert.equal(d.findings, null);
  assert.match(d.sections[0].body, /^1\. \[bug\] Many weapons[\s\S]*\(Decided\)\.$/);
});

test("Check in play and sections the page does not know stay in file order with their text", () => {
  const d = doc("unknown-sections.md");
  assert.deepEqual(d.sections.map(s => s.heading), ["Specification", "Touches", "Classes", "Tasks", "Check in play", "Notes"]);
  assert.match(d.sections[0].body, /^\*\*Ghosts\*\*[\s\S]*20 bands\.$/);
  assert.equal(d.sections.at(-1).body, "");
});

test("a Test plan's lines that are not batch lines stay in its text", () => {
  const body = doc("test-plan-loose.md").sections[0].body;
  assert.match(body, /^Build all, then test once[\s\S]*- Batch B[\s\S]*- Close: Audit \(light \+ Deep\)$/);
});

test("empty text and text without a title give an empty doc, not an error", () => {
  const d = parseEpicDoc("");
  assert.deepEqual([d.title, d.id, d.inShort, d.status, d.findings], [null, null, null, null, null]);
  assert.deepEqual([d.facts, d.loose, d.sections], [[], [], []]);
});

test("a finding's labelled lines render as one nested list under its item", () => {
  const html = renderMarkdown("1. **A** `Decided`\n   - Seen: x\n   - Decided: y\n2. **B**\n- other");
  assert.equal(html, "<ol><li><strong>A</strong> <code>Decided</code><ul><li>Seen: x</li><li>Decided: y</li></ul></li><li><strong>B</strong></li><li>other</li></ol>");
  assert.equal(renderMarkdown("- a\n  - b\n    - c\n- d"), "<ul><li>a<ul><li>b</li><li>c</li></ul></li><li>d</li></ul>");
});
