// T-021.10: a project's settings (kind and marketing profile) from the page, written to its Profile.md.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeServer } from "../src/root.js";
import { setup } from "./helpers.js";

/** A server over a fixture "Box Trainer" project with a kind; its Profile.md is written by the test as `profile` when given. */
async function serve(t, { profile } = {}) {
  const s = setup(); t.after(s.cleanup);
  s.board.addProject({ name: "Box Trainer", path: path.join(s.root, "bt"), docs: "Docs" });
  const file = path.join(s.root, "bt", "Docs", "Marketing", "Profile.md");
  if (profile) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, profile); }
  const server = makeServer({ home: s.home, now: () => s.clock.t });
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = (p, method = "GET", body) => fetch(`http://127.0.0.1:${port}${p}`, {
    method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  }).then(async r => ({ status: r.status, body: await r.json() }));
  return { s, api, file };
}

test("Box Trainer's settings set the kind, genres and stage; they land in Marketing/Profile.md and show in the Marketing view", async t => {
  const { settingsPanes, kindRequest, profileRequest } = await import("../web/projectSettings.js");
  const { api, file } = await serve(t);

  const kind = kindRequest("box-trainer", "game");
  assert.equal((await api(kind.path, kind.method, kind.body)).status, 200);
  assert.ok(!fs.existsSync(file), "setting the kind alone writes no profile");
  const req = profileRequest("box-trainer", { genres: "puzzle, co-op", platforms: "Steam", stage: "demo", release: "2027-03-01", needs: "wishlists" });
  assert.deepEqual(req.body.genres, "puzzle, co-op");
  const saved = await api(req.path, req.method, req.body);
  assert.equal(saved.status, 200);

  const text = fs.readFileSync(file, "utf8");
  assert.match(text, /^# Box Trainer$/m);
  assert.match(text, /^Kind: game$/m);
  assert.match(text, /^Genres: puzzle, co-op$/m);
  assert.match(text, /^Stage: demo$/m);
  assert.match(text, /^Release: 2027-03-01$/m);

  const profiles = (await api("/api/profiles")).body;
  const p = profiles.find(x => x.game === "box-trainer");
  assert.deepEqual([p.genres, p.stage, p.missing], [["puzzle", "co-op"], "demo", undefined]);

  const html = settingsPanes({ id: "box-trainer", name: "Box Trainer", kind: "game" }, p, "Saved to Marketing/Profile.md.");
  assert.match(html, /<option value="game" selected>game/);
  assert.match(html, /id="ps-genres" value="puzzle, co-op"/);
  assert.match(html, /<option value="demo" selected>/);
  assert.match(html, /Saved to Marketing\/Profile.md/);
});

test("saving keeps the other content of an existing Profile.md and refuses a bad stage, date or a project with no kind", async t => {
  const { api, file } = await serve(t, { profile: "# Box Trainer\n\nKind: game\nGenres: old\nStage: released\n\n## Pitch\n\nA box, trained.\n" });
  assert.equal((await api("/api/projects/box-trainer/profile", "PUT", { stage: "demo", genres: ["a"] })).status, 400, "no kind yet");
  await api("/api/projects/box-trainer", "PATCH", { kind: "game" });
  assert.equal((await api("/api/projects/box-trainer/profile", "PUT", { stage: "demo", genres: "puzzle", release: "soon" })).status, 400);
  assert.equal((await api("/api/projects/box-trainer/profile", "PUT", { stage: "nope" })).status, 400);
  assert.equal((await api("/api/projects/box-trainer/profile", "PUT", { stage: "demo", genres: "puzzle", needs: "press" })).status, 200);
  const text = fs.readFileSync(file, "utf8");
  assert.match(text, /## Pitch\n\nA box, trained\./);
  assert.match(text, /^Genres: puzzle$/m);
  assert.doesNotMatch(text, /Genres: old/);
  assert.match(text, /^Needs: press$/m);
  assert.equal((await api("/api/projects/game/profile", "PUT", { stage: "demo" })).status, 400, "a project without a kind");
});

test("a project with no kind gets a plain note and no form; the gear sits beside the project name", async () => {
  const { profilePane, kindPane, gearButton } = await import("../web/projectSettings.js");
  assert.doesNotMatch(profilePane({ id: "g", name: "G" }, undefined), /<form/);
  assert.match(profilePane({ id: "g", name: "G" }, undefined), /Pick a kind/);
  assert.match(profilePane({ id: "g", name: "G", kind: "game" }, { missing: true }), /Saving creates it from the template/);
  assert.match(kindPane({ id: "g", name: "G" }), /has no kind, so Marketing does not list it/);
  assert.match(gearButton("doit", true), /data-settings="doit" aria-pressed="true"/);
});
