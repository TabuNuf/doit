// T-025.5: the campaign brief in the epic header: parsed, written and exposed on the board.
import test from "node:test";
import assert from "node:assert/strict";
import { setup } from "./helpers.js";
import { parseEpic, setHeader, epicTemplate } from "../src/store/markdown.js";
import { checkBrief } from "../src/domain/campaignBrief.js";

test("parseEpic reads the brief lines and treats the Goal placeholder as empty", () => {
  const plain = parseEpic(epicTemplate("EPIC-001", "X", "Active"));
  assert.equal(plain.brief.goal, "");
  const text = "# EPIC-002: C\n\nStatus: Active\nGame: a\nOccasion: demo\nGoal: Wishlists\nChange: 200 more\nMeasure: wishlists\nAudience: coop fans\nMessage: play it\nAsk: a video\nChannels: youtube\nStarts: 2026-12-01\nEnds: 2026-12-07\nBudget: none\nDesign: x\n\n## Tasks\n\nGoal: not header\n";
  assert.deepEqual(parseEpic(text).brief, { occasion: "demo", goal: "Wishlists", change: "200 more", measure: "wishlists", audience: "coop fans", message: "play it", ask: "a video", channels: "youtube", starts: "2026-12-01", ends: "2026-12-07", budget: "none" });
});

test("setHeader adds in order, replaces in place and removes", () => {
  let t = epicTemplate("EPIC-001", "X", "Active", { game: "a", event: "3" });
  t = setHeader(t, "Measure", "wishlists");
  t = setHeader(t, "Occasion", "demo");
  t = setHeader(t, "Goal", "Wishlists");
  assert.match(t, /^Status: Active\nGame: a\nEvent: 3\nOccasion: demo\nGoal: Wishlists\nMeasure: wishlists\nDesign:/m);
  assert.equal((t.match(/^Goal:/gm) || []).length, 1);
  t = setHeader(t, "Measure", "");
  t = setHeader(t, "Game", "a, b");
  assert.ok(!/Measure/.test(t));
  assert.match(t, /^Game: a, b\nEvent: 3\n/m);
  assert.throws(() => setHeader(t, "Colour", "x"));
});

test("a campaign made with a brief writes the Goal line once", () => {
  const t = epicTemplate("EPIC-001", "X", "Active", { game: "a", brief: { occasion: "sale", goal: "Sell", ends: "2026-12-01" } });
  assert.match(t, /^Status: Active\nGame: a\nOccasion: sale\nGoal: Sell\nEnds: 2026-12-01\nDesign:/m);
});

test("checkBrief validates occasion, dates and order", () => {
  assert.deepEqual(checkBrief({ occasion: "Demo", goal: "  a   b ", measure: "<x>" }), { occasion: "demo", goal: "a b", measure: "" });
  assert.throws(() => checkBrief({ occasion: "party" }), /Occasion/);
  assert.throws(() => checkBrief({ starts: "2026-13-01" }), /Starts/);
  assert.throws(() => checkBrief({ ends: "2026-01-01" }, { starts: "2026-02-01" }), /before/);
  assert.throws(() => checkBrief({ colour: "x" }), /Unknown/);
});

test("Board.setEpicHeader writes the line, shows it in the view and logs it", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.setEpicHeader("game", "EPIC-014", "Occasion", "release");
  assert.match(s.read("Epics/EPIC-014-online-lobby.md"), /^Occasion: release$/m);
  assert.equal(s.board.view({ project: "game" }).epics.find(e => e.id === "EPIC-014").brief.occasion, "release");
  s.board.setEpicHeader("game", "EPIC-014", "Occasion", "");
  assert.ok(!/Occasion/.test(s.read("Epics/EPIC-014-online-lobby.md")));
  assert.throws(() => s.board.setEpicHeader("game", "EPIC-999", "Occasion", "x"), /No epic/);
});
