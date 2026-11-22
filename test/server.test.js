import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { HttpServer } from "../src/server/server.js";
import { ChangeWatcher } from "../src/store/changeWatcher.js";
import { SettingsFile } from "../src/store/settings.js";
import { EpicWorktrees } from "../src/store/worktrees.js";
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
  assert.equal(view.body.tasks.length, 3);

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

  const starred = await api("/api/projects/game", send("PATCH", { starred: true }));
  assert.equal(starred.body.starred, true);
  assert.equal((await api("/api/board?project=all")).body.projects[0].starred, true);
  assert.equal((await api("/api/projects/nope", send("PATCH", { starred: true }))).status, 400);
  assert.equal((await api("/api/projects/game", send("PATCH", { kind: "podcast" }))).body.kind, "podcast");
  assert.equal((await api("/api/board?project=all")).body.projects[0].kind, "podcast");
  assert.equal((await api("/api/projects/game", send("PATCH", { kind: "toaster" }))).status, 400);

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

test("POST /api/epics/<project>/<id>/move to completed closes an open epic; a second call moves nothing; the old close route is gone", async t => {
  const s = setup(); t.after(s.cleanup);
  const server = new HttpServer(s.board, path.join(import.meta.dirname, "..", "web"));
  const port = await server.listen(0);
  t.after(() => server.close());
  const post = (p, body) => fetch(`http://127.0.0.1:${port}${p}`, { method: "POST", body: JSON.stringify(body) }).then(async r => ({ status: r.status, body: await r.json() }));
  const first = await post("/api/epics/game/EPIC-014/move", { to: "completed" });
  assert.equal(first.status, 200);
  assert.equal(first.body.archivedTasks, 2);
  assert.ok(s.exists("Epics/Completed/EPIC-014-online-lobby.md"));
  const second = await post("/api/epics/game/EPIC-014/move", { to: "completed" });
  assert.equal(second.status, 200);
  assert.equal(second.body.moved, false);
  assert.notEqual((await post("/api/epics/game/EPIC-014/close", {})).status, 200);
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

test("GET /api/events sends changed on connect and after a task is written", async t => {
  const s = setup(); t.after(s.cleanup);
  const watcher = new ChangeWatcher(new SettingsFile(s.home), new EpicWorktrees(), s.home, { debounce: 60, rescan: 100000 });
  const server = new HttpServer(s.board, path.join(import.meta.dirname, "..", "web"), null, null, null, watcher);
  const port = await server.listen(0);
  t.after(() => server.close());
  const res = await fetch(`http://127.0.0.1:${port}/api/events`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/event-stream/);
  const reader = res.body.getReader();
  const next = async () => {
    const timeout = new Promise((_, no) => setTimeout(() => no(new Error("no event")), 3000).unref());
    return new TextDecoder().decode((await Promise.race([reader.read(), timeout])).value);
  };
  assert.equal(await next(), "data: changed\n\n");
  await new Promise(r => setTimeout(r, 200)); // let the watcher start and setup's writes settle
  s.board.update("game/T-014.2", { state: "progress" });
  assert.equal(await next(), "data: changed\n\n");
});

test("a write from another site or a foreign host name is refused", async t => {
  const { sameSite } = await import("../src/server/server.js");
  const req = (method, host, origin) => ({ method, headers: { host, ...(origin ? { origin } : {}) } });
  assert.equal(sameSite(req("POST", "localhost:4317", "http://localhost:4317")), true);
  assert.equal(sameSite(req("POST", "127.0.0.1:4317")), true);
  assert.equal(sameSite(req("GET", "localhost:4317", "https://evil.example.com")), true);
  assert.equal(sameSite(req("POST", "localhost:4317", "https://evil.example.com")), false);
  assert.equal(sameSite(req("DELETE", "localhost:4317", "null")), false);
  assert.equal(sameSite(req("GET", "evil.example.com:4317")), false);
});
