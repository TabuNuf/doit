// T-023.5: a project can be marked not marketed: it keeps its kind but leaves the Marketing lists.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { makeServer, makeCli } from "../src/root.js";
import { checkMarketed } from "../src/domain/rules.js";
import { setup, addProfiles } from "./helpers.js";

async function serve(t) {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  for (const name of ["Doit", "Pantry"]) { s.board.addProject({ name, path: path.join(s.root, name.toLowerCase()), docs: "Docs" }); s.board.setProjectKind(name.toLowerCase(), "application"); }
  const server = makeServer({ home: s.home, now: () => s.clock.t });
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = (p, method = "GET", body) => fetch(`http://127.0.0.1:${port}${p}`, {
    method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  }).then(async r => ({ status: r.status, body: await r.json() }));
  return { s, api };
}

test("marketed reads yes and no words and refuses the rest", () => {
  assert.deepEqual(["yes", "No", true, false, "off", "1"].map(checkMarketed), [true, false, true, false, false, true]);
  assert.throws(() => checkMarketed("maybe"), /Marketed must be yes or no/);
});

test("the domain marks Doit not marketed, keeps its kind, and marking it marketed again clears the flag", t => {
  const s = setup(); t.after(s.cleanup);
  s.board.setProjectKind("game", "application");
  assert.equal(s.board.setProjectMarketed("game", "no").marketed, false);
  assert.equal(s.board.projects()[0].kind, "application");
  assert.equal(s.board.setProjectMarketed("game", "yes").marketed, undefined);
  assert.throws(() => s.board.setProjectMarketed("nope", "no"), /No project nope/);
});

test("doit project set marketed=no leaves the profile list and the CLI says so", async t => {
  const { s, api } = await serve(t);
  const out = [];
  const io = { write: x => out.push(x) };
  await makeCli({ home: s.home, out: io, err: io }).run(["project", "set", "doit", "marketed=no"]);
  assert.match(out.join(""), /doit: not marketed/);
  const profiles = (await api("/api/profiles")).body;
  assert.ok(!profiles.some(p => p.game === "doit"), "Doit is not in the Marketing picker");
  assert.ok(profiles.some(p => p.game === "pantry"));
  assert.equal((await api("/api/board?project=all")).body.projects.find(p => p.id === "doit").kind, "application");
  await makeCli({ home: s.home, out: io, err: io }).run(["project", "set", "doit", "marketed=yes"]);
  assert.ok((await api("/api/profiles")).body.some(p => p.game === "doit"));
});

test("the Marketed switch in the page not-marketed Doit: out of the + Campaign list, kind still shown", async t => {
  const { settingsPanes, marketedRequest } = await import("../web/projectSettings.js");
  const { campaignForm } = await import("../web/campaignsPane.js");
  const { api } = await serve(t);
  const req = marketedRequest("doit", false);
  assert.equal((await api(req.path, req.method, req.body)).status, 200);
  assert.equal((await api("/api/projects/doit", "PATCH", { marketed: "maybe" })).status, 400);
  const board = (await api("/api/board?project=all")).body;
  const doit = board.projects.find(p => p.id === "doit");
  const profiles = (await api("/api/profiles")).body;
  assert.ok(!campaignForm(profiles, "", []).includes('value="doit"'));
  assert.match(campaignForm(profiles, "", []), /value="pantry"/);
  const html = settingsPanes(doit, undefined);
  assert.match(html, /id="ps-marketed" >/);
  assert.match(html, /<option value="application" selected>/);
  assert.match(html, /is not marketed, so it has no marketing profile/);
  assert.match(settingsPanes(board.projects.find(p => p.id === "pantry"), undefined), /id="ps-marketed" checked>/);
});
