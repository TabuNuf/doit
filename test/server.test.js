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

test("GET /api/version reports the commit the server started from", async t => {
  const s = setup(); t.after(s.cleanup);
  const server = new HttpServer(s.board, path.join(import.meta.dirname, "..", "web"), "abc123");
  const port = await server.listen(0);
  t.after(() => server.close());
  const r = await fetch(`http://127.0.0.1:${port}/api/version`);
  assert.deepEqual(await r.json(), { commit: "abc123" });
});

test("POST /api/epics/<project>/<id>/close closes an open epic and refuses a second call", async t => {
  const s = setup(); t.after(s.cleanup);
  const server = new HttpServer(s.board, path.join(import.meta.dirname, "..", "web"));
  const port = await server.listen(0);
  t.after(() => server.close());
  const post = p => fetch(`http://127.0.0.1:${port}${p}`, { method: "POST" }).then(async r => ({ status: r.status, body: await r.json() }));
  const first = await post("/api/epics/game/EPIC-014/close");
  assert.equal(first.status, 200);
  assert.equal(first.body.archivedTasks, 2);
  assert.ok(s.exists("Epics/Completed/EPIC-014-online-lobby.md"));
  const second = await post("/api/epics/game/EPIC-014/close");
  assert.equal(second.status, 400);
  assert.match(second.body.error, /No open epic/);
});

test("POST /api/epics/<project>/<id>/move parks and reopens an epic; an unknown target is a 400", async t => {
  const s = setup(); t.after(s.cleanup);
  const server = new HttpServer(s.board, path.join(import.meta.dirname, "..", "web"));
  const port = await server.listen(0);
  t.after(() => server.close());
  const move = (id, to) => fetch(`http://127.0.0.1:${port}/api/epics/game/${id}/move`, { method: "POST", body: JSON.stringify({ to }) }).then(async r => ({ status: r.status, body: await r.json() }));
  const view = () => fetch(`http://127.0.0.1:${port}/api/board?project=game`).then(r => r.json());
  assert.equal((await move("EPIC-016", "open")).status, 200);
  assert.ok((await view()).epics.some(e => e.id === "EPIC-016"));
  assert.equal((await move("EPIC-016", "parked")).body.moved, true);
  const v = await view();
  assert.ok(v.parkedEpics.some(e => e.id === "EPIC-016") && !v.epics.some(e => e.id === "EPIC-016"));
  assert.equal((await move("EPIC-016", "nowhere")).status, 400);
  const refused = await move("EPIC-014", "parked");
  assert.equal(refused.status, 400);
  assert.match(refused.body.error, /Planned/);
});
