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

// A page holds /api/events open for as long as it is shown; neither script may be thrown by it.
test("check-server.sh and stop-server.sh work with an event stream open", async t => {
  const { spawn } = await import("node:child_process");
  const http = await import("node:http");
  const fs = await import("node:fs");
  const os = await import("node:os");
  const free = await new Promise(r => { const l = net.createServer().listen(0, () => { const p = l.address().port; l.close(() => r(p)); }); });
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "doit-launcher-"));
  const env = { ...process.env, DOIT_PORT: String(free), DOIT_HOME: home };
  const child = spawn("node", [path.join(ROOT, "bin", "server.js")], { env, stdio: "ignore" });
  t.after(() => { child.kill("SIGKILL"); fs.rmSync(home, { recursive: true, force: true }); });
  for (let i = 0; i < 40 && await check(free) === 1; i++) await new Promise(r => setTimeout(r, 100));
  const req = http.get({ port: free, path: "/api/events" });
  req.on("error", () => {});
  await new Promise(r => req.on("response", res => res.once("data", r)));
  assert.notEqual(await check(free), 1, "the server still answers beside the stream");
  const started = Date.now();
  await new Promise(r => execFile(path.join(ROOT, "launcher", "stop-server.sh"), { env }, r));
  assert.ok(Date.now() - started < 3000, "stop returns without waiting out the 5 s limit");
  assert.equal(await check(free), 1, "nothing answers after stop");
  req.destroy();
});

// osacompile's Assets.car and CFBundleIconName would win over applet.icns and hide the logo.
test("build.sh removes the applet's asset catalog and icon name", async () => {
  const fs = await import("node:fs");
  const text = fs.readFileSync(path.join(ROOT, "launcher", "build.sh"), "utf8");
  assert.match(text, /rm -f "\$out\/Contents\/Resources\/Assets\.car"/);
  assert.match(text, /Delete :CFBundleIconName/);
});
