// T-021.11: + Campaign in the page for any project with a kind, and Marketing empty states in plain text.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { makeServer, makeContacts } from "../src/root.js";
import { setup, addProfiles } from "./helpers.js";

async function serve(t) {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  s.board.addProject({ name: "Doit", path: path.join(s.root, "doit"), docs: "Docs" });
  s.board.setProjectKind("doit", "application");
  const server = makeServer({ home: s.home, now: () => s.clock.t });
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = (p, method = "GET", body) => fetch(`http://127.0.0.1:${port}${p}`, {
    method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  }).then(async r => ({ status: r.status, body: await r.json() }));
  return { s, api };
}

test("a campaign for an application is created from the page and listed under it", async t => {
  const { campaignForm, campaignRequest, campaignsFor, campaignsPane } = await import("../web/campaignsPane.js");
  const { s, api } = await serve(t);
  makeContacts({ home: s.home, now: () => s.clock.t }).upsertFestival("Steam Next Fest", 2027, { event: { deadline: "2026-12-01", where: "steam" } });
  const profiles = (await api("/api/profiles")).body;
  const events = (await api("/api/festivals")).body;
  const form = campaignForm(profiles, "doit", events);
  assert.match(form, /<input type="checkbox" name="mk-cp-game" value="doit" checked> Doit \(application\)/);
  assert.ok(!form.includes("bunny-bunker"), "a profile file with no project of its own is not a project to start a campaign in");
  assert.match(form, /Steam Next Fest 2027/);

  const req = campaignRequest({ project: "doit", name: "  Launch push ", event: String(events[0].id) });
  const made = await api(req.path, req.method, req.body);
  assert.equal(made.status, 200, "the campaign lives in the marketing project, its Game line names Doit");
  const epics = (await api("/api/board?project=all")).body.epics;
  const listed = campaignsFor(epics, "doit");
  assert.deepEqual(listed.map(e => [e.project, e.name, e.status, e.game]), [["polyspice-marketing", "Launch push", "Active", "doit"]]);
  assert.match(campaignsPane(listed), /Launch push/);

  assert.equal((await api("/api/campaigns", "POST", { project: "doit", name: " " })).status, 400);
  assert.equal((await api("/api/campaigns", "POST", { project: "game", name: "X" })).status, 400, "Game has no kind");
  assert.equal((await api("/api/campaigns", "POST", { project: "doit", name: "X", event: "99" })).status, 400);
});

test("the CLI starts a campaign for a project with a kind without --game", async t => {
  const { s } = await serve(t);
  const { cliFor } = await import("./contactsCli.test.js");
  const run = cliFor(s);
  assert.match(run("campaign", "add", "doit", "Launch").out, /^EPIC-\d+\n$/);
  assert.equal(run("campaign", "add", "game", "Nope").code, 1);
});

test("no empty state in Marketing shows a code span or a command, and each says what to do", async () => {
  const { profilePane, campaignsPane, campaignForm } = await import("../web/campaignsPane.js");
  const { festivalsPane, eventsInfoPane } = await import("../web/festivalsPane.js");
  const { draftsPane } = await import("../web/draftsPane.js");
  const { listPane } = await import("../web/marketingView.js");
  const { overviewPanes } = await import("../web/weekPane.js");
  const { eventPane } = await import("../web/eventDetail.js");
  const { detailPane } = await import("../web/contactDetail.js");
  const missing = { game: "doit", name: "Doit", kind: "application", missing: true, project: "doit" };
  const empties = [
    profilePane("", []), profilePane("", [missing]), profilePane("doit", [missing]),
    campaignsPane([]), campaignsPane([], campaignForm([], "", [])), campaignForm([], "", []),
    festivalsPane([], null), eventsInfoPane("Events", "", []), draftsPane([], null, ""),
    listPane([], null), listPane([], null, 0, null, true), eventPane(null), detailPane(null, [], false, "2026-11-21"),
    overviewPanes({ contacts: [], festivals: [], steps: [] }, null),
  ];
  for (const html of empties) assert.doesNotMatch(html, /<code|doit (profile|campaign|draft)|class="mono">doit/, html.slice(0, 120));
  assert.match(campaignsPane([]), /<button data-mk-newcamp>\+ Campaign<\/button>/);
  assert.match(profilePane("doit", [missing]), /<button data-mk-settings="doit">/);
});
