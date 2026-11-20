import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { HttpServer } from "../src/server/server.js";
import { makeDocs } from "../src/root.js";
import { checkDocPath } from "../src/domain/docs.js";
import { setup } from "./helpers.js";

/** A project with a few documents, the library and a running server. */
async function docsSetup(t) {
  const s = setup(); t.after(s.cleanup);
  const dir = path.join(s.game, "GameDocs");
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); };
  put("Design.md", "# Design\n\nText.\n");
  put("Specs/Net.md", "# Net\n");
  put("Specs/notes.txt", "not a document");
  put("Archive/Old.md", "# Old\n");
  put("Standard/Core.md", "# Core\n");
  put("Epics/Tasks/T-014.1.md", "# task\n");
  put(".hidden/x.md", "# hidden\n");
  const docs = makeDocs({ home: s.home, board: s.board });
  const server = new HttpServer(s.board, path.join(import.meta.dirname, "..", "web"), null, docs);
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = async (p, init) => { const r = await fetch(`http://127.0.0.1:${port}${p}`, init); return { status: r.status, body: await r.json() }; };
  const send = (method, body) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ...s, dir, docs, api, send, file: p => `/api/docs/file?project=game&path=${encodeURIComponent(p)}` };
}

test("a document is read through the library and the API", async t => {
  const s = await docsSetup(t);
  const doc = s.docs.read("game", "Design.md");
  assert.equal(doc.path, "Design.md");
  assert.equal(doc.text, "# Design\n\nText.\n");
  assert.equal(doc.lastChange, null);
  const r = await s.api(s.file("Specs/Net.md"));
  assert.equal(r.status, 200);
  assert.equal(r.body.text, "# Net\n");
  assert.equal((await s.api(s.file("Missing.md"))).status, 404);
});

test("paths outside the docs folder or not Markdown are refused", async t => {
  const s = await docsSetup(t);
  for (const bad of ["../x.md", "/etc/x.md", "a/../../x.md", ".git/x.md", "x.txt", "", "C:\\x.md", "a\\b.md", "Specs/.x.md"]) {
    assert.throws(() => checkDocPath(bad), undefined, bad);
    assert.equal((await s.api(s.file(bad))).status, 400, bad);
  }
  assert.equal(checkDocPath("Specs//Net.md"), "Specs/Net.md");
});

test("the tree leaves out Archive, Epics/Tasks, Standard and hidden folders, and folds Epics/Completed", async t => {
  const s = await docsSetup(t);
  const { status, body } = await s.api("/api/docs/tree?project=game");
  assert.equal(status, 200);
  assert.deepEqual(body.map(n => n.name), ["Epics", "Specs", "Design.md"]);
  const epics = body[0];
  assert.deepEqual(epics.children.map(n => n.name), ["Completed", "Parked", "EPIC-009-bugs.md", "EPIC-014-online-lobby.md"]);
  assert.equal(epics.children.find(n => n.name === "Completed").folded, true);
  assert.ok(!epics.children.some(n => n.name === "Tasks"));
  assert.deepEqual(body[1].children.map(n => n.path), ["Specs/Net.md"]);
});

test("lastChange reads author and date from git, and is null outside git", async t => {
  const s = await docsSetup(t);
  const git = (...a) => execFileSync("git", ["-c", "user.name=Tabu", "-c", "user.email=t@x", ...a], { cwd: s.game, stdio: "ignore" });
  git("init", "-q"); git("add", "GameDocs/Design.md"); git("commit", "-q", "-m", "x");
  const change = s.docs.read("game", "Design.md").lastChange;
  assert.equal(change.author, "Tabu");
  assert.match(change.date, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(s.docs.read("game", "Specs/Net.md").lastChange, null);
});
