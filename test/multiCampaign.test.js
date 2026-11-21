// T-023.8: a campaign for several projects (here Bunny Bunker and Good Box): the Game line, the pick, the touches, the CLI and the page.
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { makeServer, makeContacts } from "../src/root.js";
import { setup, addProfiles } from "./helpers.js";
import { cliFor } from "./contactsCli.test.js";

test("a campaign for two games: the Game line lists both, Add contacts picks fits of either, a ticked reach-out logs one touch per game", t => {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const run = cliFor(s);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  const a = book.add({ name: "Ada", types: ["influencer"], reach: 900 });
  const b = book.add({ name: "Bit", types: ["blogger"], reach: 500 });
  const c = book.add({ name: "Cog", types: ["blogger"], reach: 800 });
  book.setFit(a.id, "bunny-bunker", "co-op");
  book.setFit(b.id, "good-box", "puzzles");

  const made = run("campaign", "add", "polyspice-marketing", "Joint push", "--game", "bunny-bunker, good-box,bunny-bunker");
  assert.equal(made.code, 0, made.err);
  const epic = made.out.trim();
  assert.match(fs.readFileSync(path.join(s.root, "marketing", "Docs", "Epics", `${epic}-joint-push.md`), "utf8"), /^Game: bunny-bunker, good-box$/m);
  const e = s.board.view({ project: "polyspice-marketing" }).epics.find(x => x.id === epic);
  assert.deepEqual(e.games, ["bunny-bunker", "good-box"]);
  assert.equal(run("campaign", "add", "polyspice-marketing", "X", "--game", "bunny-bunker,nope").code, 1);

  const added = run("campaign", "contacts", "polyspice-marketing", epic);
  assert.deepEqual(added.out.trim().split("\n").map(l => l.split("  ")[1]), [String(a.id), String(b.id)], "Cog fits neither");
  const ref = added.out.split("\n")[0].split("  ")[0];
  assert.equal(run("set", ref, "state=done").code, 0);
  const touches = makeContacts({ home: s.home, now: () => s.clock.t }).get(a.id).touches;
  assert.deepEqual(touches.map(x => x.game).sort(), ["bunny-bunker", "good-box"]);
  run("set", ref, "state=todo");
  run("set", ref, "state=done");
  assert.equal(makeContacts({ home: s.home, now: () => s.clock.t }).get(a.id).touches.length, 2, "a second tick logs nothing new");
  assert.ok(c);
});

test("the page starts a campaign for two projects and lists it under either pick", async t => {
  const { campaignForm, campaignRequest, campaignsFor, campaignRow } = await import("../web/campaignsPane.js");
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const server = makeServer({ home: s.home, now: () => s.clock.t });
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = (p, method = "GET", body) => fetch(`http://127.0.0.1:${port}${p}`, {
    method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  }).then(async r => ({ status: r.status, body: await r.json() }));

  const profiles = [{ game: "bunny-bunker", name: "Bunny Bunker", kind: "game", project: "bunny-bunker" }, { game: "good-box", name: "Good Box", kind: "game", project: "good-box" }];
  assert.equal((campaignForm(profiles, "good-box", []).match(/type="checkbox"/g) || []).length, 2);
  assert.match(campaignForm(profiles, "good-box", []), /value="good-box" checked/);
  const req = campaignRequest({ projects: ["bunny-bunker", "good-box"], name: "Joint", event: "" });
  assert.deepEqual(req.body.projects, ["bunny-bunker", "good-box"]);
  assert.equal((await api(req.path, req.method, req.body)).status, 200);
  assert.equal((await api("/api/campaigns", "POST", { projects: [], name: "X" })).status, 400);

  const epics = (await api("/api/board?project=all")).body.epics;
  for (const pick of ["bunny-bunker", "good-box"]) assert.deepEqual(campaignsFor(epics, pick).map(e => e.name), ["Joint"], pick);
  assert.deepEqual(campaignsFor(epics, "other"), []);
  const row = campaignRow(campaignsFor(epics, "")[0]);
  assert.match(row, /<span class="pill">bunny-bunker<\/span><span class="pill">good-box<\/span>/);
});
