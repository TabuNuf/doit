import test from "node:test";
import assert from "node:assert/strict";
import { setup, addProfiles } from "./helpers.js";
import { cliFor } from "./contactsCli.test.js";

const M = "polyspice-marketing";

// The clock stands at 2026-11-20.
function seeded(t) {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const run = cliFor(s);
  run("contact", "add", "Ada", "Plays", "--type", "influencer", "--reach", "5000");
  run("contact", "add", "Bit", "Blog", "--type", "press", "--reach", "9000");
  run("fit", "1", "bunny-bunker", "cozy");
  run("fit", "2", "bunny-bunker", "co-op");
  run("festival", "upsert", "Steam Next Fest", "--year", "2027", "--deadline", "2026-12-01", "--starts", "2027-02-01", "--genres", "co-op");
  return run;
}

test("campaign add prints the epic id and refuses an unknown game or event", t => {
  const run = seeded(t);
  const r = run("campaign", "add", M, "Next", "Fest", "--game", "bunny-bunker", "--event", "3");
  assert.match(r.out, /^EPIC-\d+\n$/);
  assert.match(run("epics", M).out, /Active .*Next Fest/);
  assert.equal(run("campaign", "add", M, "X", "--game", "nope").code, 1);
  assert.equal(run("campaign", "add", M, "X", "--game", "bunny-bunker", "--event", "99").code, 1);
  assert.equal(run("campaign", "add", M, "X").code, 1);
  assert.equal(run("campaign", "add", M, "Dated", "--game", "good-box", "--event", "2027-03-01").code, 0);
});

test("campaign contacts makes one task per contact, largest reach first, and respects --limit", t => {
  const run = seeded(t);
  const epic = run("campaign", "add", M, "Next Fest", "--game", "bunny-bunker").out.trim();
  const one = run("campaign", "contacts", M, epic, "--limit", "1");
  assert.match(one.out, new RegExp(`^${M}/T-\\d+\\.\\d+  2  Bit Blog\\n$`));
  const rest = run("campaign", "contacts", M, epic).out.trim().split("\n");
  assert.equal(rest.length, 1);
  assert.match(rest[0], /  1  Ada Plays$/);
  assert.equal(run("campaign", "contacts", M, epic).out, "No contacts to add.\n");
  assert.equal(run("campaign", "contacts", M, "EPIC-999").code, 1);
  assert.equal(run("campaign", "contacts", M, epic, "--limit", "0").code, 1);
  assert.match(run("show", one.out.split("  ")[0]).out, /contact: 2/);
});

test("outreach lists the three lists, and --json gives the plan", t => {
  const run = seeded(t);
  const epic = run("campaign", "add", M, "Next Fest", "--game", "bunny-bunker").out.trim();
  run("campaign", "contacts", M, epic, "--limit", "1");
  run("add", M, epic, "Write", "the", "pitch");
  const out = run("outreach").out;
  assert.match(out, /^Contacts \(1\)\n  2  Bit Blog  bunny-bunker  campaign/);
  assert.match(out, /Festival deadlines within 14 days \(1\)\n  3  Steam Next Fest 2027  deadline 2026-12-01 \(11 days left\)  bunny-bunker/);
  assert.match(out, /Campaign steps \(1\)\n  .*Write the pitch  bunny-bunker/);
  const plan = JSON.parse(run("outreach", "--json").out);
  assert.deepEqual(Object.keys(plan), ["contacts", "festivals", "steps"]);
  assert.equal(plan.steps[0].title, "Write the pitch");
});

test("--contact and contact= check the contact book", t => {
  const run = seeded(t);
  const epic = run("campaign", "add", M, "Next Fest", "--game", "bunny-bunker").out.trim();
  const added = run("add", M, epic, "Mail", "Ada", "--contact", "1");
  assert.equal(added.code, 0);
  const ref = added.out.trim().replace("Added ", "");
  assert.match(run("show", ref).out, /contact: 1/);
  assert.equal(run("add", M, epic, "Ghost", "--contact", "77").code, 1);
  assert.equal(run("set", ref, "contact=2").code, 0);
  assert.match(run("show", ref).out, /contact: 2/);
  const bad = run("set", ref, "contact=77");
  assert.equal(bad.code, 1);
  assert.match(bad.err, /^doit: /);
  assert.equal(run("set", ref, "contact=").code, 0);
  assert.doesNotMatch(run("show", ref).out, /contact:/);
});

test("completing a contact task through the CLI logs a touch; morning prints the outreach lines; help lists the commands", t => {
  const run = seeded(t);
  const epic = run("campaign", "add", M, "Next Fest", "--game", "bunny-bunker").out.trim();
  const ref = run("campaign", "contacts", M, epic, "--limit", "1").out.split("  ")[0];
  assert.match(run("morning").out, /Outreach contacts 1: .*Bit Blog/);
  run("set", ref, "state=done");
  assert.match(run("contact", "show", "2").out, /2026-11-20 mail bunny-bunker/);
  const help = run("help").out;
  for (const w of ["doit campaign add", "doit campaign contacts", "doit outreach", "--contact <id>", "blocks contact"]) assert.ok(help.includes(w), w);
});
