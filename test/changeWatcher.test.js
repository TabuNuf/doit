import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ChangeWatcher } from "../src/store/changeWatcher.js";
import { SettingsFile } from "../src/store/settings.js";
import { EpicWorktrees } from "../src/store/worktrees.js";
import { setup } from "./helpers.js";

const wait = ms => new Promise(r => setTimeout(r, ms));
const make = s => new ChangeWatcher(new SettingsFile(s.home), new EpicWorktrees(), s.home, { debounce: 60, rescan: 100000 });
const started = () => wait(150); // FSEvents needs a moment before it reports

test("three quick writes give one event", async t => {
  const s = setup(); t.after(s.cleanup);
  const w = make(s); t.after(() => w.close());
  let n = 0;
  w.subscribe(() => n++);
  await started();
  n = 0; // setup's own writes may still be reported
  const dir = path.join(s.game, "GameDocs", "Epics");
  for (let i = 0; i < 3; i++) fs.writeFileSync(path.join(dir, `note${i}.md`), "x");
  await wait(400);
  assert.equal(n, 1);
});

test("a project added after start is watched", async t => {
  const s = setup(); t.after(s.cleanup);
  const w = make(s); t.after(() => w.close());
  let n = 0;
  w.subscribe(() => n++);
  await started();
  const other = path.join(s.root, "other");
  fs.mkdirSync(path.join(other, "Docs", "Epics"), { recursive: true });
  s.board.addProject({ name: "Other", path: other, docs: "Docs" });
  await wait(400);
  const before = n;
  assert.ok(before >= 1);
  fs.writeFileSync(path.join(other, "Docs", "Epics", "x.md"), "x");
  await wait(400);
  assert.ok(n > before);
});

test("no event after close or unsubscribe, and a missing folder is skipped", async t => {
  const s = setup(); t.after(s.cleanup);
  s.board.addProject({ name: "Gone", path: path.join(s.root, "gone"), docs: "Docs" });
  const w = make(s);
  let n = 0;
  await started();
  const off = w.subscribe(() => n++);
  off();
  fs.writeFileSync(path.join(s.game, "GameDocs", "a.md"), "x");
  await wait(300);
  assert.equal(n, 0);
  w.subscribe(() => n++);
  w.close();
  fs.writeFileSync(path.join(s.game, "GameDocs", "b.md"), "x");
  await wait(300);
  assert.equal(n, 0);
});
