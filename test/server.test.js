import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { HttpServer } from "../src/server/server.js";
import { setup } from "./helpers.js";

test("the API reads and changes tasks, and serves the page", async t => {
  const s = setup(); t.after(s.cleanup);
  const server = new HttpServer(s.board, path.join(import.meta.dirname, "..", "web"));
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = (p, init) => fetch(`http://127.0.0.1:${port}${p}`, init).then(async r => ({ status: r.status, body: await r.json() }));
  const send = (method, body) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const view = await api("/api/board?project=game");
  assert.equal(view.status, 200);
  assert.equal(view.body.tasks.length, 4);

  const patched = await api("/api/tasks/game/T-014.2", send("PATCH", { state: "progress" }));
  assert.equal(patched.body.state, "progress");
  const commented = await api("/api/tasks/game/T-014.2/comments", send("POST", { text: "From the page" }));
  assert.equal(commented.body.comments[0].who, "human");
  const moved = await api("/api/tasks/game/T-014.3/move", send("POST", { section: "backlog" }));
  assert.equal(moved.body.state, "backlog");
  for (const [id, status] of [["EPIC-014", "Active"], ["EPIC-016", "Planned"], ["EPIC-013", "Done"]]) {
    const doc = await api(`/api/epics/game/${id}`);
    assert.equal(doc.status, 200, id);
    assert.equal(doc.body.status, status);
    assert.match(doc.body.text, /^# EPIC-\d+/);
  }
  assert.equal((await api("/api/epics/game/EPIC-099")).status, 400);
  const bad = await api("/api/tasks/game/T-014.2", send("PATCH", { owner: "robot" }));
  assert.equal(bad.status, 400);
  assert.match(bad.body.error, /owner must be/);

  const page = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<title>Doit<\/title>/);
  assert.equal((await fetch(`http://127.0.0.1:${port}/../package.json`)).status, 404);
});
