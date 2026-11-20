#!/usr/bin/env node
// Starts the board server on 127.0.0.1 (DOIT_PORT, default 4317).
import { execFileSync } from "node:child_process";
import { makeServer } from "../src/root.js";

const port = Number(process.env.DOIT_PORT) || 4317;
// The commit this code was started from, so the launcher can tell a stale server.
const repo = new URL("..", import.meta.url).pathname;
let commit = null;
try { commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(); } catch {}
const server = makeServer({ commit });
server.listen(port).then(() => console.log(`Doit: http://localhost:${port}`));
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => server.close().then(() => process.exit(0)));
