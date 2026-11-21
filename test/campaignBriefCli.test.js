// T-025.6: campaign add with brief flags, set, show and suggest.
import test from "node:test";
import assert from "node:assert/strict";
import { setup, addProfiles } from "./helpers.js";
import { cliFor } from "./contactsCli.test.js";

const M = "polyspice-marketing";

function seeded(t) {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const run = cliFor(s);
  run("contact", "add", "Ada", "Plays", "--type", "influencer", "--reach", "5000");
  run("contact", "add", "Bit", "Blog", "--type", "press", "--reach", "9000");
  run("contact", "add", "Cog", "Zine", "--type", "press", "--reach", "100");
  run("fit", "1", "bunny-bunker", "cozy");
  run("fit", "2", "bunny-bunker", "co-op");
  run("touch", "2", "mail", "--game", "bunny-bunker", "--date", "2026-11-10");
  run("fit", "3", "good-box", "puzzles");
  run("festival", "upsert", "Steam Next Fest", "--year", "2027", "--deadline", "2026-12-01", "--starts", "2027-02-01", "--genres", "co-op");
  return { s, run };
}

test("campaign add writes the brief lines, the Goal once", t => {
  const { s, run } = seeded(t);
  const r = run("campaign", "add", M, "Demo push", "--game", "bunny-bunker", "--occasion", "demo", "--goal", "Wishlists", "--starts", "2026-12-01", "--ends", "2026-12-07", "--budget", "none");
  assert.equal(r.code, 0, r.err);
  const e = s.board.view({ project: M }).epics.find(x => x.id === r.out.trim());
  assert.deepEqual([e.brief.occasion, e.brief.goal, e.brief.starts, e.brief.ends, e.brief.budget], ["demo", "Wishlists", "2026-12-01", "2026-12-07", "none"]);
  assert.equal(run("campaign", "add", M, "X", "--game", "bunny-bunker", "--occasion", "party").code, 1);
  assert.equal(run("campaign", "add", M, "X", "--game", "bunny-bunker", "--starts", "2026-12-05", "--ends", "2026-12-01").code, 1);
});

test("campaign set changes the brief, the games and clears with an empty value", t => {
  const { s, run } = seeded(t);
  const epic = run("campaign", "add", M, "Push", "--game", "bunny-bunker", "--goal", "Reach").out.trim();
  assert.equal(run("campaign", "set", M, epic, "measure=wishlists", "game=bunny-bunker,good-box", "goal=").code, 0);
  const e = s.board.view({ project: M }).epics.find(x => x.id === epic);
  assert.equal(e.brief.measure, "wishlists");
  assert.equal(e.brief.goal, "");
  assert.deepEqual(e.games, ["bunny-bunker", "good-box"]);
  assert.equal(run("campaign", "set", M, epic, "game=nope").code, 1);
  assert.equal(run("campaign", "set", M, epic, "colour=red").code, 1);
  assert.equal(run("campaign", "set", M, epic, "event=99").code, 1);
  assert.equal(run("campaign", "set", M, epic, "event=2027-03-01").code, 0);
  assert.equal(run("campaign", "set", M, "EPIC-999", "ask=x").code, 1);
});

test("campaign show prints brief, games, event and progress; suggest lists fits and festivals", t => {
  const { run } = seeded(t);
  const epic = run("campaign", "add", M, "Push", "--game", "bunny-bunker", "--ask", "a video").out.trim();
  const shown = run("campaign", "show", M, epic).out;
  assert.match(shown, /0\/0 done/);
  assert.match(shown, /games: bunny-bunker/);
  assert.match(shown, /ask: a video/);
  assert.equal(JSON.parse(run("campaign", "show", M, epic, "--json").out).brief.ask, "a video");

  const found = JSON.parse(run("campaign", "suggest", M, epic, "--json").out);
  assert.deepEqual(found.contacts.map(c => [c.id, c.reach, c.game, c.reason, c.lastAbout]), [[2, 9000, "bunny-bunker", "co-op", "2026-11-10"], [1, 5000, "bunny-bunker", "cozy", ""]]);
  assert.deepEqual(found.festivals.map(f => [f.name, f.games]), [["Steam Next Fest", ["bunny-bunker"]]]);
  assert.match(run("campaign", "suggest", M, epic).out, /2  Bit Blog  reach 9000  bunny-bunker: co-op  last about it 2026-11-10/);
  assert.equal(JSON.parse(run("campaign", "suggest", M, epic, "--limit", "1", "--json").out).contacts.length, 1);
  assert.equal(run("campaign", "suggest", M, epic, "--limit", "0").code, 1);
  run("campaign", "contacts", M, epic, "--limit", "1");
  assert.deepEqual(JSON.parse(run("campaign", "suggest", M, epic, "--json").out).contacts.map(c => c.id), [1], "the contact already on it is left out");
});

test("help lists the new campaign commands", t => {
  const { run } = seeded(t);
  const help = run("help").out;
  for (const w of ["doit campaign set", "doit campaign show", "doit campaign suggest", "--occasion"]) assert.ok(help.includes(w), w);
});
