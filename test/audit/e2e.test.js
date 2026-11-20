// Whole flow through the real entry points: the CLI as a process, and the server as a process.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { setup } from "../helpers.js";

const ROOT = path.join(import.meta.dirname, "..", "..");

test("CLI process and server process see the same files", async t => {
  const s = setup(new Date().toISOString()); t.after(s.cleanup);
  const env = { ...process.env, DOIT_HOME: s.home, DOIT_PORT: "0" };
  const doit = (...args) => execFileSync("node", [path.join(ROOT, "bin/doit.js"), ...args], { env, encoding: "utf8" });
  assert.match(doit("add", "game", "EPIC-014", "From the CLI", "--owner", "human"), /game\/T-014.4/);
  doit("comment", "game/T-014.4", "hello");

  const server = spawn("node", [path.join(ROOT, "bin/server.js")], { env: { ...env, DOIT_PORT: "47391" } });
  t.after(() => server.kill());
  await new Promise((resolve, reject) => {
    server.stdout.on("data", d => { if (String(d).includes("http://localhost")) resolve(); });
    server.on("exit", code => reject(new Error("server exited " + code)));
  });
  const view = await fetch("http://127.0.0.1:47391/api/board?project=game").then(r => r.json());
  const added = view.tasks.find(x => x.id === "T-014.4");
  assert.equal(added.comments[0].text, "hello");
  await fetch("http://127.0.0.1:47391/api/tasks/game/T-014.4", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: "done" }) });
  assert.match(doit("list", "--project", "game", "--state", "done"), /T-014.4  done/);
});
