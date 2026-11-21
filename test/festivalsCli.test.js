import test from "node:test";
import assert from "node:assert/strict";
import { setup, addProfiles } from "./helpers.js";
import { cliFor } from "./contactsCli.test.js";

// The clock stands at 2026-11-20.
function seeded(t) {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const run = cliFor(s);
  run("festival", "upsert", "Steam Next Fest", "--year", "2027", "--deadline", "2026-12-01", "--where", "steam", "--cost", "free", "--genres", "co-op,rpg", "--stages", "demo,in development");
  run("festival", "upsert", "Puzzle Days", "--year", "2027", "--deadline", "2027-01-20", "--genres", "puzzle", "--platforms", "steam");
  run("festival", "upsert", "Open Showcase", "--year", "2027", "--deadline", "2026-11-25");
  run("festival", "upsert", "Old Fest", "--year", "2026", "--deadline", "2026-10-01");
  return run;
}

test("festival upsert twice gives one festival, and only the fields given change", t => {
  const s = setup(); t.after(s.cleanup);
  const run = cliFor(s);
  assert.equal(run("festival", "upsert", "Steam Next Fest", "--year", "2027", "--deadline", "2026-12-01", "--cost", "free", "--genres", "co-op").out, "Added festival 1: Steam Next Fest 2027\n");
  assert.equal(run("festival", "upsert", "steam next fest", "--year", "2027", "--where", "steam", "--stages", "demo", "--url", "https://store.example.test/fest").out, "Updated festival 1: Steam Next Fest 2027\n");
  const [f, ...none] = JSON.parse(run("festivals", "--json").out);
  assert.equal(none.length, 0);
  assert.deepEqual(f.event, {
    year: 2027, starts: "", ends: "", deadline: "2026-12-01", cost: "free", where: "steam",
    criteria: { genres: ["co-op"], stages: ["demo"], platforms: [] }, state: "watching",
  });
  assert.deepEqual(f.channels, [{ kind: "website", url: "https://store.example.test/fest" }]);
  run("festival", "upsert", "Steam Next Fest", "--year", "2027", "--url", "https://store.example.test/fest/");
  assert.equal(JSON.parse(run("festivals", "--json").out)[0].channels.length, 1);
  assert.match(run("festival", "upsert", "Steam Next Fest", "--year", "2028").out, /^Added festival 2/);
});

test("festivals lists by deadline with days left, past-state hidden", t => {
  const run = seeded(t);
  const out = run("festivals").out.trim().split("\n");
  assert.equal(out[0], "4  Old Fest 2026  deadline 2026-10-01 (past)  -  -  watching");
  assert.equal(out[1], "3  Open Showcase 2027  deadline 2026-11-25 (5 days left)  -  -  watching");
  assert.equal(out[2], "1  Steam Next Fest 2027  deadline 2026-12-01 (11 days left)  free  steam  watching");
  assert.equal(out.length, 4);
  run("festival", "set", "4", "state=past");
  assert.equal(run("festivals").out.trim().split("\n").length, 3);
  assert.match(run("festivals", "--state", "past").out, /^4  Old Fest/);
});

test("--fits keeps matches by deadline, marks unknown criteria and drops a passed deadline", t => {
  const run = seeded(t);
  // bunny-bunker: demo, co-op/cozy, Steam. Puzzle Days wants puzzle, so it does not fit.
  const out = run("festivals", "--fits", "bunny-bunker").out.trim().split("\n");
  assert.deepEqual(out, [
    "3  Open Showcase 2027  deadline 2026-11-25 (5 days left)  -  -  watching  criteria unknown",
    "1  Steam Next Fest 2027  deadline 2026-12-01 (11 days left)  free  steam  watching",
  ]);
  // good-box is released with no platforms: Next Fest wants a demo, Puzzle Days wants Steam.
  assert.equal(run("festivals", "--fits", "good-box").out.trim().split("\n").length, 1);
  assert.equal(run("festivals", "--fits", "nope").code, 1);
});

test("--deadline-within keeps the coming deadlines and leaves out the passed one", t => {
  const run = seeded(t);
  assert.deepEqual(run("festivals", "--deadline-within", "7").out.trim().split("\n").map(l => l.split("  ")[1]), ["Open Showcase 2027"]);
  assert.equal(run("festivals", "--deadline-within", "30").out.trim().split("\n").length, 2);
  assert.equal(run("festivals", "--deadline-within", "-1").code, 1);
  assert.equal(JSON.parse(run("festivals", "--deadline-within", "7", "--json").out)[0].daysLeft, 5);
});

test("festival set changes the state; refused values and missing arguments exit 1", t => {
  const run = seeded(t);
  assert.match(run("festival", "set", "1", "state=applied").out, /^1  Steam Next Fest 2027 .* applied\n$/);
  for (const [args, re] of [
    [["festival", "set", "1", "state=won"], /Unknown watching state/],
    [["festival", "set", "1", "cost=5"], /Usage: doit festival set/],
    [["festival", "set", "9", "state=past"], /No contact 9/],
    [["festival", "upsert", "X"], /Usage: doit festival upsert/],
    [["festival", "upsert", "X", "--year", "27"], /Year must be/],
    [["festival", "upsert", "X", "--year", "2027", "--where", "moon"], /Unknown where/],
    [["festival", "upsert", "X", "--year", "2027", "--type", "press"], /Only a festival/],
    [["festival", "frob"], /Usage/],
  ]) {
    const r = run(...args);
    assert.equal(r.code, 1, args.join(" "));
    assert.match(r.err, re);
  }
  run("contact", "add", "Ada", "--type", "influencer");
  assert.match(run("festival", "set", "5", "state=past").err, /not a festival/);
  assert.match(run("help").out, /doit festival upsert/);
});
