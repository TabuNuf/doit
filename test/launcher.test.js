// launcher/check-server.sh: exit 0 on the checked-out commit, 3 on another, 1 when nothing answers.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import net from "node:net";
import { execFile, execFileSync } from "node:child_process";
import { HttpServer } from "../src/server/server.js";
import { setup } from "./helpers.js";

const ROOT = path.join(import.meta.dirname, "..");
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();

// Async: a sync spawn would block this process's own server.
const check = port => new Promise(resolve => {
  execFile(path.join(ROOT, "launcher", "check-server.sh"), { env: { ...process.env, DOIT_PORT: String(port) } }, err => resolve(err ? err.code : 0));
});

async function serverOn(t, commit) {
  const s = setup(); t.after(s.cleanup);
  const server = new HttpServer(s.board, path.join(ROOT, "web"), commit);
  const port = await server.listen(0);
  t.after(() => server.close());
  return port;
}

test("check-server.sh accepts a server on the checked-out commit", async t => {
  assert.equal(await check(await serverOn(t, head)), 0);
});

test("check-server.sh flags a server on another commit or none reported", async t => {
  assert.equal(await check(await serverOn(t, "0123456789abcdef")), 3);
  assert.equal(await check(await serverOn(t, null)), 3);
});

test("check-server.sh reports nothing answering", async () => {
  const free = await new Promise(r => { const l = net.createServer().listen(0, () => { const p = l.address().port; l.close(() => r(p)); }); });
  assert.equal(await check(free), 1);
});
