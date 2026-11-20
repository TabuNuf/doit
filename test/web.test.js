// The page's files stay small and leave ranking to the server.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const WEB = path.join(import.meta.dirname, "..", "web");
const files = fs.readdirSync(WEB).filter(f => f.endsWith(".js"));

test("no web file is over 300 lines", () => {
  for (const f of files) {
    const lines = fs.readFileSync(path.join(WEB, f), "utf8").split("\n").length;
    assert.ok(lines <= 300, `${f} has ${lines} lines`);
  }
});

test("the page does no rank arithmetic", () => {
  for (const f of files) {
    const text = fs.readFileSync(path.join(WEB, f), "utf8");
    assert.doesNotMatch(text, /\brank\s*[-+*/]|[-+*/]\s*\w*\.?rank\b|between\s*\(/i, `${f} computes ranks`);
  }
});
