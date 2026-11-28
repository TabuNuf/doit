import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeCli } from "../src/root.js";
import { setup, addProfiles } from "./helpers.js";

function cliFor(s) {
  return (...args) => {
    let out = "", err = "";
    const code = makeCli({ home: s.home, now: () => s.clock.t, out: { write: x => { out += x; } }, err: { write: x => { err += x; } } }).run(args);
    return { code, out, err };
  };
}

/** Two contacts covering "Hades" and one covering "Celeste"; two profiles. */
function covered(s) {
  addProfiles(s);
  const run = cliFor(s);
  run("contact", "add", "Ada", "--type", "influencer", "--reach", "5000");
  run("contact", "add", "Bit", "--type", "press", "--reach", "300");
  const g = (id, title) => run("contact", "game", "add", id, title, "--scale", "indie", "--kind", "played", "--date", "2026-11-01", "--source", "https://v.test/" + id, "--genre", "roguelike");
  g("1", "Hades"); g("2", "Hades"); g("1", "Celeste");
  return run;
}

test("games lists, filters and prints json", t => {
  const s = setup(); t.after(s.cleanup);
  const run = covered(s);
  const all = run("games");
  assert.equal(all.code, 0);
  assert.match(all.out, /^Hades  roguelike  scale indie  rating -  reviews -  sales -  covered 2  -\nCeleste .*covered 1/);
  const w = run("game", "set", "Hades", "rating=93", "reviews=12k", "store=steam=https://s.test/h", "genres=roguelike,action", "stage=released", "keywords=fast");
  assert.equal(w.code, 0, w.err);
  assert.match(run("games").out, /^Hades  roguelike, action  scale indie  rating 93%  reviews 12K  sales ~360K  covered 2  steam/m);
  assert.match(run("games", "--rating", "90").out, /^Hades .*\n$/);
  assert.equal(run("games", "--rating", "95").out, "No games.\n");
  assert.match(run("games", "--covered", "2").out, /^Hades .*\n$/);
  assert.match(run("games", "--genre", "action").out, /^Hades/);
  assert.match(run("games", "--store", "steam").out, /^Hades/);
  assert.match(run("games", "--stage", "released").out, /^Hades/);
  assert.match(run("games", "--reviews", "100").out, /^Hades/);
  assert.match(run("games", "--scale", "indie").out, /Celeste/);
  assert.equal(run("games", "--no-facts").out.split("\n").filter(Boolean).length, 2);
  const json = JSON.parse(run("games", "--json").out);
  assert.equal(json[0].coverage.count, 2);
  run("game", "comp", "Hades", "good-box", "same pull");
  assert.match(run("games", "--comp", "good-box").out, /^Hades .*\n$/);
  assert.match(run("games", "--similar", "bunny-bunker").out, /No games|shared/);
  assert.equal(run("games", "--comp", "nope").code, 1);
});

test("game show, add, set with store and tracker links, and comp", t => {
  const s = setup(); t.after(s.cleanup);
  const run = covered(s);
  assert.equal(run("game", "add", "Tiny", "Tale").out, "Added game Tiny Tale\n");
  assert.match(run("game", "add", "tiny tale").err, /already has an entry/);
  const set = run("game", "set", "Tiny", "Tale", "store=steam=https://s.test/t", "store=gog=https://g.test/t", "tracker=gamalytic=https://gm.test/t", "developer=Ann", "sales=2k", "sales_source=gamalytic");
  assert.equal(set.code, 0, set.err);
  const e = JSON.parse(run("game", "show", "tiny tale", "--json").out);
  assert.deepEqual(e.stores, { steam: "https://s.test/t", gog: "https://g.test/t" });
  assert.deepEqual(e.trackers, { gamalytic: "https://gm.test/t" });
  assert.equal(e.sales, 2000);
  run("game", "set", "Tiny Tale", "store=gog=");
  assert.deepEqual(JSON.parse(run("game", "show", "Tiny Tale", "--json").out).stores, { steam: "https://s.test/t" });
  assert.match(run("game", "show", "Tiny Tale").out, /^Tiny Tale .*\ndeveloper Ann\n/);
  assert.match(run("game", "set", "Tiny Tale", "sales=5", "sales_source=").err, /sales_source/);
  assert.match(run("game", "set", "Tiny Tale", "bogus=1").err, /Unknown game field/);
  assert.match(run("game", "set", "Tiny Tale", "rating=1", "rating=2").err, /twice/);
  assert.equal(run("game", "set", "Tiny Tale").code, 1);
  assert.match(run("game", "show", "Nope").err, /No game/);
  assert.equal(run("game", "comp", "Tiny Tale", "good-box", "same", "audience").out, "Tiny Tale: 1 comp (good-box)\n");
  assert.equal(run("game", "comp", "Tiny Tale", "good-box", "--remove").out, "Tiny Tale: 0 comps\n");
  assert.match(run("game", "comp", "Tiny Tale", "good-box").err, /reason/);
  assert.match(run("game", "comp", "Tiny Tale", "nope", "why").err, /No profile/);
  assert.equal(run("game").code, 1);
  assert.match(run("help").out, /doit game comp <title> <game> <reason>/);
});

test("every command of Marketing-Claude.md, Research a batch of covered games, runs as written", t => {
  const s = setup(); t.after(s.cleanup);
  const run = covered(s);
  const doc = fs.readFileSync(path.join(import.meta.dirname, "..", "Docs", "Design", "Marketing-Claude.md"), "utf8");
  const section = doc.split("## Research a batch of covered games")[1].split("\n## ")[0];
  const cmds = [...section.matchAll(/`doit ([^`]+)`/g)].map(m => m[1]);
  assert.ok(cmds.length >= 8);
  const fill = c => c.replace(/<url>/g, "https://x.test/p").replace(/revenue=<usd>/, "revenue=50000");
  const sub = {
    "<usd>": "9.99", "<n>": "100", "<percent positive>": "90", "<tracker kind>": "gamalytic", "<copies>": "5000", "<median hours>": "12", "<today>": "2026-11-26",
    "<YYYY-MM-DD>": "2026-05-01", "<unreleased|demo|early-access|released>": "released", "<yes|no>": "yes", "<solo,indie,triple-i,aa,aaa>": "indie", "<followers>": "300", "<game>": "good-box",
  };
  let ran = 0;
  for (const raw of cmds) {
    let c = raw;
    if (!/^(games --no-facts|profiles|game (set|comp))/.test(c)) continue;
    c = fill(c).replace(/"<title>"/g, "Hades");
    for (const [k, v] of Object.entries(sub)) c = c.split(k).join(v);
    // Quoted placeholders become one argument each: <...> inside quotes is text.
    c = c.replace(/<[^>"]*>/g, "text").replace(/<[^>]*>/g, "text");
    const argv = [...c.matchAll(/"([^"]*)"|(\S+)/g)].map(m => m[1] ?? m[2]).map(a => a.replace(/^([A-Za-z_]+)="(.*)"$/, "$1=$2"));
    const r = run(...argv);
    assert.equal(r.code, 0, `${raw}\n=> ${argv.join(" | ")}\n${r.err}`);
    ran++;
  }
  assert.ok(ran >= 8, `ran ${ran}`);
  assert.equal(run("games", "--no-facts").out, "Celeste  roguelike  scale indie  rating -  reviews -  sales -  covered 1  -\n");
});
